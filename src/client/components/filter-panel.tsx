/**
 * @file filter-panel.tsx
 * @description Left-side sliding filter panel for the Tramire map.
 * Supports filtering by location type, faction, and zone.
 * A toggle button is always visible on the left edge; clicking it reveals the panel.
 */

import { useState, useCallback } from "react";
import type { LocationType, FactionType, FilterState } from "../types/map-types";
import { Filter, X, ChevronRight, Eye, EyeOff } from "lucide-react";

// ── Static config ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: LocationType; label: string; color: string; border: string }[] = [
  { value: "city",     label: "城镇",   color: "#8B4513", border: "#FFD700" },
  { value: "sacred",   label: "圣地",   color: "#6B21A8", border: "#E9D5FF" },
  { value: "natural",  label: "自然地貌", color: "#2D6A2D", border: "#90EE90" },
  { value: "ruin",     label: "废墟遗迹", color: "#5C4033", border: "#B8A398" },
  { value: "landmark", label: "地标建筑", color: "#1E40AF", border: "#93C5FD" },
];

const FACTION_OPTIONS: { value: FactionType; label: string; color: string }[] = [
  { value: "human",       label: "人类",  color: "#C8A860" },
  { value: "treant",      label: "树精",  color: "#4ADE80" },
  { value: "elvenbranch", label: "枝裔族", color: "#C084FC" },
  { value: "orc",         label: "兽人",  color: "#F87171" },
  { value: "clawkin",     label: "裂爪族", color: "#FB923C" },
  { value: "none",        label: "无归属", color: "#6B7280" },
];

export const ALL_ZONES: { value: string; label: string }[] = [
  { value: "central_world_root_zone",           label: "中部 - 神树地带" },
  { value: "central_ancient_battlefield_zone",  label: "中部 - 古战场区" },
  { value: "southern_aurelen_zone",             label: "南部 - 奥蕊岚" },
  { value: "southwestern_sanlar_kingdom",       label: "西南部 - 圣岚王国" },
  { value: "northwestern_merton_kingdom",       label: "西北部 - 梅顿王国" },
  { value: "canal_zone_lando_duchy",            label: "运河地带 - 兰多公国" },
  { value: "extreme_northwestern_wasteland",    label: "极西北部 - 西部荒原" },
  { value: "northwestern_offshore_islands",     label: "西北部海面 - 铁礁群岛" },
  { value: "lunar_creek_zone",                  label: "沿神树区 - 月神溪地带" },
  { value: "southeastern_forest_zone",          label: "东南部 - 密林地带" },
  { value: "northeastern_marsh_zone",           label: "东北部 - 沼泽地带" },
  { value: "eastern_coast_abandoned_zone",      label: "东部沿海 - 废弃海岸地带" },
  { value: "forest_and_marsh_boundary_great_rift", label: "密林和沼泽分界线 - 大裂隙" },
];

