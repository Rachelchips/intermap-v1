import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Filter, Flag, MapPin, Maximize2, Search, Tags, X, ZoomIn, ZoomOut } from "lucide-react";
import { MAP_THEMES } from "../types/intermap-types";
import { TagIconRenderer } from "../components/tag-icon-renderer";
import type {
  MapEvent,
  MapLocation,
  MapProject,
  MapTheme,
  MapViewState,
  TagCategory,
  TagIcon,
  TagValue,
} from "../types/intermap-types";
import { compareEventSortTime, EVENT_LOCATION_CATEGORY_ID, formatEventTime, NONE_TAG_VALUE_ID, normalizeEventSortTime } from "@/lib/intermap-helpers";

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

type TouchPoint = { clientX: number; clientY: number };
type EntityFilterMap = Record<string, Set<string>>;
type FilterTab = "locations" | "events";
type LegendPanelKey = "location" | "event";
type LegendPanelState = {
  position: { x: number; y: number } | null;
  collapsed: boolean;
};
type SortOrder = "default" | "time-asc" | "time-desc";
type EventDisplayMode = "expanded" | "collapsed";

type LocationDetailRoute = {
  kind: "location-detail";
  locationId: string;
  backTo: null | "location-manager";
};

type EventDetailRoute = {
  kind: "event-detail";
  eventId: string;
  backTo: null | "event-manager" | (LocationDetailRoute & { clearTemporaryFocus: boolean });
};

type PanelRoute =
  | null
  | { kind: "location-manager" }
  | { kind: "event-manager" }
  | LocationDetailRoute
  | EventDetailRoute;

interface LocationGroup {
  key: string;
  label: string;
  icon: TagIcon;
  items: MapLocation[];
}

interface ShareFilterState {
  locations: EntityFilterMap;
  events: EntityFilterMap;
}

function getTouchDist(t1: TouchPoint, t2: TouchPoint) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMid(t1: TouchPoint, t2: TouchPoint) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

function buildEntityFilter(categories: TagCategory[]): EntityFilterMap {
  const state: EntityFilterMap = {};
  categories.forEach((category) => {
    state[category.id] = new Set(category.values.map((value) => value.id));
  });
  return state;
}

function buildDefaultFilter(locationCategories: TagCategory[], eventCategories: TagCategory[]): ShareFilterState {
  return {
    locations: buildEntityFilter(locationCategories),
    events: buildEntityFilter(eventCategories),
  };
}

function getLegendCategory(categories: TagCategory[]): TagCategory | null {
  return categories.find((category) => category.isLegend) ?? null;
}

function getEventLocationId(eventItem: MapEvent): string | null {
  const value = eventItem.tags[EVENT_LOCATION_CATEGORY_ID];
  return value && value !== NONE_TAG_VALUE_ID ? value : null;
}

function matchesTagFilter(
  entity: { tags: Record<string, string> },
  categories: TagCategory[],
  filterMap: EntityFilterMap
) {
  return categories.every((category) => {
    const allowed = filterMap[category.id];
    if (allowed === undefined) return true;
    if (allowed.size === 0) return false;
    const tagValueId = entity.tags[category.id] ?? NONE_TAG_VALUE_ID;
    return allowed.has(tagValueId);
  });
}

