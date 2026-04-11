import {
  DEFAULT_MAP_THEME_ID,
  DEFAULT_MAP_THEME_MODE,
  MAP_THEMES,
} from "../client/types/intermap-types";
import type { EventSortTime, EventTime, MapEvent, MapLocation, MapProject, TagCategory, TagValue } from "../client/types/intermap-types";

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

function normalizeEventTime(time: EventTime | undefined): EventTime | undefined {
  if (!time) return undefined;

  if (time.kind === "range") {
    const start = typeof time.start === "string" ? time.start.trim() : "";
    const end = typeof time.end === "string" ? time.end.trim() : "";
    return start && end ? { kind: "range", start, end } : undefined;
  }

  const value = typeof time.value === "string" ? time.value.trim() : "";
  return value ? { kind: "point", value } : undefined;
}

export function formatEventTime(time: EventTime | undefined): string | null {
  const normalized = normalizeEventTime(time);
  if (!normalized) return null;
  return normalized.kind === "range"
    ? `${normalized.start}~${normalized.end}`
    : normalized.value;
}

function normalizePositiveInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export function normalizeEventSortTime(sortTime: EventSortTime | undefined): EventSortTime | undefined {
  if (!sortTime) return undefined;

  const year = normalizePositiveInt(sortTime.year);
  const month = normalizePositiveInt(sortTime.month);
  const day = normalizePositiveInt(sortTime.day);
  const era = sortTime.era === "bce" ? "bce" : sortTime.era === "ce" ? "ce" : null;

  if (!era || !year || !month || !day) return undefined;
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > 31) return undefined;

  return { era, year, month, day };
}

function getSortableYear(sortTime: EventSortTime): number {
  return sortTime.era === "ce" ? sortTime.year : 1 - sortTime.year;
}

export function compareEventSortTime(a: EventSortTime | undefined, b: EventSortTime | undefined): number {
  const left = normalizeEventSortTime(a);
  const right = normalizeEventSortTime(b);

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const yearDiff = getSortableYear(left) - getSortableYear(right);
  if (yearDiff !== 0) return yearDiff;

  const monthDiff = left.month - right.month;
  if (monthDiff !== 0) return monthDiff;

  return left.day - right.day;
}

export function formatEventSortTime(sortTime: EventSortTime | undefined): string | null {
  const normalized = normalizeEventSortTime(sortTime);
  if (!normalized) return null;

  const eraLabel = normalized.era === "bce" ? "公元前" : "公元后";
  return `${eraLabel} ${normalized.year}年${normalized.month}月${normalized.day}日`;
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
    time: normalizeEventTime(eventItem.time),
    sortTime: normalizeEventSortTime(eventItem.sortTime),
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
  const normalizedMarkerScale = {
    location: Number.isFinite(map.markerScale?.location) ? Math.max(40, Math.min(260, map.markerScale!.location)) : 100,
    event: Number.isFinite(map.markerScale?.event) ? Math.max(40, Math.min(260, map.markerScale!.event)) : 100,
  };
  const validThemeIds = new Set(MAP_THEMES.map((theme) => theme.id));
  const themeId = validThemeIds.has(map.themeId) ? map.themeId : DEFAULT_MAP_THEME_ID;
  const themeMode = map.themeMode === "light" ? "light" : DEFAULT_MAP_THEME_MODE;

  return {
    ...map,
    themeId,
    themeMode,
    markerScale: normalizedMarkerScale,
    tagCategories,
    locations,
    eventTagCategories,
    events,
  };
}
