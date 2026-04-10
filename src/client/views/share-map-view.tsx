/**
 * @file share-map-view.tsx
 * @description Read-only map view for shared maps.
 * Reads #data=<base64> from the URL hash, decodes a MapProject,
 * and renders a fully interactive (pan/zoom/click) but read-only view.
 * Includes a filter panel for filtering markers by tag categories.
 *
 * How it works:
 * 1. On mount, read window.location.hash and decode the base64 MapProject
 * 2. Render pan/zoom map with all markers (filtered by filter state)
 * 3. Clicking a marker opens a read-only detail panel (no edit/delete/reposition)
 * 4. Legend is shown in bottom-left
 * 5. Filter panel on left edge allows filtering by all tag categories
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, X, Filter, ChevronRight, Eye, EyeOff } from "lucide-react";
import { MAP_THEMES } from "../types/intermap-types";
import { TagIconRenderer } from "../components/tag-icon-renderer";
import type { MapProject, MapLocation, TagCategory, TagValue, MapViewState } from "../types/intermap-types";

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

type TouchPoint = { clientX: number; clientY: number };
function getTouchDist(t1: TouchPoint, t2: TouchPoint) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function getTouchMid(t1: TouchPoint, t2: TouchPoint) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

type FilterState = Record<string, Set<string>>;

function buildDefaultFilter(cats: TagCategory[]): FilterState {
  const state: FilterState = {};
  cats.forEach((cat) => {
    state[cat.id] = new Set(cat.values.map((v) => v.id));
  });
  return state;
}

/** Single read-only marker pin */
function Marker({
  location, legendCategory, isSelected, onClick,
}: {
  location: MapLocation;
  legendCategory: TagCategory | null;
  isSelected: boolean;
  onClick: (loc: MapLocation) => void;
}) {
  const tagValueId = legendCategory ? location.tags[legendCategory.id] : undefined;
  const tagValue: TagValue | undefined = legendCategory?.values.find((v) => v.id === tagValueId);
  const icon = tagValue?.icon ?? { kind: "none" as const };
  const size = isSelected ? 22 : 15;
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
  const bgColor = opacityVal < 1 ? hexToRgba(baseColor, opacityVal) : baseColor;
  const normalBorder = customBorderColor ?? bgColor;
  const activeBorder = isSelected ? "#ffffff" : normalBorder;
  const glowColor = customBorderColor ?? baseColor;
  const borderRadius = shape === "square" ? 3 : shape === "diamond" ? 0 : size / 2;
  const transform = shape === "diamond" ? "translate(-50%, -50%) rotate(45deg)" : "translate(-50%, -50%)";

  return (
    <button
      style={{
        position: "absolute",
        left: `${location.x}%`,
        top: `${100 - location.y}%`,
        transform,
        width: size,
        height: size,
        borderRadius,
        backgroundColor: bgColor,
        border: `${isSelected ? 2.5 : 1.5}px solid ${activeBorder}`,
        cursor: "pointer",
        boxShadow: isSelected
          ? `0 0 0 3px rgba(255,255,255,0.6), 0 0 12px ${glowColor}`
          : (customBorderColor ? `0 0 6px ${customBorderColor}88, 0 1px 4px rgba(0,0,0,0.7)` : `0 1px 5px rgba(0,0,0,0.8)`),
        zIndex: isSelected ? 20 : 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
        transition: "width 0.15s, height 0.15s",
        overflow: "hidden",
      }}
      title={location.name}
      onClick={(e) => { e.stopPropagation(); onClick(location); }}
      aria-label={location.name}
    >
      {icon.kind === "emoji" && (
        <span style={{ fontSize: size * 0.65, lineHeight: 1 }}>{icon.emoji}</span>
      )}
    </button>
  );
}

