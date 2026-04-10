/**
 * @file location-manager-panel.tsx
 * @description Right-side Location Manager panel for the Intermap system.
 *
 * How it works:
 * 1. Shows a scrollable list of all locations in the active map
 * 2. Supports search by Chinese or English name
 * 3. Tag filter chips (one section per tag category) — filters are local to this panel,
 *    independent of the map's global display filter
 * 4. "添加地点" button at top triggers the LocationEditor modal
 * 5. "编辑" toggle enters batch-select mode with checkboxes; a bottom bar shows
 *    selected count + batch-delete button
 * 6. Clicking a location row calls onSelectLocation → parent switches to DetailPanel
 *    and highlights the marker on the map
 */

import { useState, useMemo } from "react";
import { X, Plus, Trash2, Check, Search, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import { TagIconRenderer } from "./tag-icon-renderer";
import type { MapLocation, MapTheme } from "../types/intermap-types";

interface LocationManagerPanelProps {
  theme: MapTheme;
  onClose: () => void;
  onSelectLocation: (loc: MapLocation) => void;
  onAddLocation: () => void;
}

/**
 * Location Manager Panel.
 * Renders a fixed-width right-side panel with search, tag filters, and location list.
 */
export function LocationManagerPanel({
  theme, onClose, onSelectLocation, onAddLocation,
}: LocationManagerPanelProps) {
  const { activeMap, dispatch } = useIntermap();
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Tag filter: catId → Set of allowed valueIds (empty Set = show all)
  const [tagFilter, setTagFilter] = useState<Record<string, Set<string>>>({});
  // Which filter sections are collapsed
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  if (!activeMap) return null;

  const locations = activeMap.locations;
  const cats = activeMap.tagCategories;

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = loc.name.toLowerCase().includes(q);
        const nameEnMatch = (loc.nameEn ?? "").toLowerCase().includes(q);
        if (!nameMatch && !nameEnMatch) return false;
      }
      // Tag filter (only categories that have active filters)
      for (const cat of cats) {
        const allowed = tagFilter[cat.id];
        if (!allowed || allowed.size === 0) continue; // no filter = show all
        const tagVal = loc.tags[cat.id] ?? "none";
        if (!allowed.has(tagVal)) return false;
      }
      return true;
    });
  }, [locations, search, tagFilter, cats]);

  // ── Tag filter helpers ────────────────────────────────────────────────────
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

  // ── Batch selection helpers ───────────────────────────────────────────────
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
    if (!confirm(`确定删除选中的 ${selected.size} 个地点？此操作不可恢复。`)) return;
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
      {/* ── Header ─────────────────────────────────────── */}
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
          {/* Close */}
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: muted, cursor: "pointer", padding: 4, marginLeft: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onAddLocation}
            style={chip(p, true)}
          >
            <Plus size={12} /> 添加地点
          </button>
          <button
            onClick={() => { setBatchMode((b) => !b); setSelected(new Set()); }}
            style={chip(batchMode ? "#C86060" : p, batchMode)}
          >
            {batchMode ? <X size={12} /> : <Trash2 size={12} />}
            {batchMode ? "退出编辑" : "编辑"}
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
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
            placeholder="搜索地点名称…"
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
      </div>

      {/* ── Tag filters ────────────────────────────────── */}
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
                {/* Category header */}
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
                      onClick={(e) => { e.stopPropagation(); setTagFilter((prev) => ({ ...prev, [cat.id]: new Set() })); }}
                      style={{ background: "none", border: "none", color: muted, cursor: "pointer", fontSize: 9, padding: "0 2px" }}
                    >
                      清除
                    </button>
                  )}
                </div>
                {/* Value chips */}
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

      {/* ── Location list ───────────────────────────────── */}
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
            {locations.length === 0 ? "还没有地点，点击「添加地点」开始" : "没有匹配的地点"}
          </div>
        ) : (
          filteredLocations.map((loc) => {
            const isChecked = selected.has(loc.id);
            // Find legend tag value for the icon
            const legendCat = cats.find((c) => c.isLegend);
            const tagValId = legendCat ? loc.tags[legendCat.id] : undefined;
            const tagVal = legendCat?.values.find((v) => v.id === tagValId);

            return (
              <div
                key={loc.id}
                onClick={() => {
                  if (batchMode) { toggleSelect(loc.id); }
                  else { onSelectLocation(loc); }
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
                {/* Batch checkbox */}
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

                {/* Legend icon */}
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
                        border: `1px solid rgba(150,130,100,0.4)`,
                      }}
                    />
                  )}
                </div>

                {/* Name */}
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

                {/* Arrow if not batch mode */}
                {!batchMode && (
                  <ChevronRight size={13} color={muted} style={{ flexShrink: 0, opacity: 0.5 }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Batch action bar ────────────────────────────── */}
      {batchMode && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${accent}`,
            background: `${bg}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: muted, flex: 1 }}>已选 {selected.size} 个</span>
          <button
            onClick={() => setSelected(new Set(filteredLocations.map((l) => l.id)))}
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

/** Inline style helper for small action chips/buttons */
function chip(color: string, active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    border: `1px solid ${active ? color : color + "66"}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : color + "CC",
    fontFamily: "Georgia, serif",
    transition: "all 0.15s",
  };
}
