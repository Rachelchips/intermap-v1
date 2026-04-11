import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Flag, Plus, Search, Trash2, X } from "lucide-react";
import { compareEventSortTime, formatEventTime, normalizeEventSortTime } from "@/lib/intermap-helpers";
import { useIntermap } from "../store/intermap-store";
import { TagIconRenderer } from "./tag-icon-renderer";
import type { MapEvent, MapTheme } from "../types/intermap-types";

interface EventManagerPanelProps {
  theme: MapTheme;
  onClose: () => void;
  onSelectEvent: (eventItem: MapEvent) => void;
  onAddEvent: () => void;
  displayMode: "expanded" | "collapsed";
  onDisplayModeChange: (mode: "expanded" | "collapsed") => void;
  onVisibleEventsChange?: (events: MapEvent[]) => void;
}

type SortOrder = "default" | "time-asc" | "time-desc";

export function EventManagerPanel({
  theme,
  onClose,
  onSelectEvent,
  onAddEvent,
  displayMode,
  onDisplayModeChange,
  onVisibleEventsChange,
}: EventManagerPanelProps) {
  const { activeMap, dispatch } = useIntermap();
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Record<string, Set<string>>>({});
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  if (!activeMap) return null;

  const events = activeMap.events;
  const cats = activeMap.eventTagCategories;

  const filteredEvents = useMemo(() => {
    const next = events
      .map((eventItem, index) => ({ eventItem, index }))
      .filter(({ eventItem }) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const nameMatch = eventItem.name.toLowerCase().includes(q);
          const nameEnMatch = (eventItem.nameEn ?? "").toLowerCase().includes(q);
          if (!nameMatch && !nameEnMatch) return false;
        }

        for (const cat of cats) {
          const allowed = tagFilter[cat.id];
          if (!allowed || allowed.size === 0) continue;
          const tagVal = eventItem.tags[cat.id] ?? "none";
          if (!allowed.has(tagVal)) return false;
        }

        return true;
      });

    if (sortOrder !== "default") {
      next.sort((a, b) => {
        const left = normalizeEventSortTime(a.eventItem.sortTime);
        const right = normalizeEventSortTime(b.eventItem.sortTime);

        if (!left && !right) return a.index - b.index;
        if (!left) return 1;
        if (!right) return -1;

        const cmp = compareEventSortTime(left, right);
        if (cmp !== 0) return sortOrder === "time-desc" ? -cmp : cmp;
        return a.index - b.index;
      });
    }

    return next.map((item) => item.eventItem);
  }, [cats, events, search, sortOrder, tagFilter]);

  useEffect(() => {
    onVisibleEventsChange?.(filteredEvents);
  }, [filteredEvents, onVisibleEventsChange]);

  const toggleTagFilter = (catId: string, valueId: string) => {
    setTagFilter((prev) => {
      const cur = new Set(prev[catId] ?? []);
      if (cur.has(valueId)) cur.delete(valueId);
      else cur.add(valueId);
      return { ...prev, [catId]: cur };
    });
  };

  const toggleCatCollapse = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 个事件吗？此操作不可恢复。`)) return;

    selected.forEach((id) => {
      dispatch({ type: "DELETE_EVENT", mapId: activeMap.id, eventId: id });
    });

    setSelected(new Set());
    setBatchMode(false);
  };

  const p = theme.primary;
  const bg = theme.bg;
  const accent = theme.accent;
  const heading = theme.heading;
  const muted = theme.muted;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: `${bg}EE`,
        borderLeft: `1px solid ${accent}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        backdropFilter: "blur(8px)",
        fontFamily: "Georgia, serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: `1px solid ${accent}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Flag size={15} color={p} />
          <span style={{ fontSize: 15, fontWeight: "bold", color: heading, flex: 1 }}>事件管理</span>
          <span style={{ fontSize: 11, color: muted, opacity: 0.7 }}>{events.length} 个事件</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: muted, cursor: "pointer", padding: 4, marginLeft: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={onAddEvent} style={chip(p, true)}>
            <Plus size={12} /> 添加事件
          </button>
          <button
            onClick={() => {
              setBatchMode((prev) => !prev);
              setSelected(new Set());
            }}
            style={chip(batchMode ? "#C86060" : p, batchMode)}
          >
            {batchMode ? <X size={12} /> : <Trash2 size={12} />}
            {batchMode ? "退出编辑" : "编辑"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onDisplayModeChange("expanded")} style={chip(p, displayMode === "expanded")}>
            事件展开显示
          </button>
          <button onClick={() => onDisplayModeChange("collapsed")} style={chip(p, displayMode === "collapsed")}>
            事件收缩显示
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${accent}`, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${accent}`,
            borderRadius: 6,
            padding: "5px 9px",
          }}
        >
          <Search size={12} color={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索事件名称..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: heading,
              fontSize: 13,
              fontFamily: "Georgia, serif",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", color: muted, cursor: "pointer", padding: 0 }}
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>排序方式</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button onClick={() => setSortOrder("default")} style={chip(p, sortOrder === "default")}>
              默认顺序
            </button>
            <button onClick={() => setSortOrder("time-asc")} style={chip(p, sortOrder === "time-asc")}>
              时间升序
            </button>
            <button onClick={() => setSortOrder("time-desc")} style={chip(p, sortOrder === "time-desc")}>
              时间降序
            </button>
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <div
          style={{
            borderBottom: `1px solid ${accent}`,
            flexShrink: 0,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {cats.map((cat) => {
            const isCollapsed = collapsedCats.has(cat.id);
            const activeCatFilter = tagFilter[cat.id];
            const hasActiveFilter = activeCatFilter && activeCatFilter.size > 0;

            return (
              <div key={cat.id}>
                <div
                  onClick={() => toggleCatCollapse(cat.id)}
                  style={{
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    borderBottom: `1px solid ${accent}44`,
                  }}
                >
                  {isCollapsed ? <ChevronRight size={11} color={muted} /> : <ChevronDown size={11} color={muted} />}
                  <span style={{ fontSize: 11, color: hasActiveFilter ? p : muted, flex: 1 }}>{cat.label}</span>
                  {hasActiveFilter && (
                    <span
                      style={{
                        fontSize: 9,
                        background: `${p}33`,
                        color: p,
                        borderRadius: 10,
                        padding: "1px 6px",
                        border: `1px solid ${p}44`,
                      }}
                    >
                      {activeCatFilter!.size}
                    </span>
                  )}
                  {hasActiveFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagFilter((prev) => ({ ...prev, [cat.id]: new Set() }));
                      }}
                      style={{ background: "none", border: "none", color: muted, cursor: "pointer", fontSize: 9, padding: "0 2px" }}
                    >
                      清除
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div style={{ padding: "6px 14px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {cat.values.map((val) => {
                      const isOn = activeCatFilter?.has(val.id) ?? false;
                      return (
                        <button
                          key={val.id}
                          onClick={() => toggleTagFilter(cat.id, val.id)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            border: `1px solid ${isOn ? p : "rgba(180,140,60,0.25)"}`,
                            background: isOn ? `${p}22` : "transparent",
                            color: isOn ? p : muted,
                            transition: "all 0.15s",
                          }}
                        >
                          <TagIconRenderer icon={val.icon} size={9} themeColor={p} />
                          {val.label}
                        </button>
                      );
                    })}

                    {cat.values.length === 0 && (
                      <span style={{ fontSize: 11, color: muted, opacity: 0.5 }}>暂无标签</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredEvents.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: muted,
              opacity: 0.6,
              fontSize: 13,
            }}
          >
            {events.length === 0 ? "还没有事件，点击“添加事件”开始" : "没有匹配的事件"}
          </div>
        ) : (
          filteredEvents.map((eventItem) => {
            const isChecked = selected.has(eventItem.id);
            const legendCat = cats.find((cat) => cat.isLegend);
            const tagValId = legendCat ? eventItem.tags[legendCat.id] : undefined;
            const tagVal = legendCat?.values.find((value) => value.id === tagValId);
            const timeLabel = formatEventTime(eventItem.time);

            return (
              <div
                key={eventItem.id}
                onClick={() => {
                  if (batchMode) toggleSelect(eventItem.id);
                  else onSelectEvent(eventItem);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${accent}33`,
                  background: isChecked ? `${p}10` : "transparent",
                  transition: "background 0.1s",
                }}
              >
                {batchMode && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${isChecked ? p : "rgba(180,140,60,0.4)"}`,
                      background: isChecked ? `${p}33` : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && <Check size={9} color={p} />}
                  </div>
                )}

                <div style={{ flexShrink: 0 }}>
                  {tagVal ? (
                    <TagIconRenderer icon={tagVal.icon} size={12} themeColor={p} />
                  ) : (
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "rgba(150,130,100,0.3)",
                        border: "1px solid rgba(150,130,100,0.4)",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: heading,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {eventItem.name}
                  </div>

                  {timeLabel && (
                    <div
                      style={{
                        fontSize: 10,
                        color: muted,
                        opacity: 0.85,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {timeLabel}
                    </div>
                  )}

                  {eventItem.nameEn && (
                    <div
                      style={{
                        fontSize: 10,
                        color: muted,
                        fontStyle: "italic",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {eventItem.nameEn}
                    </div>
                  )}
                </div>

                {!batchMode && (
                  <ChevronRight size={13} color={muted} style={{ flexShrink: 0, opacity: 0.5 }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {batchMode && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${accent}`,
            background: bg,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: muted, flex: 1 }}>已选 {selected.size} 项</span>
          <button
            onClick={() => setSelected(new Set(filteredEvents.map((eventItem) => eventItem.id)))}
            style={chip(p, false)}
          >
            全选
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selected.size === 0}
            style={{
              ...chip("#C86060", selected.size > 0),
              opacity: selected.size > 0 ? 1 : 0.4,
              cursor: selected.size > 0 ? "pointer" : "not-allowed",
            }}
          >
            <Trash2 size={12} /> 删除
          </button>
        </div>
      )}
    </div>
  );
}

function chip(color: string, active: boolean): React.CSSProperties {
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