/** Read-only detail panel */
function ReadOnlyDetailPanel({
  location, allCategories, theme, onClose,
}: {
  location: MapLocation;
  legendCategory: TagCategory | null;
  allCategories: TagCategory[];
  theme: import("../types/intermap-types").MapTheme;
  onClose: () => void;
}) {
  const divider = (
    <div style={{ height: 1, background: theme.accent, margin: "0 -16px", opacity: 0.5, flexShrink: 0 }} />
  );

  return (
    <div style={{
      position: "absolute",
      top: 0, right: 0, bottom: 0,
      width: 300,
      background: `${theme.bg}EE`,
      borderLeft: `1px solid ${theme.accent}`,
      display: "flex",
      flexDirection: "column",
      zIndex: 40,
      backdropFilter: "blur(8px)",
      overflow: "hidden",
      fontFamily: "Georgia, serif",
    }}>
      {/* ── Header: name + tags ── */}
      <div style={{ padding: "14px 16px 12px", flexShrink: 0, paddingRight: 36 }}>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 4 }}>
          <X size={16} />
        </button>
        <div style={{ fontSize: 17, fontWeight: "bold", color: theme.heading, marginBottom: 2 }}>
          {location.name}
        </div>
        {location.nameEn && (
          <div style={{ fontSize: 12, fontStyle: "italic", color: theme.muted, marginBottom: 10 }}>{location.nameEn}</div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {allCategories.map((cat) => {
            const tv = cat.values.find((v) => v.id === location.tags[cat.id]);
            if (!tv || tv.id === "none") return null;
            const isLegend = cat.isLegend;
            return (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 4, background: isLegend ? `${theme.primary}18` : "rgba(255,255,255,0.05)", borderRadius: 20, padding: "2px 8px", border: `1px solid ${isLegend ? theme.primary + "44" : "rgba(255,255,255,0.1)"}` }}>
                <TagIconRenderer icon={tv.icon} size={10} />
                <span style={{ fontSize: 11, color: isLegend ? theme.primary : theme.muted }}>{tv.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Location image (only when imageUrl is set) ── */}
      {location.imageUrl && (
        <div style={{ flexShrink: 0, overflow: "hidden", maxHeight: 180 }}>
          <img
            src={location.imageUrl}
            alt={location.name}
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Divider: tags/image ↔ description */}
      {divider}

      {/* ── Description (scrollable) ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {location.description ? (
          <p style={{ fontSize: 14, color: theme.heading, opacity: 0.9, lineHeight: 1.9, margin: 0, fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif', letterSpacing: "0.03em" }}>
            {location.description}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: theme.muted, opacity: 0.45, margin: 0, fontStyle: "italic" }}>暂无简介</p>
        )}
      </div>

      {/* Divider: description ↔ coordinates */}
      {divider}

      {/* ── Coordinates ── */}
      <div style={{ padding: "10px 16px 12px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5 }}>
          坐标: X={location.x.toFixed(1)}% · Y={location.y.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Standalone filter panel for the read-only share view.
 * Does not depend on the intermap store — receives tagCategories directly.
 */
function ShareFilterPanel({
  tagCategories, filter, onFilterChange, theme, visibleCount, totalCount,
}: {
  tagCategories: TagCategory[];
  filter: FilterState;
  onFilterChange: (next: FilterState) => void;
  theme: import("../types/intermap-types").MapTheme;
  visibleCount: number;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    tagCategories.forEach((c) => { next[c.id] = true; });
    setExpanded(next);
  }, [tagCategories.length]);

  const toggle = useCallback((catId: string, valueId: string) => {
    const prev = filter[catId] ?? new Set<string>();
    const next = new Set(prev);
    if (next.has(valueId)) next.delete(valueId); else next.add(valueId);
    onFilterChange({ ...filter, [catId]: next });
  }, [filter, onFilterChange]);

  const toggleAll = useCallback((cat: TagCategory) => {
    const allIds = cat.values.map((v) => v.id);
    const current = filter[cat.id] ?? new Set<string>();
    // allOn = all shown → click hides all (empty Set = hide all)
    // otherwise → show all
    const allOn = allIds.every((id) => current.has(id));
    onFilterChange({ ...filter, [cat.id]: allOn ? new Set<string>() : new Set(allIds) });
  }, [filter, onFilterChange]);

  const resetAll = useCallback(() => {
    onFilterChange(buildDefaultFilter(tagCategories));
  }, [tagCategories, onFilterChange]);

  const isFiltered = tagCategories.some((cat) => {
    const s = filter[cat.id];
    if (!s) return false;
    return !cat.values.every((v) => s.has(v.id));
  });

  const panelBg = theme.bg;
  const borderColor = theme.accent;
  const themeColor = theme.primary;
  const themeHeading = theme.heading;
  const themeMuted = theme.muted;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 44, background: "rgba(0,0,0,0.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sliding panel */}
      <div style={{
        position: "absolute", top: 0, left: 0, height: "100%", width: 260, zIndex: 45,
        transform: open ? "translateX(0)" : "translateX(-260px)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        background: `${panelBg}FA`,
        borderRight: `1px solid ${borderColor}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
        fontFamily: "Georgia, serif",
      }}>
        {/* Header */}
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${borderColor}44`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Filter size={14} color={themeColor} />
          <span style={{ color: themeHeading, fontWeight: "bold", fontSize: 14, flex: 1 }}>地点筛选</span>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: themeMuted, padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Reset */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${borderColor}22`, flexShrink: 0 }}>
          <button onClick={resetAll} style={{ fontSize: 11, color: themeMuted, background: "none", border: `1px solid ${borderColor}66`, borderRadius: 4, padding: "3px 10px", cursor: "pointer", width: "100%" }}>
            重置全部筛选
          </button>
        </div>

        {/* Sections */}
        {tagCategories.map((cat) => {
          const catFilter = filter[cat.id] ?? new Set<string>();
          const allOn = cat.values.every((v) => catFilter.has(v.id));
          const isExpanded = expanded[cat.id] ?? true;
          return (
            <div key={cat.id} style={{ borderBottom: `1px solid ${borderColor}22`, flexShrink: 0 }}>
              <div
                style={{ display: "flex", alignItems: "center", padding: "9px 16px", cursor: "pointer", gap: 6 }}
                onClick={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
              >
                <ChevronRight size={12} color={themeMuted}
                  style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                <span style={{ color: themeHeading, fontSize: 12, fontWeight: "bold", flex: 1, opacity: 0.9 }}>{cat.label}</span>
                {cat.isLegend && (
                  <span style={{ fontSize: 9, color: themeColor, background: `${themeColor}22`, borderRadius: 3, padding: "0 4px" }}>图例</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAll(cat); }}
                  style={{ fontSize: 10, color: themeMuted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: 0 }}
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
                      <div key={val.id} onClick={() => toggle(cat.id, val.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 16px 4px 28px", cursor: "pointer", opacity: checked ? 1 : 0.42, transition: "opacity 0.15s" }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${checked ? themeColor : "rgba(120,100,60,0.4)"}`, background: checked ? `${themeColor}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {checked && (
                            <svg width="8" height="8" viewBox="0 0 8 8">
                              <path d="M1 4l2 2 4-4" stroke={themeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <TagIconRenderer icon={val.icon} size={11} />
                        <span style={{ color: themeHeading, fontSize: 12, opacity: 0.85, lineHeight: 1.3 }}>{val.label}</span>
                      </div>
                    );
                  })}
                  {cat.values.length === 0 && (
                    <div style={{ padding: "4px 16px 4px 28px", fontSize: 11, color: themeMuted }}>暂无小分类</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen((p) => !p)}
        title="筛选地点"
        style={{
          position: "absolute",
          left: open ? 260 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 46,
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          width: 28, height: 60,
          background: `${panelBg}E8`,
          border: `1px solid ${borderColor}`,
          borderLeft: open ? "none" : `1px solid ${borderColor}`,
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 4, color: themeColor,
        }}
      >
        {isFiltered && (
          <span style={{ position: "absolute", top: -6, right: -6, background: themeColor, color: panelBg, borderRadius: 8, minWidth: 16, height: 16, padding: "0 3px", fontSize: 9, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>
            {visibleCount}/{totalCount}
          </span>
        )}
        <Filter size={12} />
        <ChevronRight size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.28s" }} />
      </button>
    </>
  );
}

/** Decode base64 url-safe data from hash */
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

/**
 * Fully interactive (pan/zoom + filter) but read-only shared map view.
 * Rendered at /share route.
 */
export function ShareMapView() {
  const [map] = useState<MapProject | null>(() => decodeMapFromHash());
  const theme = map ? (MAP_THEMES.find((t) => t.id === map.themeId) ?? MAP_THEMES[0]!) : MAP_THEMES[0]!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<MapViewState>({ scale: 1, translateX: 0, translateY: 0 });
  const [filter, setFilter] = useState<FilterState>(() => buildDefaultFilter(map?.tagCategories ?? []));

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
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

  const selectedLocation = map?.locations.find((l) => l.id === selectedId) ?? null;
  const legendCategory = map?.tagCategories.find((c) => c.isLegend) ?? null;

  // Filter visible locations — empty Set = hide all for that category
  const visibleLocations = map?.locations.filter((loc) => {
    if (!map) return true;
    return map.tagCategories.every((cat) => {
      const allowed = filter[cat.id];
      // undefined = not yet filtered, show all
      if (allowed === undefined) return true;
      // empty Set = "全隐", hide everything
      if (allowed.size === 0) return false;
      const tagVal = loc.tags[cat.id] ?? "none";
      return allowed.has(tagVal);
    });
  }) ?? [];

  const zoomBy = useCallback((delta: number, originX?: number, originY?: number) => {
    setView((prev) => {
      const container = containerRef.current;
      if (!container) return prev;
      const rect = container.getBoundingClientRect();
      const cx = originX ?? rect.width / 2;
      const cy = originY ?? rect.height / 2;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * delta));
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        translateX: cx - ratio * (cx - prev.translateX),
        translateY: cy - ratio * (cy - prev.translateY),
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

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchMoved.current = false;
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      touchPanActive.current = true;
      pinchActive.current = false;
      touchPanStart.current = { x: t.clientX, y: t.clientY };
      viewAtTouchPanStart.current = { translateX: view.translateX, translateY: view.translateY };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0]!; const t2 = e.touches[1]!;
      touchPanActive.current = false; pinchActive.current = true;
      pinchStartDist.current = getTouchDist(t1, t2);
      pinchStartScale.current = view.scale;
      const mid = getTouchMid(t1, t2);
      const rect = containerRef.current?.getBoundingClientRect();
      pinchStartMid.current = rect ? { x: mid.x - rect.left, y: mid.y - rect.top } : { x: mid.x, y: mid.y };
      viewAtPinchStart.current = { translateX: view.translateX, translateY: view.translateY };
    }
  }, [view.translateX, view.translateY, view.scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); touchMoved.current = true;
    if (e.touches.length === 1 && touchPanActive.current) {
      const t = e.touches[0]!;
      setView((prev) => ({
        ...prev,
        translateX: viewAtTouchPanStart.current.translateX + (t.clientX - touchPanStart.current.x),
        translateY: viewAtTouchPanStart.current.translateY + (t.clientY - touchPanStart.current.y),
      }));
    } else if (e.touches.length === 2 && pinchActive.current) {
      const t1 = e.touches[0]!; const t2 = e.touches[1]!;
      const dist = getTouchDist(t1, t2);
      if (pinchStartDist.current === 0) return;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * (dist / pinchStartDist.current)));
      const mid = pinchStartMid.current;
      const ratio = newScale / pinchStartScale.current;
      setView({ scale: newScale, translateX: mid.x - ratio * (mid.x - viewAtPinchStart.current.translateX), translateY: mid.y - ratio * (mid.y - viewAtPinchStart.current.translateY) });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchPanActive.current = false; pinchActive.current = false;
    if (!touchMoved.current && e.changedTouches.length === 1) {
      const target = e.target as HTMLElement;
      if (target.tagName !== "BUTTON") setSelectedId(null);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    const onTm = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTm, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("touchmove", onTm); };
  }, []);

  if (!map) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0b06", color: "#8A7050", fontFamily: "Georgia, serif", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div style={{ fontSize: 16 }}>无效的分享链接</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>链接可能已损坏或过期</div>
      </div>
    );
  }

  const primaryColor = theme.primary;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: theme.bg, fontFamily: "Georgia, serif", touchAction: "none" }}>
      {/* Title bar */}
      <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.5)", borderBottom: `1px solid ${theme.accent}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, minHeight: 44 }}>
        <div style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, letterSpacing: 1 }}>{map.name}</div>
        {map.nameEn && <div style={{ fontSize: 11, color: theme.muted, fontStyle: "italic" }}>{map.nameEn}</div>}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>{visibleLocations.length} / {map.locations.length} 个地点</div>
        {/* Read-only badge */}
        <div style={{ padding: "3px 8px", borderRadius: 4, background: `${primaryColor}18`, border: `1px solid ${primaryColor}44`, color: primaryColor, fontSize: 11 }}>👁️ 只读预览</div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Filter panel */}
        <ShareFilterPanel
          tagCategories={map.tagCategories}
          filter={filter}
          onFilterChange={setFilter}
          theme={theme}
          visibleCount={visibleLocations.length}
          totalCount={map.locations.length}
        />

        {/* Zoom controls */}
        <div style={{ position: "absolute", top: 12, left: 40, zIndex: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { icon: <ZoomIn size={14} />, fn: () => zoomBy(1.3), title: "放大" },
            { icon: <ZoomOut size={14} />, fn: () => zoomBy(1 / 1.3), title: "缩小" },
            { icon: <Maximize2 size={14} />, fn: () => setView({ scale: 1, translateX: 0, translateY: 0 }), title: "重置" },
          ].map(({ icon, fn, title }) => (
            <button key={title} onClick={fn} title={title}
              style={{ width: 34, height: 34, background: `${theme.bg}DD`, border: `1px solid ${theme.accent}`, borderRadius: 6, color: primaryColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
              {icon}
            </button>
          ))}
        </div>

        {/* Legend */}
        {legendCategory && (
          <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 40, background: `${theme.bg}EE`, border: `1px solid ${theme.accent}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: theme.muted, maxWidth: 160 }}>
            <div style={{ fontWeight: "bold", color: theme.heading, fontSize: 12, marginBottom: 6 }}>{legendCategory.label}</div>
            {legendCategory.values.map((val) => (
              <div key={val.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <TagIconRenderer icon={val.icon} size={10} />
                <span style={{ color: theme.heading, opacity: 0.8 }}>{val.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pan/zoom viewport */}
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", cursor: isPanning.current ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ transform: `translate(${view.translateX}px, ${view.translateY}px) scale(${view.scale})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>
            <div ref={mapRef} style={{ position: "relative", display: "inline-block" }}>
              {map.imageUrl ? (
                <img
                  src={map.imageUrl}
                  alt={map.name}
                  style={{ display: "block", width: "auto", height: "calc(100vh - 88px)", maxWidth: "none", pointerEvents: "none", userSelect: "none" }}
                  draggable={false}
                />
              ) : (
                <div style={{ width: "100vw", height: "calc(100vh - 88px)", background: theme.bg, backgroundImage: `linear-gradient(${theme.accent}22 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}22 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" }} />
              )}
              {visibleLocations.map((loc) => (
                <Marker
                  key={loc.id}
                  location={loc}
                  legendCategory={legendCategory}
                  isSelected={loc.id === selectedId}
                  onClick={(l) => setSelectedId(l.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Read-only detail panel */}
        {selectedLocation && (
          <ReadOnlyDetailPanel
            location={selectedLocation}
            legendCategory={legendCategory}
            allCategories={map.tagCategories}
            theme={theme}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
