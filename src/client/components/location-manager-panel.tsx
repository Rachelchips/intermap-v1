import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Plus, Search, Trash2, X } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import { TagIconRenderer } from "./tag-icon-renderer";
import type { MapLocation, MapTheme, TagCategory, TagIcon } from "../types/intermap-types";

interface LocationManagerPanelProps {
  theme: MapTheme;
  onClose: () => void;
  onSelectLocation: (loc: MapLocation) => void;
  onAddLocation: () => void;
}

interface LocationGroup {
  key: string;
  label: string;
  icon: TagIcon;
  items: MapLocation[];
}

export function LocationManagerPanel({
  theme,
  onClose,
  onSelectLocation,
  onAddLocation,
}: LocationManagerPanelProps) {
  const { activeMap, dispatch } = useIntermap();
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Record<string, Set<string>>>({});
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [groupByTagId, setGroupByTagId] = useState("");

  if (!activeMap) return null;

  const locations = activeMap.locations;
  const cats = activeMap.tagCategories;

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = loc.name.toLowerCase().includes(q);
        const nameEnMatch = (loc.nameEn ?? "").toLowerCase().includes(q);
        if (!nameMatch && !nameEnMatch) return false;
      }

      for (const cat of cats) {
        const allowed = tagFilter[cat.id];
        if (!allowed || allowed.size === 0) continue;
        const tagVal = loc.tags[cat.id] ?? "none";
        if (!allowed.has(tagVal)) return false;
      }

      return true;
    });
  }, [cats, locations, search, tagFilter]);

  const groupedLocations = useMemo<LocationGroup[]>(() => {
    if (!groupByTagId) {
      return [
        {
          key: "all",
          label: "全部地点",
          icon: { kind: "none" },
          items: filteredLocations,
        },
      ];
    }

    const category = cats.find((cat) => cat.id === groupByTagId);
    if (!category) {
      return [
        {
          key: "all",
          label: "全部地点",
          icon: { kind: "none" },
          items: filteredLocations,
        },
      ];
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
      groups.push({
        key: "uncategorized",
        label: "未分类",
        icon: { kind: "none" },
        items: uncategorized,
      });
    }

    return groups;
  }, [cats, filteredLocations, groupByTagId]);

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
    if (!confirm(`确定删除选中的 ${selected.size} 个地点吗？此操作不可恢复。`)) return;
    selected.forEach((id) => {
      dispatch({ type: "DELETE_LOCATION", mapId: activeMap.id, locationId: id });
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
          <MapPin size={15} color={p} />
          <span style={{ fontSize: 15, fontWeight: "bold", color: heading, flex: 1 }}>地点管理</span>
          <span style={{ fontSize: 11, color: muted, opacity: 0.7 }}>{locations.length} 个地点</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: muted, cursor: "pointer", padding: 4, marginLeft: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onAddLocation} style={chip(p, true)}>
            <Plus size={12} /> 添加地点
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
            placeholder="搜索地点名称..."
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
          <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>按标签分类显示</div>
          <select
            value={groupByTagId}
            onChange={(e) => setGroupByTagId(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 9px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${accent}`,
              borderRadius: 6,
              color: heading,
              fontSize: 12,
              fontFamily: "Georgia, serif",
              outline: "none",
            }}
          >
            <option value="">默认顺序</option>
            {cats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
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
                          <TagIconRenderer icon={val.icon} size={9} />
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
        {filteredLocations.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: muted,
              opacity: 0.6,
              fontSize: 13,
            }}
          >
            {locations.length === 0 ? "还没有地点，点击“添加地点”开始" : "没有匹配的地点"}
          </div>
        ) : (
          groupedLocations.map((group) => (
            <div key={group.key}>
              {groupByTagId && (
                <div
                  style={{
                    padding: "7px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderBottom: `1px solid ${accent}44`,
                    background: "rgba(255,255,255,0.04)",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <TagIconRenderer icon={group.icon} size={10} />
                  <span style={{ fontSize: 11, color: heading, flex: 1, opacity: 0.9 }}>{group.label}</span>
                  <span style={{ fontSize: 10, color: muted }}>{group.items.length}</span>
                </div>
              )}

              {group.items.map((loc) => {
                const isChecked = selected.has(loc.id);
                const legendCat = cats.find((cat) => cat.isLegend);
                const tagValId = legendCat ? loc.tags[legendCat.id] : undefined;
                const tagVal = legendCat?.values.find((value) => value.id === tagValId);

                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      if (batchMode) toggleSelect(loc.id);
                      else onSelectLocation(loc);
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
                        <TagIconRenderer icon={tagVal.icon} size={12} />
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
                        {loc.name}
                      </div>
                      {loc.nameEn && (
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
                          {loc.nameEn}
                        </div>
                      )}
                    </div>

                    {!batchMode && (
                      <ChevronRight size={13} color={muted} style={{ flexShrink: 0, opacity: 0.5 }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))
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
            onClick={() => setSelected(new Set(filteredLocations.map((location) => location.id)))}
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