function Marker({
  entity,
  legendCategory,
  isSelected,
  scalePercent = 100,
  onClick,
  onDoubleClick,
  badgeCount,
  baseZIndex = 10,
}: {
  entity: MapLocation | MapEvent;
  legendCategory: TagCategory | null;
  isSelected: boolean;
  scalePercent?: number;
  onClick: () => void;
  onDoubleClick?: () => void;
  badgeCount?: number;
  baseZIndex?: number;
}) {
  const tagValueId = legendCategory ? entity.tags[legendCategory.id] : undefined;
  const tagValue: TagValue | undefined = legendCategory?.values.find((value) => value.id === tagValueId);
  const icon = tagValue?.icon ?? { kind: "none" as const };
  const sizeFactor = Math.max(0.4, scalePercent / 100);
  const size = (isSelected ? 22 : 15) * sizeFactor;
  const isShape = icon.kind === "shape";
  const shapeIcon = isShape ? (icon as Extract<typeof icon, { kind: "shape" }>) : null;
  const shape = shapeIcon?.shape ?? "circle";
  const baseColor = shapeIcon?.color ?? "#4a3820";
  const opacityVal = shapeIcon?.opacity ?? 1;
  const customBorderColor = shapeIcon?.borderColor;
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const background = opacityVal < 1 ? hexToRgba(baseColor, opacityVal) : baseColor;
  const normalBorder = customBorderColor ?? background;
  const activeBorder = isSelected ? "#ffffff" : normalBorder;
  const glowColor = customBorderColor ?? baseColor;
  const borderRadius = shape === "square" ? 3 : shape === "diamond" ? 0 : size / 2;
  const transform = shape === "diamond" ? "translate(-50%, -50%) rotate(45deg)" : "translate(-50%, -50%)";

  return (
    <button
      style={{
        position: "absolute",
        left: `${entity.x}%`,
        top: `${100 - entity.y}%`,
        transform,
        width: size,
        height: size,
        borderRadius,
        backgroundColor: background,
        border: `${isSelected ? 2.5 : 1.5}px solid ${activeBorder}`,
        cursor: "pointer",
        boxShadow: isSelected
          ? `0 0 0 3px rgba(255,255,255,0.6), 0 0 12px ${glowColor}`
          : (customBorderColor
              ? `0 0 6px ${customBorderColor}88, 0 1px 4px rgba(0,0,0,0.7)`
              : "0 1px 5px rgba(0,0,0,0.8)"),
        zIndex: isSelected ? baseZIndex + 10 : baseZIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
        transition: "width 0.15s, height 0.15s",
        overflow: "visible",
      }}
      title={entity.name}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={onDoubleClick ? (e) => {
        e.stopPropagation();
        onDoubleClick();
      } : undefined}
      aria-label={entity.name}
    >
      {icon.kind === "emoji" && (
        <span style={{ fontSize: size * 0.65, lineHeight: 1 }}>{icon.emoji}</span>
      )}
      {typeof badgeCount === "number" && badgeCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -7,
            right: -10,
            minWidth: 16,
            height: 16,
            padding: "0 3px",
            borderRadius: 8,
            background: "#F4E4B8",
            color: "#2A1C0C",
            fontSize: 9,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
          }}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function managerChip(color: string, active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    border: `1px solid ${active ? color : `${color}66`}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : `${color}CC`,
    fontFamily: "Georgia, serif",
    transition: "all 0.15s",
  };
}

function ShareLocationManagerPanel({
  theme,
  locations,
  categories,
  onClose,
  onSelectLocation,
}: {
  theme: MapTheme;
  locations: MapLocation[];
  categories: TagCategory[];
  onClose: () => void;
  onSelectLocation: (location: MapLocation) => void;
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<Record<string, Set<string>>>({});
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [groupByTagId, setGroupByTagId] = useState("");

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = location.name.toLowerCase().includes(query);
        const nameEnMatch = (location.nameEn ?? "").toLowerCase().includes(query);
        if (!nameMatch && !nameEnMatch) return false;
      }

      for (const category of categories) {
        const allowed = tagFilter[category.id];
        if (!allowed || allowed.size === 0) continue;
        const tagValueId = location.tags[category.id] ?? NONE_TAG_VALUE_ID;
        if (!allowed.has(tagValueId)) return false;
      }

      return true;
    });
  }, [categories, locations, search, tagFilter]);

  const groupedLocations = useMemo<LocationGroup[]>(() => {
    if (!groupByTagId) {
      return [{ key: "all", label: "全部地点", icon: { kind: "none" }, items: filteredLocations }];
    }

    const category = categories.find((item) => item.id === groupByTagId);
    if (!category) {
      return [{ key: "all", label: "全部地点", icon: { kind: "none" }, items: filteredLocations }];
    }

    const itemsByValue = new Map<string, MapLocation[]>();
    filteredLocations.forEach((location) => {
      const valueId = location.tags[category.id] ?? "";
      const list = itemsByValue.get(valueId) ?? [];
      list.push(location);
      itemsByValue.set(valueId, list);
    });

    const groups = category.values
      .map((value) => ({
        key: value.id,
        label: value.label,
        icon: value.icon,
        items: itemsByValue.get(value.id) ?? [],
      }))
      .filter((group) => group.items.length > 0);

    const knownIds = new Set(category.values.map((value) => value.id));
    const uncategorized = filteredLocations.filter((location) => !knownIds.has(location.tags[category.id] ?? ""));
    if (uncategorized.length > 0) {
      groups.push({ key: "uncategorized", label: "未分类", icon: { kind: "none" }, items: uncategorized });
    }

    return groups;
  }, [categories, filteredLocations, groupByTagId]);

  const toggleTagFilter = (categoryId: string, valueId: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev[categoryId] ?? []);
      if (next.has(valueId)) next.delete(valueId);
      else next.add(valueId);
      return { ...prev, [categoryId]: next };
    });
  };

  const toggleCatCollapse = (categoryId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const legendCategory = categories.find((category) => category.isLegend);

  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 320, background: `${theme.bg}EE`, borderLeft: `1px solid ${theme.accent}`, display: "flex", flexDirection: "column", zIndex: 40, backdropFilter: "blur(8px)", fontFamily: "Georgia, serif", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${theme.accent}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <MapPin size={15} color={theme.primary} />
          <span style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, flex: 1 }}>地点管理</span>
          <span style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>{locations.length} 个地点</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 4, marginLeft: 2 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.accent}`, borderRadius: 6, padding: "5px 9px" }}>
          <Search size={12} color={theme.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索地点名称..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: theme.heading, fontSize: 13, fontFamily: "Georgia, serif" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 0 }}>
              <X size={11} />
            </button>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6 }}>按标签分类显示</div>
          <select
            value={groupByTagId}
            onChange={(e) => setGroupByTagId(e.target.value)}
            style={{ width: "100%", padding: "7px 9px", background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.accent}`, borderRadius: 6, color: theme.heading, fontSize: 12, fontFamily: "Georgia, serif", outline: "none" }}
          >
            <option value="">默认顺序</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </div>
      </div>

      {categories.length > 0 && (
        <div style={{ borderBottom: `1px solid ${theme.accent}`, flexShrink: 0, maxHeight: 220, overflowY: "auto" }}>
          {categories.map((category) => {
            const isCollapsed = collapsedCats.has(category.id);
            const activeCategoryFilter = tagFilter[category.id];
            const hasActiveFilter = activeCategoryFilter && activeCategoryFilter.size > 0;

            return (
              <div key={category.id}>
                <div onClick={() => toggleCatCollapse(category.id)} style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", borderBottom: `1px solid ${theme.accent}44` }}>
                  {isCollapsed ? <ChevronRight size={11} color={theme.muted} /> : <ChevronDown size={11} color={theme.muted} />}
                  <span style={{ fontSize: 11, color: hasActiveFilter ? theme.primary : theme.muted, flex: 1 }}>{category.label}</span>
                  {hasActiveFilter && (
                    <span style={{ fontSize: 9, background: `${theme.primary}33`, color: theme.primary, borderRadius: 10, padding: "1px 6px", border: `1px solid ${theme.primary}44` }}>
                      {activeCategoryFilter!.size}
                    </span>
                  )}
                  {hasActiveFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagFilter((prev) => ({ ...prev, [category.id]: new Set() }));
                      }}
                      style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: 9, padding: "0 2px" }}
                    >
                      清除
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div style={{ padding: "6px 14px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {category.values.map((value) => {
                      const isOn = activeCategoryFilter?.has(value.id) ?? false;
                      return (
                        <button key={value.id} onClick={() => toggleTagFilter(category.id, value.id)} style={{ padding: "3px 8px", borderRadius: 20, fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", border: `1px solid ${isOn ? theme.primary : "rgba(180,140,60,0.25)"}`, background: isOn ? `${theme.primary}22` : "transparent", color: isOn ? theme.primary : theme.muted, transition: "all 0.15s" }}>
                          <TagIconRenderer icon={value.icon} size={9} />
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredLocations.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: theme.muted, opacity: 0.6, fontSize: 13 }}>
            {locations.length === 0 ? "还没有地点" : "没有匹配的地点"}
          </div>
        ) : (
          groupedLocations.map((group) => (
            <div key={group.key}>
              {groupByTagId && (
                <div style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${theme.accent}44`, background: "rgba(255,255,255,0.04)", position: "sticky", top: 0, zIndex: 1 }}>
                  <TagIconRenderer icon={group.icon} size={10} />
                  <span style={{ fontSize: 11, color: theme.heading, flex: 1, opacity: 0.9 }}>{group.label}</span>
                  <span style={{ fontSize: 10, color: theme.muted }}>{group.items.length}</span>
                </div>
              )}

              {group.items.map((location) => {
                const tagValueId = legendCategory ? location.tags[legendCategory.id] : undefined;
                const tagValue = legendCategory?.values.find((value) => value.id === tagValueId);

                return (
                  <div key={location.id} onClick={() => onSelectLocation(location)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: `1px solid ${theme.accent}33`, transition: "background 0.1s" }}>
                    <div style={{ flexShrink: 0 }}>
                      {tagValue ? <TagIconRenderer icon={tagValue.icon} size={12} /> : <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(150,130,100,0.3)", border: "1px solid rgba(150,130,100,0.4)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: theme.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{location.name}</div>
                      {location.nameEn && (
                        <div style={{ fontSize: 10, color: theme.muted, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{location.nameEn}</div>
                      )}
                    </div>
                    <ChevronRight size={13} color={theme.muted} style={{ flexShrink: 0, opacity: 0.5 }} />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShareEventManagerPanel({
  theme,
  events,
  categories,
  onClose,
  onSelectEvent,
  displayMode,
  onDisplayModeChange,
}: {
  theme: MapTheme;
  events: MapEvent[];
  categories: TagCategory[];
  onClose: () => void;
  onSelectEvent: (eventItem: MapEvent) => void;
  displayMode: EventDisplayMode;
  onDisplayModeChange: (mode: EventDisplayMode) => void;
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<Record<string, Set<string>>>({});
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  const filteredEvents = useMemo(() => {
    const next = events
      .map((eventItem, index) => ({ eventItem, index }))
      .filter(({ eventItem }) => {
        if (search.trim()) {
          const query = search.trim().toLowerCase();
          const nameMatch = eventItem.name.toLowerCase().includes(query);
          const nameEnMatch = (eventItem.nameEn ?? "").toLowerCase().includes(query);
          if (!nameMatch && !nameEnMatch) return false;
        }

        for (const category of categories) {
          const allowed = tagFilter[category.id];
          if (!allowed || allowed.size === 0) continue;
          const tagValueId = eventItem.tags[category.id] ?? NONE_TAG_VALUE_ID;
          if (!allowed.has(tagValueId)) return false;
        }

        return true;
      });

    if (sortOrder !== "default") {
      next.sort((left, right) => {
        const leftSortTime = normalizeEventSortTime(left.eventItem.sortTime);
        const rightSortTime = normalizeEventSortTime(right.eventItem.sortTime);

        if (!leftSortTime && !rightSortTime) return left.index - right.index;
        if (!leftSortTime) return 1;
        if (!rightSortTime) return -1;

        const compareResult = compareEventSortTime(leftSortTime, rightSortTime);
        if (compareResult !== 0) return sortOrder === "time-desc" ? -compareResult : compareResult;
        return left.index - right.index;
      });
    }

    return next.map((item) => item.eventItem);
  }, [categories, events, search, sortOrder, tagFilter]);

  const toggleTagFilter = (categoryId: string, valueId: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev[categoryId] ?? []);
      if (next.has(valueId)) next.delete(valueId);
      else next.add(valueId);
      return { ...prev, [categoryId]: next };
    });
  };

  const toggleCatCollapse = (categoryId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const legendCategory = categories.find((category) => category.isLegend);

  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 320, background: `${theme.bg}EE`, borderLeft: `1px solid ${theme.accent}`, display: "flex", flexDirection: "column", zIndex: 40, backdropFilter: "blur(8px)", fontFamily: "Georgia, serif", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${theme.accent}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Flag size={15} color={theme.primary} />
          <span style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, flex: 1 }}>事件管理</span>
          <span style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>{events.length} 个事件</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 4, marginLeft: 2 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={() => onDisplayModeChange("expanded")} style={managerChip(theme.primary, displayMode === "expanded")}>
            事件展开显示
          </button>
          <button onClick={() => onDisplayModeChange("collapsed")} style={managerChip(theme.primary, displayMode === "collapsed")}>
            事件收缩显示
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.accent}`, borderRadius: 6, padding: "5px 9px" }}>
          <Search size={12} color={theme.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索事件名称..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: theme.heading, fontSize: 13, fontFamily: "Georgia, serif" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 0 }}>
              <X size={11} />
            </button>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6 }}>排序方式</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button onClick={() => setSortOrder("default")} style={managerChip(theme.primary, sortOrder === "default")}>默认顺序</button>
            <button onClick={() => setSortOrder("time-asc")} style={managerChip(theme.primary, sortOrder === "time-asc")}>时间升序</button>
            <button onClick={() => setSortOrder("time-desc")} style={managerChip(theme.primary, sortOrder === "time-desc")}>时间降序</button>
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <div style={{ borderBottom: `1px solid ${theme.accent}`, flexShrink: 0, maxHeight: 220, overflowY: "auto" }}>
          {categories.map((category) => {
            const isCollapsed = collapsedCats.has(category.id);
            const activeCategoryFilter = tagFilter[category.id];
            const hasActiveFilter = activeCategoryFilter && activeCategoryFilter.size > 0;

            return (
              <div key={category.id}>
                <div onClick={() => toggleCatCollapse(category.id)} style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", borderBottom: `1px solid ${theme.accent}44` }}>
                  {isCollapsed ? <ChevronRight size={11} color={theme.muted} /> : <ChevronDown size={11} color={theme.muted} />}
                  <span style={{ fontSize: 11, color: hasActiveFilter ? theme.primary : theme.muted, flex: 1 }}>{category.label}</span>
                  {hasActiveFilter && (
                    <span style={{ fontSize: 9, background: `${theme.primary}33`, color: theme.primary, borderRadius: 10, padding: "1px 6px", border: `1px solid ${theme.primary}44` }}>
                      {activeCategoryFilter!.size}
                    </span>
                  )}
                  {hasActiveFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagFilter((prev) => ({ ...prev, [category.id]: new Set() }));
                      }}
                      style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: 9, padding: "0 2px" }}
                    >
                      清除
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div style={{ padding: "6px 14px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {category.values.map((value) => {
                      const isOn = activeCategoryFilter?.has(value.id) ?? false;
                      return (
                        <button key={value.id} onClick={() => toggleTagFilter(category.id, value.id)} style={{ padding: "3px 8px", borderRadius: 20, fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", border: `1px solid ${isOn ? theme.primary : "rgba(180,140,60,0.25)"}`, background: isOn ? `${theme.primary}22` : "transparent", color: isOn ? theme.primary : theme.muted, transition: "all 0.15s" }}>
                          <TagIconRenderer icon={value.icon} size={9} />
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: theme.muted, opacity: 0.6, fontSize: 13 }}>
            {events.length === 0 ? "还没有事件" : "没有匹配的事件"}
          </div>
        ) : (
          filteredEvents.map((eventItem) => {
            const tagValueId = legendCategory ? eventItem.tags[legendCategory.id] : undefined;
            const tagValue = legendCategory?.values.find((value) => value.id === tagValueId);
            const timeLabel = formatEventTime(eventItem.time);

            return (
              <div key={eventItem.id} onClick={() => onSelectEvent(eventItem)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: `1px solid ${theme.accent}33`, transition: "background 0.1s" }}>
                <div style={{ flexShrink: 0 }}>
                  {tagValue ? <TagIconRenderer icon={tagValue.icon} size={12} /> : <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(150,130,100,0.3)", border: "1px solid rgba(150,130,100,0.4)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: theme.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eventItem.name}</div>
                  {timeLabel && <div style={{ fontSize: 10, color: theme.muted, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeLabel}</div>}
                  {eventItem.nameEn && <div style={{ fontSize: 10, color: theme.muted, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eventItem.nameEn}</div>}
                </div>
                <ChevronRight size={13} color={theme.muted} style={{ flexShrink: 0, opacity: 0.5 }} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
function LegendCard({
  title,
  category,
  theme,
  collapsed,
  onToggleCollapse,
  onMouseDown,
  legendRef,
}: {
  title: string;
  category: TagCategory;
  theme: MapTheme;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  legendRef: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={legendRef}
      style={{
        background: `${theme.bg}EE`,
        border: `1px solid ${theme.accent}`,
        borderRadius: 8,
        fontSize: 11,
        color: theme.muted,
        maxWidth: 180,
        boxShadow: "0 8px 18px rgba(0,0,0,0.28)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: collapsed ? "8px 10px" : "8px 12px 6px",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "bold", color: theme.heading, fontSize: 12, whiteSpace: "nowrap" }}>
            {title}
          </div>
        </div>
        <button
          type="button"
          data-legend-toggle="true"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            border: `1px solid ${theme.accent}`,
            background: `${theme.primary}14`,
            color: theme.primary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            flexShrink: 0,
          }}
          aria-label={collapsed ? `展开${title}` : `折叠${title}`}
          title={collapsed ? "展开图例" : "折叠图例"}
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ color: theme.muted, fontSize: 10, marginBottom: 6 }}>
            {category.label}
          </div>
          {category.values.map((value) => (
            <div key={value.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <TagIconRenderer icon={value.icon} size={10} />
              <span style={{ color: theme.heading, opacity: 0.8 }}>{value.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadOnlyDetailPanel({
  entity,
  categories,
  theme,
  onClose,
  headerMeta,
  extraSection,
}: {
  entity: MapLocation | MapEvent;
  categories: TagCategory[];
  theme: MapTheme;
  onClose: () => void;
  headerMeta?: string | null;
  extraSection?: React.ReactNode;
}) {
  const divider = (
    <div style={{ height: 1, background: theme.accent, margin: "0 -16px", opacity: 0.5, flexShrink: 0 }} />
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        background: `${theme.bg}EE`,
        borderLeft: `1px solid ${theme.accent}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        backdropFilter: "blur(8px)",
        overflow: "hidden",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ padding: "14px 16px 12px", flexShrink: 0, paddingRight: 36 }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            color: theme.muted,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {headerMeta && (
          <>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8, fontStyle: "normal", letterSpacing: "0.02em" }}>
              {headerMeta}
            </div>
            <div style={{ height: 1, background: theme.accent, margin: "0 -16px 10px", opacity: 0.5 }} />
          </>
        )}

        <div style={{ fontSize: 17, fontWeight: "bold", color: theme.heading, marginBottom: 2 }}>
          {entity.name}
        </div>
        {entity.nameEn && (
          <div style={{ fontSize: 12, fontStyle: "italic", color: theme.muted, marginBottom: 10 }}>
            {entity.nameEn}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {categories.map((category) => {
            const value = category.values.find((item) => item.id === entity.tags[category.id]);
            if (!value || value.id === NONE_TAG_VALUE_ID) return null;
            return (
              <div
                key={category.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: category.isLegend ? `${theme.primary}18` : "rgba(255,255,255,0.05)",
                  borderRadius: 20,
                  padding: "2px 8px",
                  border: `1px solid ${category.isLegend ? `${theme.primary}44` : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <TagIconRenderer icon={value.icon} size={10} />
                <span style={{ fontSize: 11, color: category.isLegend ? theme.primary : theme.muted }}>
                  {value.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {entity.imageUrl && (
        <div style={{ flexShrink: 0, overflow: "hidden", maxHeight: 220, background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={entity.imageUrl}
            alt={entity.name}
            style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "contain", display: "block" }}
          />
        </div>
      )}

      {divider}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {entity.description ? (
          <p
            style={{
              fontSize: 14,
              color: theme.heading,
              opacity: 0.9,
              lineHeight: 1.9,
              margin: 0,
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif',
              letterSpacing: "0.03em",
            }}
          >
            {entity.description}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: theme.muted, opacity: 0.45, margin: 0, fontStyle: "italic" }}>
            暂无简介
          </p>
        )}
      </div>

      {divider}

      <div style={{ padding: "10px 16px 12px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5 }}>
          坐标: X={entity.x.toFixed(1)}% · Y={entity.y.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function ReadOnlyLocationDetailPanel({
  location,
  categories,
  theme,
  onClose,
  relatedEvents,
  eventLegendCategory,
  onSelectEvent,
}: {
  location: MapLocation;
  categories: TagCategory[];
  theme: MapTheme;
  onClose: () => void;
  relatedEvents: MapEvent[];
  eventLegendCategory: TagCategory | null;
  onSelectEvent: (eventItem: MapEvent) => void;
}) {
  const divider = (
    <div style={{ height: 1, background: theme.accent, margin: "0 -16px", opacity: 0.5, flexShrink: 0 }} />
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        background: `${theme.bg}EE`,
        borderLeft: `1px solid ${theme.accent}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        backdropFilter: "blur(8px)",
        overflow: "hidden",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ padding: "14px 16px 12px", flexShrink: 0, paddingRight: 36 }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            color: theme.muted,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ fontSize: 17, fontWeight: "bold", color: theme.heading, marginBottom: 2 }}>
          {location.name}
        </div>
        {location.nameEn && (
          <div style={{ fontSize: 12, fontStyle: "italic", color: theme.muted, marginBottom: 10 }}>
            {location.nameEn}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {categories.map((category) => {
            const value = category.values.find((item) => item.id === location.tags[category.id]);
            if (!value || value.id === NONE_TAG_VALUE_ID) return null;
            return (
              <div
                key={category.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: category.isLegend ? `${theme.primary}18` : "rgba(255,255,255,0.05)",
                  borderRadius: 20,
                  padding: "2px 8px",
                  border: `1px solid ${category.isLegend ? `${theme.primary}44` : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <TagIconRenderer icon={value.icon} size={10} />
                <span style={{ fontSize: 11, color: category.isLegend ? theme.primary : theme.muted }}>
                  {value.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {location.imageUrl && (
        <div style={{ flexShrink: 0, overflow: "hidden", maxHeight: 220, background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={location.imageUrl}
            alt={location.name}
            style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "contain", display: "block" }}
          />
        </div>
      )}

      {divider}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {location.description ? (
          <p
            style={{
              fontSize: 14,
              color: theme.heading,
              opacity: 0.9,
              lineHeight: 1.9,
              margin: 0,
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif',
              letterSpacing: "0.03em",
            }}
          >
            {location.description}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: theme.muted, opacity: 0.45, margin: 0, fontStyle: "italic" }}>
            暂无简介
          </p>
        )}
      </div>

      {divider}

      <div style={{ padding: "10px 16px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5 }}>
          坐标: X={location.x.toFixed(1)}% · Y={location.y.toFixed(1)}%
        </span>
      </div>

      {divider}

      <div style={{ padding: "10px 16px 12px", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5, marginBottom: 8 }}>所属事件</div>
        {relatedEvents.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {relatedEvents.map((eventItem) => (
              <button
                key={eventItem.id}
                onClick={() => onSelectEvent(eventItem)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${theme.primary}44`,
                  background: `${theme.primary}14`,
                  color: theme.heading,
                  cursor: "pointer",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <TagIconRenderer
                  icon={(eventLegendCategory?.values.find((value) => value.id === eventItem.tags[eventLegendCategory.id])?.icon) ?? { kind: "none" }}
                  size={10}
                />
                {eventItem.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: theme.muted, opacity: 0.6 }}>暂无所属事件</div>
        )}
      </div>
    </div>
  );
}

function ShareTagManagerPanel({
  theme,
  locationCategories,
  eventCategories,
  activeTab,
  onTabChange,
  onClose,
  onSetLocationLegend,
  onSetEventLegend,
}: {
  theme: MapTheme;
  locationCategories: TagCategory[];
  eventCategories: TagCategory[];
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  onClose: () => void;
  onSetLocationLegend: (categoryId: string) => void;
  onSetEventLegend: (categoryId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const currentCategories = activeTab === "locations" ? locationCategories : eventCategories;

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      [...locationCategories, ...eventCategories].forEach((category) => {
        if (next[category.id] === undefined) next[category.id] = true;
      });
      return next;
    });
  }, [eventCategories, locationCategories]);

  const setLegend = activeTab === "locations" ? onSetLocationLegend : onSetEventLegend;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: `${theme.bg}EE`,
        borderLeft: `1px solid ${theme.accent}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        backdropFilter: "blur(8px)",
        fontFamily: "Georgia, serif",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${theme.accent}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Tags size={15} color={theme.primary} />
          <span style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, flex: 1 }}>标签管理</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 4, marginLeft: 2 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={() => onTabChange("locations")} style={tabStyle(activeTab === "locations", theme.primary, theme.muted, theme.accent)}>
            地点
          </button>
          <button onClick={() => onTabChange("events")} style={tabStyle(activeTab === "events", theme.primary, theme.muted, theme.accent)}>
            事件
          </button>
        </div>
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.82 }}>
          可查看全部标签，并切换当前图例；新增、编辑、删除在分享预览中不可用。
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {currentCategories.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: theme.muted, opacity: 0.6, fontSize: 13 }}>
            暂无标签分类
          </div>
        ) : (
          currentCategories.map((category) => {
            const isExpanded = expanded[category.id] ?? true;
            return (
              <div key={category.id} style={{ borderBottom: `1px solid ${theme.accent}33` }}>
                <div
                  onClick={() => setExpanded((prev) => ({ ...prev, [category.id]: !isExpanded }))}
                  style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                >
                  <ChevronRight size={12} color={theme.muted} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                  <span style={{ flex: 1, fontSize: 12, color: theme.heading, fontWeight: "bold" }}>{category.label}</span>
                  {category.isLegend ? (
                    <span style={{ fontSize: 9, color: theme.primary, background: `${theme.primary}22`, borderRadius: 4, padding: "1px 5px", border: `1px solid ${theme.primary}44` }}>
                      当前图例
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLegend(category.id);
                      }}
                      style={{
                        fontSize: 10,
                        color: theme.primary,
                        background: `${theme.primary}14`,
                        border: `1px solid ${theme.primary}44`,
                        borderRadius: 999,
                        padding: "3px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Check size={10} />
                      设为图例
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 14px 10px 32px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {category.values.map((value) => (
                      <div key={value.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <TagIconRenderer icon={value.icon} size={11} />
                        <span style={{ color: theme.heading, fontSize: 12, opacity: 0.88 }}>{value.label}</span>
                      </div>
                    ))}
                    {category.values.length === 0 && (
                      <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>暂无标签值</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function tabStyle(active: boolean, themeColor: string, themeMuted: string, borderColor: string): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 999,
    padding: "4px 10px",
    border: `1px solid ${active ? `${themeColor}88` : borderColor}`,
    background: active ? `${themeColor}18` : "transparent",
    color: active ? themeColor : themeMuted,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Georgia, serif",
  };
}

function ShareFilterPanel({
  locationCategories,
  eventCategories,
  filter,
  onFilterChange,
  theme,
  visibleLocationCount,
  totalLocationCount,
  visibleEventCount,
  totalEventCount,
}: {
  locationCategories: TagCategory[];
  eventCategories: TagCategory[];
  filter: ShareFilterState;
  onFilterChange: (next: ShareFilterState) => void;
  theme: MapTheme;
  visibleLocationCount: number;
  totalLocationCount: number;
  visibleEventCount: number;
  totalEventCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("locations");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const currentCategories = activeTab === "locations" ? locationCategories : eventCategories;
  const currentFilter = activeTab === "locations" ? filter.locations : filter.events;
  const currentVisibleCount = activeTab === "locations" ? visibleLocationCount : visibleEventCount;
  const currentTotalCount = activeTab === "locations" ? totalLocationCount : totalEventCount;

  useEffect(() => {
    const next: Record<string, boolean> = {};
    [...locationCategories, ...eventCategories].forEach((category) => {
      next[category.id] = true;
    });
    setExpanded(next);
  }, [locationCategories.length, eventCategories.length]);

  const updateCurrentFilter = useCallback((nextEntityFilter: EntityFilterMap) => {
    if (activeTab === "locations") {
      onFilterChange({ ...filter, locations: nextEntityFilter });
      return;
    }

    onFilterChange({ ...filter, events: nextEntityFilter });
  }, [activeTab, filter, onFilterChange]);

  const toggle = useCallback((categoryId: string, valueId: string) => {
    const prev = currentFilter[categoryId] ?? new Set<string>();
    const next = new Set(prev);
    if (next.has(valueId)) next.delete(valueId);
    else next.add(valueId);
    updateCurrentFilter({ ...currentFilter, [categoryId]: next });
  }, [currentFilter, updateCurrentFilter]);

  const toggleAll = useCallback((category: TagCategory) => {
    const allIds = category.values.map((value) => value.id);
    const current = currentFilter[category.id] ?? new Set<string>();
    const allOn = allIds.every((id) => current.has(id));
    updateCurrentFilter({
      ...currentFilter,
      [category.id]: allOn ? new Set<string>() : new Set(allIds),
    });
  }, [currentFilter, updateCurrentFilter]);

  const resetCurrent = useCallback(() => {
    updateCurrentFilter(buildEntityFilter(currentCategories));
  }, [currentCategories, updateCurrentFilter]);

  const isFiltered = currentCategories.some((category) => {
    const allowed = currentFilter[category.id];
    if (!allowed) return false;
    return !category.values.every((value) => allowed.has(value.id));
  });

  return (
    <>
      {open && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 44, background: "rgba(0,0,0,0.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: 280,
          zIndex: 45,
          transform: open ? "translateX(0)" : "translateX(-280px)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: `${theme.bg}FA`,
          borderRight: `1px solid ${theme.accent}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            padding: "12px 16px 10px",
            borderBottom: `1px solid ${theme.accent}44`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Filter size={14} color={theme.primary} />
          <span style={{ color: theme.heading, fontWeight: "bold", fontSize: 14, flex: 1 }}>
            {activeTab === "locations" ? "地点筛选" : "事件筛选"}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "10px 16px 8px",
            borderBottom: `1px solid ${theme.accent}22`,
            display: "flex",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button onClick={() => setActiveTab("locations")} style={tabStyle(activeTab === "locations", theme.primary, theme.muted, theme.accent)}>
            地点
          </button>
          <button onClick={() => setActiveTab("events")} style={tabStyle(activeTab === "events", theme.primary, theme.muted, theme.accent)}>
            事件
          </button>
        </div>

        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${theme.accent}22`, flexShrink: 0 }}>
          <button
            onClick={resetCurrent}
            style={{
              fontSize: 11,
              color: theme.muted,
              background: "none",
              border: `1px solid ${theme.accent}66`,
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            重置当前筛选
          </button>
        </div>

        {currentCategories.length === 0 ? (
          <div style={{ padding: "14px 16px", fontSize: 12, color: theme.muted }}>暂无可筛选标签</div>
        ) : (
          currentCategories.map((category) => {
            const categoryFilter = currentFilter[category.id] ?? new Set<string>();
            const allOn = category.values.every((value) => categoryFilter.has(value.id));
            const isExpanded = expanded[category.id] ?? true;

            return (
              <div key={category.id} style={{ borderBottom: `1px solid ${theme.accent}22`, flexShrink: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "center", padding: "9px 16px", cursor: "pointer", gap: 6 }}
                  onClick={() => setExpanded((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                >
                  <ChevronRight
                    size={12}
                    color={theme.muted}
                    style={{
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: theme.heading, fontSize: 12, fontWeight: "bold", flex: 1, opacity: 0.9 }}>
                    {category.label}
                  </span>
                  {category.isLegend && (
                    <span
                      style={{
                        fontSize: 9,
                        color: theme.primary,
                        background: `${theme.primary}22`,
                        borderRadius: 3,
                        padding: "0 4px",
                      }}
                    >
                      图例
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAll(category);
                    }}
                    style={{
                      fontSize: 10,
                      color: theme.muted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      padding: 0,
                    }}
                  >
                    {allOn ? <EyeOff size={10} /> : <Eye size={10} />}
                    {allOn ? "全隐" : "全显"}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ paddingBottom: 6 }}>
                    {category.values.map((value) => {
                      const checked = categoryFilter.has(value.id);
                      return (
                        <div
                          key={value.id}
                          onClick={() => toggle(category.id, value.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 16px 4px 28px",
                            cursor: "pointer",
                            opacity: checked ? 1 : 0.42,
                            transition: "opacity 0.15s",
                          }}
                        >
                          <div
                            style={{
                              width: 13,
                              height: 13,
                              borderRadius: 3,
                              flexShrink: 0,
                              border: `1.5px solid ${checked ? theme.primary : "rgba(120,100,60,0.4)"}`,
                              background: checked ? `${theme.primary}22` : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {checked && (
                              <svg width="8" height="8" viewBox="0 0 8 8">
                                <path d="M1 4l2 2 4-4" stroke={theme.primary} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                          <TagIconRenderer icon={value.icon} size={11} />
                          <span style={{ color: theme.heading, fontSize: 12, opacity: 0.85, lineHeight: 1.3 }}>
                            {value.label}
                          </span>
                        </div>
                      );
                    })}
                    {category.values.length === 0 && (
                      <div style={{ padding: "4px 16px 4px 28px", fontSize: 11, color: theme.muted }}>
                        暂无小分类
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => setOpen((prev) => !prev)}
        title={activeTab === "locations" ? "筛选地点" : "筛选事件"}
        style={{
          position: "absolute",
          left: open ? 280 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 46,
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          width: 28,
          height: 60,
          background: `${theme.bg}E8`,
          border: `1px solid ${theme.accent}`,
          borderLeft: open ? "none" : `1px solid ${theme.accent}`,
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: theme.primary,
        }}
      >
        {isFiltered && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: theme.primary,
              color: theme.bg,
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              fontSize: 9,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            {currentVisibleCount}/{currentTotalCount}
          </span>
        )}
        <Filter size={12} />
        <ChevronRight size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.28s" }} />
      </button>
    </>
  );
}

function decodeMapFromHash(): MapProject | null {
  try {
    const hash = window.location.hash;
    const match = hash.match(/[#&]data=([^&]*)/);
    if (!match || !match[1]) return null;
    const json = decodeURIComponent(escape(atob(match[1])));
    return JSON.parse(json) as MapProject;
  } catch {
    return null;
  }
}

export function ShareMapView() {
  const [map, setMap] = useState<MapProject | null>(() => decodeMapFromHash());
  const theme = map ? (MAP_THEMES.find((item) => item.id === map.themeId) ?? MAP_THEMES[0]!) : MAP_THEMES[0]!;
  const [panelRoute, setPanelRoute] = useState<PanelRoute>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagManagerTab, setTagManagerTab] = useState<FilterTab>("locations");
  const [eventDisplayMode, setEventDisplayMode] = useState<EventDisplayMode>("expanded");
  const [expandedEventLocationId, setExpandedEventLocationId] = useState<string | null>(null);
  const [temporaryFocusedEventId, setTemporaryFocusedEventId] = useState<string | null>(null);
  const [view, setView] = useState<MapViewState>({ scale: 1, translateX: 0, translateY: 0 });
  const [filter, setFilter] = useState<ShareFilterState>(() => buildDefaultFilter(map?.tagCategories ?? [], map?.eventTagCategories ?? []));
  const [legendPanels, setLegendPanels] = useState<Record<LegendPanelKey, LegendPanelState>>({
    location: { position: null, collapsed: false },
    event: { position: null, collapsed: false },
  });

  const mapAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const legendRefs = useRef<Record<LegendPanelKey, HTMLDivElement | null>>({ location: null, event: null });
  const draggingLegendKey = useRef<LegendPanelKey | null>(null);
  const legendDragStart = useRef({ mx: 0, my: 0, lx: 0, ly: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewAtPanStart = useRef({ translateX: 0, translateY: 0 });
  const touchPanActive = useRef(false);
  const touchPanStart = useRef({ x: 0, y: 0 });
  const viewAtTouchPanStart = useRef({ translateX: 0, translateY: 0 });
  const pinchActive = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchStartMid = useRef({ x: 0, y: 0 });
  const viewAtPinchStart = useRef({ translateX: 0, translateY: 0 });
  const touchMoved = useRef(false);

  const locationLegendCategory = getLegendCategory(map?.tagCategories ?? []);
  const eventLegendCategory = getLegendCategory(map?.eventTagCategories ?? []);
  const currentLocationDetail = panelRoute?.kind === "location-detail" ? panelRoute : null;
  const currentEventDetail = panelRoute?.kind === "event-detail" ? panelRoute : null;
  const selectedLocation = currentLocationDetail
    ? map?.locations.find((location) => location.id === currentLocationDetail.locationId) ?? null
    : null;
  const selectedEvent = currentEventDetail
    ? map?.events.find((eventItem) => eventItem.id === currentEventDetail.eventId) ?? null
    : null;

  const visibleLocations = map?.locations.filter((location) =>
    matchesTagFilter(location, map.tagCategories, filter.locations)
  ) ?? [];

  const filteredEvents = map?.events.filter((eventItem) =>
    matchesTagFilter(eventItem, map.eventTagCategories, filter.events)
  ) ?? [];

  let visibleEvents: MapEvent[] = [];
  if (eventDisplayMode === "expanded") {
    visibleEvents = filteredEvents;
  } else if (temporaryFocusedEventId) {
    visibleEvents = map?.events.filter((eventItem) => eventItem.id === temporaryFocusedEventId) ?? [];
  } else if (expandedEventLocationId) {
    visibleEvents = filteredEvents.filter((eventItem) => getEventLocationId(eventItem) === expandedEventLocationId);
  }

  const eventCountByLocation = new Map<string, number>();
  (map?.events ?? []).forEach((eventItem) => {
    const locationId = getEventLocationId(eventItem);
    if (!locationId) return;
    eventCountByLocation.set(locationId, (eventCountByLocation.get(locationId) ?? 0) + 1);
  });

  const relatedEvents = selectedLocation
    ? (map?.events.filter((eventItem) => getEventLocationId(eventItem) === selectedLocation.id) ?? [])
    : [];
  const markerScale = {
    location: map?.markerScale?.location ?? 100,
    event: map?.markerScale?.event ?? 100,
  };

  const zoomBy = useCallback((delta: number, originX?: number, originY?: number) => {
    setView((prev) => {
      const container = containerRef.current;
      if (!container) return prev;
      const rect = container.getBoundingClientRect();
      const centerX = originX ?? rect.width / 2;
      const centerY = originY ?? rect.height / 2;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * delta));
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        translateX: centerX - ratio * (centerX - prev.translateX),
        translateY: centerY - ratio * (centerY - prev.translateY),
      };
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
  }, [zoomBy]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON") return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    viewAtPanStart.current = { translateX: view.translateX, translateY: view.translateY };
    e.preventDefault();
  }, [view.translateX, view.translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setView((prev) => ({
      ...prev,
      translateX: viewAtPanStart.current.translateX + (e.clientX - panStart.current.x),
      translateY: viewAtPanStart.current.translateY + (e.clientY - panStart.current.y),
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchMoved.current = false;

    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      touchPanActive.current = true;
      pinchActive.current = false;
      touchPanStart.current = { x: touch.clientX, y: touch.clientY };
      viewAtTouchPanStart.current = { translateX: view.translateX, translateY: view.translateY };
      return;
    }

    if (e.touches.length === 2) {
      const touchA = e.touches[0]!;
      const touchB = e.touches[1]!;
      touchPanActive.current = false;
      pinchActive.current = true;
      pinchStartDist.current = getTouchDist(touchA, touchB);
      pinchStartScale.current = view.scale;
      const mid = getTouchMid(touchA, touchB);
      const rect = containerRef.current?.getBoundingClientRect();
      pinchStartMid.current = rect ? { x: mid.x - rect.left, y: mid.y - rect.top } : { x: mid.x, y: mid.y };
      viewAtPinchStart.current = { translateX: view.translateX, translateY: view.translateY };
    }
  }, [view.scale, view.translateX, view.translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchMoved.current = true;

    if (e.touches.length === 1 && touchPanActive.current) {
      const touch = e.touches[0]!;
      setView((prev) => ({
        ...prev,
        translateX: viewAtTouchPanStart.current.translateX + (touch.clientX - touchPanStart.current.x),
        translateY: viewAtTouchPanStart.current.translateY + (touch.clientY - touchPanStart.current.y),
      }));
      return;
    }

    if (e.touches.length === 2 && pinchActive.current) {
      const touchA = e.touches[0]!;
      const touchB = e.touches[1]!;
      const dist = getTouchDist(touchA, touchB);
      if (pinchStartDist.current === 0) return;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * (dist / pinchStartDist.current)));
      const mid = pinchStartMid.current;
      const ratio = nextScale / pinchStartScale.current;
      setView({
        scale: nextScale,
        translateX: mid.x - ratio * (mid.x - viewAtPinchStart.current.translateX),
        translateY: mid.y - ratio * (mid.y - viewAtPinchStart.current.translateY),
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchPanActive.current = false;
    pinchActive.current = false;

    if (!touchMoved.current && e.changedTouches.length === 1) {
      const target = e.target as HTMLElement;
      if (target.tagName !== "BUTTON") {
        setPanelRoute(null);
      }
    }
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const startLegendDrag = useCallback((key: LegendPanelKey, clientX: number, clientY: number) => {
    const mapAreaElement = mapAreaRef.current;
    const legendElement = legendRefs.current[key];
    if (!mapAreaElement || !legendElement) return;

    const mapRect = mapAreaElement.getBoundingClientRect();
    const legendRect = legendElement.getBoundingClientRect();
    draggingLegendKey.current = key;
    legendDragStart.current = {
      mx: clientX,
      my: clientY,
      lx: legendRect.left - mapRect.left,
      ly: legendRect.top - mapRect.top,
    };
  }, []);

  const handleLegendMouseDown = useCallback((key: LegendPanelKey) => (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-legend-toggle='true']")) return;
    e.stopPropagation();
    e.preventDefault();
    startLegendDrag(key, e.clientX, e.clientY);
  }, [startLegendDrag]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const key = draggingLegendKey.current;
      if (!key) return;

      const mapAreaElement = mapAreaRef.current;
      const legendElement = legendRefs.current[key];
      if (!mapAreaElement || !legendElement) return;

      const dx = e.clientX - legendDragStart.current.mx;
      const dy = e.clientY - legendDragStart.current.my;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

      const mapRect = mapAreaElement.getBoundingClientRect();
      const legendRect = legendElement.getBoundingClientRect();
      const nextX = Math.max(0, Math.min(mapRect.width - legendRect.width, legendDragStart.current.lx + dx));
      const nextY = Math.max(0, Math.min(mapRect.height - legendRect.height, legendDragStart.current.ly + dy));

      setLegendPanels((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          position: { x: nextX, y: nextY },
        },
      }));
    };

    const onMouseUp = () => {
      draggingLegendKey.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const closePanel = () => {
    if (!panelRoute) return;
    if (panelRoute.kind === "location-manager" || panelRoute.kind === "event-manager") {
      setPanelRoute(null);
      return;
    }

    if (panelRoute.kind === "location-detail") {
      setPanelRoute(panelRoute.backTo === "location-manager" ? { kind: "location-manager" } : null);
      return;
    }

    if (panelRoute.backTo && typeof panelRoute.backTo === "object" && panelRoute.backTo.clearTemporaryFocus) {
      setTemporaryFocusedEventId(null);
    }

    if (panelRoute.backTo === "event-manager") {
      setPanelRoute({ kind: "event-manager" });
    } else if (panelRoute.backTo && typeof panelRoute.backTo === "object") {
      const { clearTemporaryFocus, ...locationRoute } = panelRoute.backTo;
      void clearTemporaryFocus;
      setPanelRoute(locationRoute);
    } else {
      setPanelRoute(null);
    }
  };

  const openLocationDetail = (locationId: string, backTo: null | "location-manager" = null) => {
    setTagManagerOpen(false);
    setPanelRoute({ kind: "location-detail", locationId, backTo });
  };

  const openEventDetail = (eventId: string, backTo: EventDetailRoute["backTo"] = null) => {
    setTagManagerOpen(false);
    setPanelRoute({ kind: "event-detail", eventId, backTo });
  };

  const handleLocationEventClick = (eventItem: MapEvent) => {
    if (!currentLocationDetail) return;
    const isAlreadyVisible = eventDisplayMode === "expanded"
      || temporaryFocusedEventId === eventItem.id
      || getEventLocationId(eventItem) === expandedEventLocationId;

    if (!isAlreadyVisible && eventDisplayMode === "collapsed") {
      setTemporaryFocusedEventId(eventItem.id);
    }

    openEventDetail(eventItem.id, {
      ...currentLocationDetail,
      clearTemporaryFocus: !isAlreadyVisible && eventDisplayMode === "collapsed",
    });
  };

  const toggleCollapsedEventsForLocation = (locationId: string) => {
    if (eventDisplayMode !== "collapsed") return;
    setTemporaryFocusedEventId(null);
    setExpandedEventLocationId((prev) => (prev === locationId ? null : locationId));
  };

  const setLocationLegendCategory = (categoryId: string) => {
    setMap((prev) => prev ? ({
      ...prev,
      tagCategories: prev.tagCategories.map((category) => ({ ...category, isLegend: category.id === categoryId })),
    }) : prev);
  };

  const setEventLegendCategory = (categoryId: string) => {
    setMap((prev) => prev ? ({
      ...prev,
      eventTagCategories: prev.eventTagCategories.map((category) => ({ ...category, isLegend: category.id === categoryId })),
    }) : prev);
  };

  const renderLegend = (key: LegendPanelKey, title: string, category: TagCategory) => {
    const card = (
      <LegendCard
        title={title}
        category={category}
        theme={theme}
        collapsed={legendPanels[key].collapsed}
        onToggleCollapse={() => {
          setLegendPanels((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              collapsed: !prev[key].collapsed,
            },
          }));
        }}
        onMouseDown={handleLegendMouseDown(key)}
        legendRef={(node) => {
          legendRefs.current[key] = node;
        }}
      />
    );

    if (legendPanels[key].position) {
      return (
        <div
          key={key}
          style={{
            position: "absolute",
            left: legendPanels[key].position!.x,
            top: legendPanels[key].position!.y,
            zIndex: 40,
          }}
        >
          {card}
        </div>
      );
    }

    return <div key={key}>{card}</div>;
  };

  if (!map) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0b06",
          color: "#8A7050",
          fontFamily: "Georgia, serif",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div style={{ fontSize: 16 }}>无效的分享链接</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>链接可能已损坏或过期</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: theme.bg,
        fontFamily: "Georgia, serif",
        touchAction: "none",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(0,0,0,0.5)",
          borderBottom: `1px solid ${theme.accent}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          minHeight: 44,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, letterSpacing: 1 }}>
          {map.name}
        </div>
        {map.nameEn && (
          <div style={{ fontSize: 11, color: theme.muted, fontStyle: "italic" }}>
            {map.nameEn}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>
          {visibleEvents.length} / {map.events.length} 个事件
        </div>
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>
          {visibleLocations.length} / {map.locations.length} 个地点
        </div>
        <button
          onClick={() => {
            setTagManagerTab("locations");
            setTagManagerOpen((prev) => {
              const next = !prev;
              if (next) setPanelRoute(null);
              return next;
            });
          }}
          style={managerChip(theme.primary, tagManagerOpen)}
        >
          <Tags size={12} /> 标签管理
        </button>
        <button
          onClick={() => {
            setTagManagerOpen(false);
            setPanelRoute((prev) => (prev?.kind === "location-manager" ? null : { kind: "location-manager" }));
          }}
          style={managerChip(theme.primary, panelRoute?.kind === "location-manager")}
        >
          <MapPin size={12} /> 地点管理
        </button>
        <button
          onClick={() => {
            setTagManagerOpen(false);
            setPanelRoute((prev) => (prev?.kind === "event-manager" ? null : { kind: "event-manager" }));
          }}
          style={managerChip(theme.primary, panelRoute?.kind === "event-manager")}
        >
          <Flag size={12} /> 事件管理
        </button>
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            background: `${theme.primary}18`,
            border: `1px solid ${theme.primary}44`,
            color: theme.primary,
            fontSize: 11,
          }}
        >
          只读预览
        </div>
      </div>

      <div ref={mapAreaRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <ShareFilterPanel
          locationCategories={map.tagCategories}
          eventCategories={map.eventTagCategories}
          filter={filter}
          onFilterChange={setFilter}
          theme={theme}
          visibleLocationCount={visibleLocations.length}
          totalLocationCount={map.locations.length}
          visibleEventCount={visibleEvents.length}
          totalEventCount={map.events.length}
        />

        <div style={{ position: "absolute", top: 12, left: 40, zIndex: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { icon: <ZoomIn size={14} />, fn: () => zoomBy(1.3), title: "放大" },
            { icon: <ZoomOut size={14} />, fn: () => zoomBy(1 / 1.3), title: "缩小" },
            { icon: <Maximize2 size={14} />, fn: () => setView({ scale: 1, translateX: 0, translateY: 0 }), title: "重置" },
          ].map(({ icon, fn, title }) => (
            <button
              key={title}
              onClick={fn}
              title={title}
              style={{
                width: 34,
                height: 34,
                background: `${theme.bg}DD`,
                border: `1px solid ${theme.accent}`,
                borderRadius: 6,
                color: theme.primary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                touchAction: "manipulation",
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 40, display: "flex", flexDirection: "column", gap: 8 }}>
          {locationLegendCategory && (
            !legendPanels.location.position && renderLegend("location", "地点图例", locationLegendCategory)
          )}
          {map.events.length > 0 && eventLegendCategory && (
            !legendPanels.event.position && renderLegend("event", "事件图例", eventLegendCategory)
          )}
        </div>

        {locationLegendCategory && legendPanels.location.position && renderLegend("location", "地点图例", locationLegendCategory)}
        {map.events.length > 0 && eventLegendCategory && legendPanels.event.position && renderLegend("event", "事件图例", eventLegendCategory)}

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            cursor: isPanning.current ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "none",
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              transform: `translate(${view.translateX}px, ${view.translateY}px) scale(${view.scale})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <div ref={mapRef} style={{ position: "relative", display: "inline-block" }}>
              {map.imageUrl ? (
                <img
                  src={map.imageUrl}
                  alt={map.name}
                  style={{
                    display: "block",
                    width: "auto",
                    height: "calc(100vh - 88px)",
                    maxWidth: "none",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                  draggable={false}
                />
              ) : (
                <div
                  style={{
                    width: "100vw",
                    height: "calc(100vh - 88px)",
                    background: theme.bg,
                    backgroundImage: `linear-gradient(${theme.accent}22 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}22 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                    pointerEvents: "none",
                  }}
                />
              )}

              {visibleLocations.map((location) => (
                <Marker
                  key={location.id}
                  entity={location}
                  legendCategory={locationLegendCategory}
                  isSelected={selectedLocation?.id === location.id}
                  scalePercent={markerScale.location}
                  onClick={() => {
                    openLocationDetail(location.id, null);
                  }}
                  onDoubleClick={() => toggleCollapsedEventsForLocation(location.id)}
                  badgeCount={eventDisplayMode === "collapsed" ? eventCountByLocation.get(location.id) : undefined}
                  baseZIndex={10}
                />
              ))}

              {visibleEvents.map((eventItem) => (
                <Marker
                  key={eventItem.id}
                  entity={eventItem}
                  legendCategory={eventLegendCategory}
                  isSelected={selectedEvent?.id === eventItem.id}
                  scalePercent={markerScale.event}
                  onClick={() => {
                    openEventDetail(eventItem.id, null);
                  }}
                  baseZIndex={30}
                />
              ))}
            </div>
          </div>
        </div>

        {panelRoute?.kind === "location-manager" && (
          <ShareLocationManagerPanel
            theme={theme}
            locations={map.locations}
            categories={map.tagCategories}
            onClose={() => setPanelRoute(null)}
            onSelectLocation={(location) => {
              openLocationDetail(location.id, "location-manager");
            }}
          />
        )}

        {panelRoute?.kind === "event-manager" && (
          <ShareEventManagerPanel
            theme={theme}
            events={map.events}
            categories={map.eventTagCategories}
            onClose={() => setPanelRoute(null)}
            onSelectEvent={(eventItem) => {
              openEventDetail(eventItem.id, "event-manager");
            }}
            displayMode={eventDisplayMode}
            onDisplayModeChange={(mode) => {
              setEventDisplayMode(mode);
              if (mode === "expanded") {
                setTemporaryFocusedEventId(null);
                setExpandedEventLocationId(null);
              }
            }}
          />
        )}

        {tagManagerOpen && (
          <ShareTagManagerPanel
            theme={theme}
            locationCategories={map.tagCategories}
            eventCategories={map.eventTagCategories}
            activeTab={tagManagerTab}
            onTabChange={setTagManagerTab}
            onClose={() => setTagManagerOpen(false)}
            onSetLocationLegend={setLocationLegendCategory}
            onSetEventLegend={setEventLegendCategory}
          />
        )}

        {selectedLocation && (
          <ReadOnlyLocationDetailPanel
            location={selectedLocation}
            categories={map.tagCategories}
            theme={theme}
            onClose={closePanel}
            relatedEvents={relatedEvents}
            eventLegendCategory={eventLegendCategory}
            onSelectEvent={handleLocationEventClick}
          />
        )}

        {selectedEvent && (
          <ReadOnlyDetailPanel
            entity={selectedEvent}
            categories={map.eventTagCategories}
            theme={theme}
            onClose={closePanel}
            headerMeta={formatEventTime(selectedEvent.time)}
          />
        )}
      </div>
    </div>
  );
}