/** Build a fully-enabled default filter state (all visible). */
export function buildDefaultFilter(): FilterState {
  return {
    types: new Set<LocationType>(["city", "sacred", "natural", "ruin", "landmark"]),
    factions: new Set<FactionType>(["human", "treant", "elvenbranch", "orc", "clawkin", "none"]),
    zones: new Set<string>(ALL_ZONES.map((z) => z.value)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  /** Number of locations currently hidden by the active filters. */
  hiddenLocationCount?: number;
  /**
   * Vertical position (CSS top value) for the toggle button.
   * Defaults to "50%" (vertical center).
   * Pass a pixel string like "20%" to push it upward when a bottom sheet is open.
   */
  toggleButtonTop?: string;
}

/**
 * FilterPanel renders a toggle button on the left edge of the screen.
 * Clicking it slides open a sidebar with three collapsible sections:
 * 1. Location type checkboxes
 * 2. Faction checkboxes
 * 3. Zone checkboxes
 */
export function FilterPanel({ filter, onChange, hiddenLocationCount = 0, toggleButtonTop = "50%" }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [sectExpanded, setSectExpanded] = useState({ types: true, factions: true, zones: true });

  /** Toggle a single value in a Set. */
  const toggle = useCallback(
    <T extends string>(key: keyof FilterState, value: T) => {
      const next = new Set(filter[key] as Set<T>);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onChange({ ...filter, [key]: next });
    },
    [filter, onChange]
  );

  /** Select-all / deselect-all for a section. */
  const toggleAll = useCallback(
    <T extends string>(key: keyof FilterState, all: T[]) => {
      const current = filter[key] as Set<T>;
      const isAllOn = all.every((v) => current.has(v));
      onChange({ ...filter, [key]: isAllOn ? new Set<T>() : new Set<T>(all) });
    },
    [filter, onChange]
  );

  const toggleSection = (k: keyof typeof sectExpanded) =>
    setSectExpanded((p) => ({ ...p, [k]: !p[k] }));

  // Precompute all-values arrays (needed for allOn checks in FilterSection)
  const allTypes = TYPE_OPTIONS.map((o) => o.value);
  const allFactions = FACTION_OPTIONS.map((o) => o.value);
  const allZones = ALL_ZONES.map((z) => z.value);

  // Use the passed-in count of visible locations for the badge
  const visibleCount = hiddenLocationCount;

  return (
    <>
      {/* Overlay backdrop */}
      {open && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 44,
            background: "rgba(0,0,0,0.35)",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sliding panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: 260,
          zIndex: 45,
          transform: open ? "translateX(0)" : "translateX(-260px)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: "rgba(14,10,4,0.97)",
          borderRight: "1px solid rgba(180,140,60,0.3)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid rgba(180,140,60,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Filter size={14} color="#C8A860" />
          <span style={{ color: "#E8D080", fontWeight: "bold", fontSize: 14, flex: 1 }}>地点筛选</span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#7A6040",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Reset all */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(180,140,60,0.12)", flexShrink: 0 }}>
          <button
            onClick={() => onChange(buildDefaultFilter())}
            style={{
              fontSize: 11,
              color: "#9A8060",
              background: "none",
              border: "1px solid rgba(180,140,60,0.25)",
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            重置全部筛选
          </button>
        </div>

        {/* Section: 地点类型 */}
        <FilterSection
          title="地点类型"
          expanded={sectExpanded.types}
          onToggle={() => toggleSection("types")}
          allOn={allTypes.every((v) => filter.types.has(v))}
          onToggleAll={() => toggleAll("types", allTypes)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <CheckRow
              key={opt.value}
              checked={filter.types.has(opt.value)}
              onToggle={() => toggle("types", opt.value)}
              label={opt.label}
              indicator={
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: opt.value === "city" ? 2 : "50%",
                    background: opt.color,
                    border: `1.5px solid ${opt.border}`,
                    flexShrink: 0,
                  }}
                />
              }
            />
          ))}
        </FilterSection>

        {/* Section: 势力范围 */}
        <FilterSection
          title="势力范围"
          expanded={sectExpanded.factions}
          onToggle={() => toggleSection("factions")}
          allOn={allFactions.every((v) => filter.factions.has(v))}
          onToggleAll={() => toggleAll("factions", allFactions)}
        >
          {FACTION_OPTIONS.map((opt) => (
            <CheckRow
              key={opt.value}
              checked={filter.factions.has(opt.value)}
              onToggle={() => toggle("factions", opt.value)}
              label={opt.label}
            />
          ))}
        </FilterSection>

        {/* Section: 区域 */}
        <FilterSection
          title="区域划分"
          expanded={sectExpanded.zones}
          onToggle={() => toggleSection("zones")}
          allOn={allZones.every((v) => filter.zones.has(v))}
          onToggleAll={() => toggleAll("zones", allZones)}
        >
          {ALL_ZONES.map((opt) => (
            <CheckRow
              key={opt.value}
              checked={filter.zones.has(opt.value)}
              onToggle={() => toggle("zones", opt.value)}
              label={opt.label}
            />
          ))}
        </FilterSection>
      </div>

      {/* Toggle button — always visible on left edge */}
      <button
        onClick={() => setOpen((p) => !p)}
        title="筛选地点"
        style={{
          position: "absolute",
          left: open ? 260 : 0,
          top: toggleButtonTop,
          transform: "translateY(-50%)",
          zIndex: 46,
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          width: 28,
          height: 60,
          background: "rgba(14,10,4,0.9)",
          border: "1px solid rgba(180,140,60,0.4)",
          borderLeft: open ? "none" : "1px solid rgba(180,140,60,0.4)",
          borderRadius: open ? "0 6px 6px 0" : "0 6px 6px 0",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: "#C8A860",
        }}
      >
        <span
          title={`已筛选出 ${visibleCount} 个地点`}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#C8A860",
            color: "#1a1208",
            borderRadius: "50%",
            width: 16,
            height: 16,
            fontSize: 10,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {visibleCount}
        </span>
        <Filter size={12} />
        <ChevronRight size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.28s" }} />
      </button>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A collapsible section with select-all toggle. */
function FilterSection({
  title,
  expanded,
  onToggle,
  allOn,
  onToggleAll,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  allOn: boolean;
  onToggleAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid rgba(180,140,60,0.12)", flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "9px 16px",
          cursor: "pointer",
          gap: 6,
        }}
        onClick={onToggle}
      >
        <ChevronRight
          size={12}
          color="#7A6040"
          style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
        <span style={{ color: "#C8B898", fontSize: 12, fontWeight: "bold", flex: 1 }}>{title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleAll(); }}
          style={{
            fontSize: 10,
            color: "#7A6040",
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
      {expanded && (
        <div style={{ paddingBottom: 6 }}>{children}</div>
      )}
    </div>
  );
}

/** A single checkbox row. */
function CheckRow({
  checked,
  onToggle,
  label,
  indicator,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  indicator?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
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
          border: `1.5px solid ${checked ? "#C8A860" : "#4A3820"}`,
          background: checked ? "rgba(200,168,96,0.2)" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M1 4l2 2 4-4" stroke="#C8A860" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </div>
      {indicator}
      <span style={{ color: "#C8B898", fontSize: 12, lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}
