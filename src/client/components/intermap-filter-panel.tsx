import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Eye, EyeOff, Filter, X } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import { TagIconRenderer } from "./tag-icon-renderer";
import type { TagCategory } from "../types/intermap-types";

type EntityFilterMap = Record<string, Set<string>>;

export interface IntermapFilterState {
  locations: EntityFilterMap;
  events: EntityFilterMap;
}

function buildEntityFilter(cats: TagCategory[]): EntityFilterMap {
  const state: EntityFilterMap = {};
  cats.forEach((cat) => {
    state[cat.id] = new Set(cat.values.map((value) => value.id));
  });
  return state;
}

export function buildDefaultIntermapFilter(locationCats: TagCategory[], eventCats: TagCategory[]): IntermapFilterState {
  return {
    locations: buildEntityFilter(locationCats),
    events: buildEntityFilter(eventCats),
  };
}

interface IntermapFilterPanelProps {
  filter: IntermapFilterState;
  onFilterChange: (next: IntermapFilterState) => void;
  visibleLocationCount: number;
  totalLocationCount: number;
  visibleEventCount: number;
  totalEventCount: number;
  themeColor: string;
  themeHeading: string;
  themeBg: string;
  themeAccent: string;
  themeMuted: string;
}

export function IntermapFilterPanel({
  filter,
  onFilterChange,
  visibleLocationCount,
  totalLocationCount: _totalLocationCount,
  visibleEventCount,
  totalEventCount: _totalEventCount,
  themeColor,
  themeHeading,
  themeBg,
  themeAccent,
  themeMuted,
}: IntermapFilterPanelProps) {
  const { activeMap } = useIntermap();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"locations" | "events">("locations");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const locationCats = activeMap?.tagCategories ?? [];
  const eventCats = activeMap?.eventTagCategories ?? [];
  const currentCats = activeTab === "locations" ? locationCats : eventCats;
  const currentFilter = activeTab === "locations" ? filter.locations : filter.events;

  useEffect(() => {
    const next: Record<string, boolean> = {};
    [...locationCats, ...eventCats].forEach((cat) => {
      next[cat.id] = true;
    });
    setExpanded(next);
  }, [locationCats.length, eventCats.length]);

  const updateCurrentFilter = useCallback((nextEntityFilter: EntityFilterMap) => {
    if (activeTab === "locations") {
      onFilterChange({ ...filter, locations: nextEntityFilter });
      return;
    }

    onFilterChange({ ...filter, events: nextEntityFilter });
  }, [activeTab, filter, onFilterChange]);

  const toggle = useCallback((catId: string, valueId: string) => {
    const prev = currentFilter[catId] ?? new Set<string>();
    const next = new Set(prev);

    if (next.has(valueId)) next.delete(valueId);
    else next.add(valueId);

    updateCurrentFilter({ ...currentFilter, [catId]: next });
  }, [currentFilter, updateCurrentFilter]);

  const toggleAll = useCallback((cat: TagCategory) => {
    const allIds = cat.values.map((value) => value.id);
    const current = currentFilter[cat.id] ?? new Set<string>();
    const allOn = allIds.every((id) => current.has(id));

    updateCurrentFilter({
      ...currentFilter,
      [cat.id]: allOn ? new Set<string>() : new Set(allIds),
    });
  }, [currentFilter, updateCurrentFilter]);

  const resetCurrent = useCallback(() => {
    updateCurrentFilter(buildEntityFilter(currentCats));
  }, [currentCats, updateCurrentFilter]);

  const panelBg = themeBg || "#0e0a04";
  const borderColor = themeAccent || "rgba(180,140,60,0.3)";

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
          background: `${panelBg}FA`,
          borderRight: `1px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            padding: "12px 16px 10px",
            borderBottom: `1px solid ${borderColor}44`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Filter size={14} color={themeColor} />
          <span style={{ color: themeHeading, fontWeight: "bold", fontSize: 14, flex: 1 }}>
            {activeTab === "locations" ? "地点筛选" : "事件筛选"}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: themeMuted,
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "10px 16px 8px",
            borderBottom: `1px solid ${borderColor}22`,
            display: "flex",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveTab("locations")}
            style={tabStyle(activeTab === "locations", themeColor, themeMuted, borderColor)}
          >
            地点
          </button>
          <button
            onClick={() => setActiveTab("events")}
            style={tabStyle(activeTab === "events", themeColor, themeMuted, borderColor)}
          >
            事件
          </button>
        </div>

        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${borderColor}22`, flexShrink: 0 }}>
          <button
            onClick={resetCurrent}
            style={{
              fontSize: 11,
              color: themeMuted,
              background: "none",
              border: `1px solid ${borderColor}66`,
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            重置当前筛选
          </button>
        </div>

        {currentCats.map((cat) => {
          const catFilter = currentFilter[cat.id] ?? new Set<string>();
          const allOn = cat.values.every((value) => catFilter.has(value.id));
          const isExpanded = expanded[cat.id] ?? true;

          return (
            <div key={cat.id} style={{ borderBottom: `1px solid ${borderColor}22`, flexShrink: 0 }}>
              <div
                style={{ display: "flex", alignItems: "center", padding: "9px 16px", cursor: "pointer", gap: 6 }}
                onClick={() => setExpanded((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
              >
                <ChevronRight
                  size={12}
                  color={themeMuted}
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: themeHeading, fontSize: 12, fontWeight: "bold", flex: 1, opacity: 0.9 }}>
                  {cat.label}
                </span>
                {cat.isLegend && (
                  <span
                    style={{
                      fontSize: 9,
                      color: themeColor,
                      background: `${themeColor}22`,
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
                    toggleAll(cat);
                  }}
                  style={{
                    fontSize: 10,
                    color: themeMuted,
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
                  {cat.values.map((val) => {
                    const checked = catFilter.has(val.id);

                    return (
                      <div
                        key={val.id}
                        onClick={() => toggle(cat.id, val.id)}
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
                            border: `1.5px solid ${checked ? themeColor : "rgba(120,100,60,0.4)"}`,
                            background: checked ? `${themeColor}22` : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {checked && (
                            <svg width="8" height="8" viewBox="0 0 8 8">
                              <path
                                d="M1 4l2 2 4-4"
                                stroke={themeColor}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                        </div>
                        <TagIconRenderer icon={val.icon} size={11} themeColor={themeColor} />
                        <span style={{ color: themeHeading, fontSize: 12, opacity: 0.85, lineHeight: 1.3 }}>
                          {val.label}
                        </span>
                      </div>
                    );
                  })}

                  {cat.values.length === 0 && (
                    <div style={{ padding: "4px 16px 4px 28px", fontSize: 11, color: themeMuted }}>
                      暂无小分类
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setOpen((prev) => !prev)}
        title="筛选地点和事件"
        style={{
          position: "absolute",
          left: open ? 280 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 46,
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          width: 32,
          minHeight: 74,
          background: `${panelBg}E8`,
          border: `1px solid ${borderColor}`,
          borderLeft: open ? "none" : `1px solid ${borderColor}`,
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: themeColor,
        }}
      >
        <div style={{ position: "absolute", top: -8, right: -10, display: "flex", flexDirection: "column", gap: 3 }}>
          <CountBadge value={visibleLocationCount} label="地" color={themeColor} bg={panelBg} />
          <CountBadge value={visibleEventCount} label="事" color={themeColor} bg={panelBg} />
        </div>
        <Filter size={12} />
        <ChevronRight
          size={10}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.28s" }}
        />
      </button>
    </>
  );
}

function tabStyle(active: boolean, themeColor: string, themeMuted: string, borderColor: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "5px 0",
    borderRadius: 6,
    border: `1px solid ${active ? themeColor : borderColor}`,
    background: active ? `${themeColor}22` : "transparent",
    color: active ? themeColor : themeMuted,
    fontSize: 12,
    cursor: "pointer",
  };
}

function CountBadge({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        background: color,
        color: bg,
        borderRadius: 8,
        minWidth: 24,
        height: 16,
        padding: "0 4px",
        fontSize: 9,
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
      }}
    >
      {value}
      {label}
    </span>
  );
}
