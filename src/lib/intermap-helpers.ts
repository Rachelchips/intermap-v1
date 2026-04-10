import type { MapEvent, MapLocation, MapProject, TagCategory, TagValue } from "../client/types/intermap-types";

export const NONE_TAG_VALUE_ID = "none";
export const EVENT_TYPE_CATEGORY_ID = "event_type";
export const EVENT_LOCATION_CATEGORY_ID = "event_location";
export const DEFAULT_EVENT_TYPE_VALUE_ID = "default_event";

function buildDefaultEventTypeCategory(previous?: TagCategory): TagCategory {
  const values = previous?.values?.length
    ? previous.values
    : [
        {
          id: DEFAULT_EVENT_TYPE_VALUE_ID,
          label: "事件",
          icon: { kind: "shape" as const, shape: "diamond" as const, color: "#C8A860" },
        },
      ];

  return {
    id: EVENT_TYPE_CATEGORY_ID,
    label: previous?.label ?? "事件类型",
    isLegend: previous?.isLegend ?? true,
    isBuiltIn: true,
    values,
  };
}

export function buildEventLocationCategory(
  locations: MapLocation[],
  previous?: TagCategory
): TagCategory {
  const previousValues = new Map((previous?.values ?? []).map((value) => [value.id, value]));

  const values: TagValue[] = [
    previousValues.get(NONE_TAG_VALUE_ID) ?? {
      id: NONE_TAG_VALUE_ID,
      label: "无归属",
      icon: { kind: "none" as const },
    },
    ...locations.map((location) => {
      const prev = previousValues.get(location.id);
      return {
        id: location.id,
        label: location.name,
        icon: prev?.icon ?? { kind: "none" as const },
      };
    }),
  ];

  return {
    id: EVENT_LOCATION_CATEGORY_ID,
    label: previous?.label ?? "归属地点",
    isLegend: previous?.isLegend ?? false,
    isBuiltIn: true,
    values,
  };
}

export function createDefaultEventTagCategories(locations: MapLocation[]): TagCategory[] {
  return [
    buildDefaultEventTypeCategory(),
    buildEventLocationCategory(locations),
  ];
}

function ensureSingleLegend(categories: TagCategory[]): TagCategory[] {
  if (categories.length === 0) return categories;
  const legendIndex = categories.findIndex((category) => category.isLegend);
  if (legendIndex === -1) {
    return categories.map((category, index) => ({
      ...category,
      isLegend: index === 0,
    }));
  }

  return categories.map((category, index) => ({
    ...category,
    isLegend: index === legendIndex,
  }));
}

function normalizeEntityTags(
  tags: Record<string, string> | undefined,
  categories: TagCategory[]
): Record<string, string> {
  const next: Record<string, string> = {};

  categories.forEach((category) => {
    const allowedIds = new Set(category.values.map((value) => value.id));
    const fallbackId = category.values[0]?.id ?? NONE_TAG_VALUE_ID;
    const current = tags?.[category.id];
    next[category.id] = current && allowedIds.has(current) ? current : fallbackId;
  });

  return next;
}

function normalizeLocations(locations: MapLocation[], tagCategories: TagCategory[]): MapLocation[] {
  return locations.map((location) => ({
    ...location,
    tags: normalizeEntityTags(location.tags, tagCategories),
  }));
}

function normalizeEvents(events: MapEvent[], eventTagCategories: TagCategory[]): MapEvent[] {
  return events.map((eventItem) => ({
    ...eventItem,
    tags: normalizeEntityTags(eventItem.tags, eventTagCategories),
  }));
}

export function normalizeMapProject(map: MapProject): MapProject {
  const tagCategories = ensureSingleLegend(Array.isArray(map.tagCategories) ? map.tagCategories : []);
  const locations = normalizeLocations(Array.isArray(map.locations) ? map.locations : [], tagCategories);

  const rawEventCategories = Array.isArray(map.eventTagCategories) && map.eventTagCategories.length > 0
    ? map.eventTagCategories
    : createDefaultEventTagCategories(locations);

  const previousEventType = rawEventCategories.find((category) => category.id === EVENT_TYPE_CATEGORY_ID);
  const previousEventLocation = rawEventCategories.find((category) => category.id === EVENT_LOCATION_CATEGORY_ID);

  const otherEventCategories = rawEventCategories.filter(
    (category) => category.id !== EVENT_TYPE_CATEGORY_ID && category.id !== EVENT_LOCATION_CATEGORY_ID
  );

  const eventTagCategories = ensureSingleLegend([
    buildDefaultEventTypeCategory(previousEventType),
    buildEventLocationCategory(locations, previousEventLocation),
    ...otherEventCategories,
  ]);

  const events = normalizeEvents(Array.isArray(map.events) ? map.events : [], eventTagCategories);

  return {
    ...map,
    tagCategories,
    locations,
    eventTagCategories,
    events,
  };
}
