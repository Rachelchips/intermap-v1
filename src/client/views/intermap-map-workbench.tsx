import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, PenLine, Trash2, X, Check, Tags, List, Download, Share2, Flag, ChevronDown, ChevronUp, MapPin, SlidersHorizontal } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import { TagIconRenderer } from "../components/tag-icon-renderer";
import { LocationEditor } from "../components/location-editor";
import { EventEditor } from "../components/event-editor";
import { TagManager } from "../components/tag-manager";
import { IntermapFilterPanel, buildDefaultIntermapFilter } from "../components/intermap-filter-panel";
import type { IntermapFilterState } from "../components/intermap-filter-panel";
import { LocationManagerPanel } from "../components/location-manager-panel";
import { EventManagerPanel } from "../components/event-manager-panel";
import type { MapEvent, MapLocation, MapTheme, MapViewState, TagCategory, TagValue } from "../types/intermap-types";
import { EVENT_LOCATION_CATEGORY_ID, NONE_TAG_VALUE_ID, formatEventTime } from "@/lib/intermap-helpers";

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

type TouchPoint = { clientX: number; clientY: number };

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

type RepositionTarget = null | { kind: "location" | "event"; id: string };
type LegendPanelKey = "location" | "event";
type LegendPanelState = {
  position: { x: number; y: number } | null;
  collapsed: boolean;
};

function getTouchDist(t1: TouchPoint, t2: TouchPoint): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMid(t1: TouchPoint, t2: TouchPoint) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

function getEventLocationId(eventItem: MapEvent): string | null {
  const value = eventItem.tags[EVENT_LOCATION_CATEGORY_ID];
  return value && value !== NONE_TAG_VALUE_ID ? value : null;
}

function getLegendCategory(categories: TagCategory[]): TagCategory | null {
  return categories.find((category) => category.isLegend) ?? null;
}

function matchesTagFilter(entity: { tags: Record<string, string> }, categories: TagCategory[], filterMap: Record<string, Set<string>>) {
  return categories.every((category) => {
    const allowed = filterMap[category.id];
    if (allowed === undefined) return true;
    if (allowed.size === 0) return false;
    const tagVal = entity.tags[category.id] ?? NONE_TAG_VALUE_ID;
    return allowed.has(tagVal);
  });
}

function Marker({
  entity,
  theme,
  legendCategory,
  isSelected,
  isRepositioning,
  scalePercent = 100,
  onClick,
  onDoubleClick,
  badgeCount,
  baseZIndex = 10,
}: {
  entity: MapLocation | MapEvent;
  theme: MapTheme;
  legendCategory: TagCategory | null;
  isSelected: boolean;
  isRepositioning: boolean;
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
  const bgColor = opacityVal < 1 ? hexToRgba(baseColor, opacityVal) : baseColor;
  const normalBorder = customBorderColor ?? bgColor;
  const activeBorder = isSelected ? "#ffffff" : normalBorder;
  const glowColor = customBorderColor ?? baseColor;
  const borderRadius = shape === "square" ? 3 : shape === "diamond" ? 0 : size / 2;
  const transform = shape === "diamond" ? "translate(-50%, -50%) rotate(45deg)" : "translate(-50%, -50%)";
  const emojiIcon = icon.kind === "emoji" ? icon : null;
  const emojiOpacity = emojiIcon?.bgOpacity ?? 1;
  const emojiBgColor = emojiIcon?.bgColor === null
    ? "transparent"
    : emojiIcon?.bgColor
      ? hexToRgba(emojiIcon.bgColor, emojiOpacity)
      : theme.primary;
  const emojiBorderColor = emojiIcon?.bgColor === null
    ? "transparent"
    : emojiIcon?.borderColor ?? emojiIcon?.bgColor ?? theme.primary;
  const markerBackground = isShape ? bgColor : emojiBgColor;
  const markerBorder = isShape ? activeBorder : (isSelected ? "#ffffff" : emojiBorderColor);
  const markerShadow = isShape
    ? (isSelected
      ? `0 0 0 3px rgba(255,255,255,0.6), 0 0 12px ${glowColor}`
      : (customBorderColor ? `0 0 6px ${customBorderColor}88, 0 1px 4px rgba(0,0,0,0.7)` : `0 1px 5px rgba(0,0,0,0.8)`))
    : (isSelected
      ? `0 0 0 3px rgba(255,255,255,0.6), 0 0 12px ${emojiBorderColor}`
      : "0 1px 5px rgba(0,0,0,0.55)");

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
        backgroundColor: markerBackground,
        border: `${isSelected ? 2.5 : 1.5}px solid ${markerBorder}`,
        cursor: isRepositioning ? "crosshair" : "pointer",
        boxShadow: markerShadow,
        zIndex: isSelected ? baseZIndex + 10 : baseZIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
        pointerEvents: isRepositioning && !isSelected ? "none" : "auto",
        transition: "width 0.15s, height 0.15s",
        overflow: "visible",
      }}
      title={entity.name}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onDoubleClick={onDoubleClick ? (e) => { e.stopPropagation(); onDoubleClick(); } : undefined}
      aria-label={entity.name}
    >
      {icon.kind === "emoji" && (
        <span style={{ fontSize: size * 0.65, lineHeight: 1 }}>{icon.emoji}</span>
      )}
      {typeof badgeCount === "number" && badgeCount > 0 && (
        <span style={{
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
        }}>
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function SelectionHint({ color }: { color: string }) {
  return (
    <div style={{
      position: "absolute",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.75)",
      border: `1px solid ${color}88`,
      borderRadius: 8,
      padding: "8px 16px",
      color,
      fontSize: 13,
      zIndex: 50,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      点击地图上的新位置来移动
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
              <TagIconRenderer icon={value.icon} size={10} themeColor={theme.primary} />
              <span style={{ color: theme.heading, opacity: 0.8 }}>{value.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function detailButtonStyle(color: string): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 7,
    border: `1px solid ${color}66`,
    background: `${color}18`,
    color,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    display: "flex",
    alignItems: "center",
    gap: 5,
    transition: "all 0.15s",
  };
}

function scaleTinyButton(theme: MapTheme): React.CSSProperties {
  return {
    height: 22,
    padding: "0 7px",
    borderRadius: 6,
    border: `1px solid ${theme.accent}`,
    background: `${theme.primary}14`,
    color: theme.primary,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function topBarStyle(theme: MapTheme): React.CSSProperties {
  const isLight = theme.bg === theme.modes.light.bg;
  return {
    padding: "8px 14px",
    background: isLight ? theme.bg : `${theme.bg}F2`,
    borderBottom: `1px solid ${theme.accent}`,
    boxShadow: isLight ? `0 1px 0 ${theme.accent}55` : "0 8px 20px rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
    minHeight: 44,
  };
}

function EntityDetailPanel({
  entity,
  categories,
  theme,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onEdit,
  onDelete,
  onReposition,
  repositioning,
  onConfirmReposition,
  deleteLabel,
  extraSection,
  headerMeta,
}: {
  entity: MapLocation | MapEvent;
  categories: TagCategory[];
  theme: MapTheme;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReposition: () => void;
  repositioning: boolean;
  onConfirmReposition: () => void;
  deleteLabel: string;
  extraSection?: React.ReactNode;
  headerMeta?: string | null;
}) {
  const divider = (
    <div style={{ height: 1, background: theme.accent, margin: "0 -16px", opacity: 0.5, flexShrink: 0 }} />
  );

  return (
    <div style={{
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
      overflow: "hidden",
      fontFamily: "Georgia, serif",
    }}>
      <div style={{ padding: "14px 16px 12px", flexShrink: 0, paddingRight: 96 }}>
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          style={{ position: "absolute", top: 10, right: 58, background: "none", border: "none", color: canGoPrevious ? theme.muted : `${theme.muted}66`, cursor: canGoPrevious ? "pointer" : "not-allowed", padding: 4 }}
        >
          ↑
        </button>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          style={{ position: "absolute", top: 10, right: 34, background: "none", border: "none", color: canGoNext ? theme.muted : `${theme.muted}66`, cursor: canGoNext ? "pointer" : "not-allowed", padding: 4 }}
        >
          ↓
        </button>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: theme.muted, cursor: "pointer", padding: 4 }}>
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
          <div style={{ fontSize: 12, fontStyle: "italic", color: theme.muted, marginBottom: 10 }}>{entity.nameEn}</div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {categories.map((cat) => {
            const value = cat.values.find((item) => item.id === entity.tags[cat.id]);
            if (!value || value.id === NONE_TAG_VALUE_ID) return null;
            return (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 4, background: cat.isLegend ? `${theme.primary}18` : "rgba(255,255,255,0.05)", borderRadius: 20, padding: "2px 8px", border: `1px solid ${cat.isLegend ? `${theme.primary}44` : "rgba(255,255,255,0.1)"}` }}>
                <TagIconRenderer icon={value.icon} size={10} themeColor={theme.primary} />
                <span style={{ fontSize: 11, color: cat.isLegend ? theme.primary : theme.muted }}>{value.label}</span>
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
          <p style={{ fontSize: 14, color: theme.heading, opacity: 0.9, lineHeight: 1.9, margin: 0, fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif", serif', letterSpacing: "0.03em" }}>
            {entity.description}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: theme.muted, opacity: 0.45, margin: 0, fontStyle: "italic" }}>暂无简介</p>
        )}
      </div>

      {divider}

      <div style={{ padding: "8px 16px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5 }}>
          坐标: X={entity.x.toFixed(1)}% · Y={entity.y.toFixed(1)}%
        </span>
      </div>

      {extraSection ? divider : null}
      {extraSection}
      {extraSection ? divider : null}

      <div style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {repositioning ? (
          <button onClick={onConfirmReposition} style={detailButtonStyle(theme.primary)}>
            <Check size={13} /> 取消移动
          </button>
        ) : (
          <button onClick={onReposition} style={detailButtonStyle(theme.primary)}>
            <Maximize2 size={13} /> 修改位置
          </button>
        )}
        <button onClick={onEdit} style={detailButtonStyle(theme.primary)}>
          <PenLine size={13} /> 编辑信息
        </button>
        <button onClick={onDelete} style={detailButtonStyle("#C86060")}>
          <Trash2 size={13} /> {deleteLabel}
        </button>
      </div>
    </div>
  );
}

export function IntermapMapView() {
  const { activeMap, theme, dispatch } = useIntermap();
  const [imgError, setImgError] = useState(false);
  const [view, setView] = useState<MapViewState>({ scale: 1, translateX: 0, translateY: 0 });
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [filter, setFilter] = useState<IntermapFilterState>({ locations: {}, events: {} });
  const [panelRoute, setPanelRoute] = useState<PanelRoute>(null);
  const [repositioning, setRepositioning] = useState<RepositionTarget>(null);
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<MapLocation | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<MapEvent | undefined>(undefined);
  const [visibleLocationManagerIds, setVisibleLocationManagerIds] = useState<string[]>([]);
  const [visibleEventManagerIds, setVisibleEventManagerIds] = useState<string[]>([]);
  const [eventDisplayMode, setEventDisplayMode] = useState<"expanded" | "collapsed">("expanded");
  const [expandedEventLocationId, setExpandedEventLocationId] = useState<string | null>(null);
  const [temporaryFocusedEventId, setTemporaryFocusedEventId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [legendPanels, setLegendPanels] = useState<Record<LegendPanelKey, LegendPanelState>>({
    location: { position: null, collapsed: false },
    event: { position: null, collapsed: false },
  });
  const [iconScale, setIconScale] = useState<{ location: number; event: number }>({
    location: activeMap?.markerScale?.location ?? 100,
    event: activeMap?.markerScale?.event ?? 100,
  });
  const [iconScalePanelOpen, setIconScalePanelOpen] = useState(false);

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

  useEffect(() => {
    if (!activeMap) return;
    setImgError(false);
    setView({ scale: 1, translateX: 0, translateY: 0 });
    setPanelRoute(null);
    setRepositioning(null);
    setLocationEditorOpen(false);
    setEventEditorOpen(false);
    setEditingLocation(undefined);
    setEditingEvent(undefined);
    setVisibleLocationManagerIds([]);
    setVisibleEventManagerIds([]);
    setEventDisplayMode("expanded");
    setExpandedEventLocationId(null);
    setTemporaryFocusedEventId(null);
    setFilter(buildDefaultIntermapFilter(activeMap.tagCategories, activeMap.eventTagCategories));
    setLegendPanels({
      location: { position: null, collapsed: false },
      event: { position: null, collapsed: false },
    });
    setIconScale({
      location: activeMap.markerScale?.location ?? 100,
      event: activeMap.markerScale?.event ?? 100,
    });
  }, [activeMap?.id]);

  useEffect(() => {
    if (!activeMap) return;
    const currentLocationScale = activeMap.markerScale?.location ?? 100;
    const currentEventScale = activeMap.markerScale?.event ?? 100;
    if (currentLocationScale === iconScale.location && currentEventScale === iconScale.event) return;
    dispatch({
      type: "UPDATE_MARKER_SCALE",
      mapId: activeMap.id,
      markerScale: {
        location: iconScale.location,
        event: iconScale.event,
      },
    });
  }, [activeMap, dispatch, iconScale.event, iconScale.location]);

  const locationCatSignature = activeMap?.tagCategories.map((cat) => `${cat.id}:${cat.values.map((value) => value.id).join(",")}`).join("|") ?? "";
  const eventCatSignature = activeMap?.eventTagCategories.map((cat) => `${cat.id}:${cat.values.map((value) => value.id).join(",")}`).join("|") ?? "";

  useEffect(() => {
    if (!activeMap) return;
    setFilter((prev) => {
      const next = { ...prev, locations: { ...prev.locations }, events: { ...prev.events } };

      activeMap.tagCategories.forEach((cat) => {
        if (!next.locations[cat.id]) {
          next.locations[cat.id] = new Set(cat.values.map((value) => value.id));
        } else {
          cat.values.forEach((value) => next.locations[cat.id]!.add(value.id));
        }
      });

      activeMap.eventTagCategories.forEach((cat) => {
        if (!next.events[cat.id]) {
          next.events[cat.id] = new Set(cat.values.map((value) => value.id));
        } else {
          cat.values.forEach((value) => next.events[cat.id]!.add(value.id));
        }
      });

      return next;
    });
  }, [activeMap, eventCatSignature, locationCatSignature]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const startLegendDrag = useCallback((key: LegendPanelKey, clientX: number, clientY: number) => {
    const mapAreaEl = mapAreaRef.current;
    const legendEl = legendRefs.current[key];
    if (!mapAreaEl || !legendEl) return;

    const mapRect = mapAreaEl.getBoundingClientRect();
    const legendRect = legendEl.getBoundingClientRect();
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

      const mapAreaEl = mapAreaRef.current;
      const legendEl = legendRefs.current[key];
      if (!mapAreaEl || !legendEl) return;

      const dx = e.clientX - legendDragStart.current.mx;
      const dy = e.clientY - legendDragStart.current.my;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

      const mapRect = mapAreaEl.getBoundingClientRect();
      const legendRect = legendEl.getBoundingClientRect();
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

  if (!activeMap || !theme) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0b06", color: "#8A7050", fontFamily: "Georgia, serif", fontSize: 16 }}>
        请从左侧选择或创建一个地图
      </div>
    );
  }

  const locationLegendCategory = getLegendCategory(activeMap.tagCategories);
  const eventLegendCategory = getLegendCategory(activeMap.eventTagCategories);

  const visibleLocations = activeMap.locations.filter((location) => matchesTagFilter(location, activeMap.tagCategories, filter.locations));
  const filteredEvents = activeMap.events.filter((eventItem) => matchesTagFilter(eventItem, activeMap.eventTagCategories, filter.events));

  let visibleEvents: MapEvent[] = [];
  if (eventDisplayMode === "expanded") {
    visibleEvents = filteredEvents;
  } else if (temporaryFocusedEventId) {
    visibleEvents = activeMap.events.filter((eventItem) => eventItem.id === temporaryFocusedEventId);
  } else if (expandedEventLocationId) {
    visibleEvents = filteredEvents.filter((eventItem) => getEventLocationId(eventItem) === expandedEventLocationId);
  }

  const eventCountByLocation = new Map<string, number>();
  activeMap.events.forEach((eventItem) => {
    const locationId = getEventLocationId(eventItem);
    if (!locationId) return;
    eventCountByLocation.set(locationId, (eventCountByLocation.get(locationId) ?? 0) + 1);
  });

  const currentLocationDetail = panelRoute?.kind === "location-detail" ? panelRoute : null;
  const currentEventDetail = panelRoute?.kind === "event-detail" ? panelRoute : null;
  const selectedLocation = currentLocationDetail
    ? activeMap.locations.find((location) => location.id === currentLocationDetail.locationId) ?? null
    : null;
  const selectedEvent = currentEventDetail
    ? activeMap.events.find((eventItem) => eventItem.id === currentEventDetail.eventId) ?? null
    : null;

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

  const updateEntityPosition = useCallback((clientX: number, clientY: number) => {
    if (!repositioning) return;
    const mapEl = mapRef.current;
    if (!mapEl) return;
    const rect = mapEl.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = 100 - ((clientY - rect.top) / rect.height) * 100;
    const roundedX = Math.round(xPct * 10) / 10;
    const roundedY = Math.round(yPct * 10) / 10;

    if (repositioning.kind === "location") {
      const location = activeMap.locations.find((item) => item.id === repositioning.id);
      if (!location) return;
      dispatch({ type: "UPDATE_LOCATION", mapId: activeMap.id, location: { ...location, x: roundedX, y: roundedY } });
    } else {
      const eventItem = activeMap.events.find((item) => item.id === repositioning.id);
      if (!eventItem) return;
      dispatch({ type: "UPDATE_EVENT", mapId: activeMap.id, event: { ...eventItem, x: roundedX, y: roundedY } });
    }

    setRepositioning(null);
  }, [activeMap, dispatch, repositioning]);

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
    if (repositioning) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    viewAtPanStart.current = { translateX: view.translateX, translateY: view.translateY };
    e.preventDefault();
  }, [repositioning, view.translateX, view.translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setView((prev) => ({
      ...prev,
      translateX: viewAtPanStart.current.translateX + (e.clientX - panStart.current.x),
      translateY: viewAtPanStart.current.translateY + (e.clientY - panStart.current.y),
    }));
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleMapClick = useCallback((e: React.MouseEvent) => {
    if (!repositioning) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON") return;
    updateEntityPosition(e.clientX, e.clientY);
  }, [repositioning, updateEntityPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchMoved.current = false;
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      touchPanActive.current = true;
      pinchActive.current = false;
      touchPanStart.current = { x: t.clientX, y: t.clientY };
      viewAtTouchPanStart.current = { translateX: view.translateX, translateY: view.translateY };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0]!;
      const t2 = e.touches[1]!;
      touchPanActive.current = false;
      pinchActive.current = true;
      pinchStartDist.current = getTouchDist(t1, t2);
      pinchStartScale.current = view.scale;
      const mid = getTouchMid(t1, t2);
      const rect = containerRef.current?.getBoundingClientRect();
      pinchStartMid.current = rect ? { x: mid.x - rect.left, y: mid.y - rect.top } : { x: mid.x, y: mid.y };
      viewAtPinchStart.current = { translateX: view.translateX, translateY: view.translateY };
    }
  }, [view.scale, view.translateX, view.translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchMoved.current = true;
    if (e.touches.length === 1 && touchPanActive.current && !repositioning) {
      const t = e.touches[0]!;
      setView((prev) => ({
        ...prev,
        translateX: viewAtTouchPanStart.current.translateX + (t.clientX - touchPanStart.current.x),
        translateY: viewAtTouchPanStart.current.translateY + (t.clientY - touchPanStart.current.y),
      }));
    } else if (e.touches.length === 2 && pinchActive.current) {
      const t1 = e.touches[0]!;
      const t2 = e.touches[1]!;
      const dist = getTouchDist(t1, t2);
      if (pinchStartDist.current === 0) return;
      const scaleRatio = dist / pinchStartDist.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * scaleRatio));
      const mid = pinchStartMid.current;
      const overallRatio = newScale / pinchStartScale.current;
      setView({
        scale: newScale,
        translateX: mid.x - overallRatio * (mid.x - viewAtPinchStart.current.translateX),
        translateY: mid.y - overallRatio * (mid.y - viewAtPinchStart.current.translateY),
      });
    }
  }, [repositioning]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchPanActive.current = false;
    pinchActive.current = false;
    if (!touchMoved.current && e.changedTouches.length === 1 && repositioning) {
      const t = e.changedTouches[0]!;
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON") return;
      updateEntityPosition(t.clientX, t.clientY);
    }
  }, [repositioning, updateEntityPosition]);

  const closePanel = () => {
    if (!panelRoute) return;
    if (panelRoute.kind === "location-manager" || panelRoute.kind === "event-manager") {
      setPanelRoute(null);
      return;
    }

    if (panelRoute.kind === "location-detail") {
      setRepositioning(null);
      setPanelRoute(panelRoute.backTo === "location-manager" ? { kind: "location-manager" } : null);
      return;
    }

    if (panelRoute.backTo && typeof panelRoute.backTo === "object" && panelRoute.backTo.clearTemporaryFocus) {
      setTemporaryFocusedEventId(null);
    }
    setRepositioning(null);
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
    setRepositioning(null);
    setPanelRoute({ kind: "location-detail", locationId, backTo });
  };

  const openEventDetail = (eventId: string, backTo: EventDetailRoute["backTo"] = null) => {
    setRepositioning(null);
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

  const compressImage = useCallback((src: string, maxWidth = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(src); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = src;
    });
  }, []);

  const handleExport = useCallback(() => {
    const mapForExport = {
      ...activeMap,
      markerScale: { location: iconScale.location, event: iconScale.event },
    };
    const json = JSON.stringify(mapForExport, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMap.name || "map"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeMap, iconScale.event, iconScale.location]);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const compressedLocations = await Promise.all(
        activeMap.locations.map(async (location) => {
          if (!location.imageUrl) return location;
          try {
            const compressed = await compressImage(location.imageUrl);
            return { ...location, imageUrl: compressed };
          } catch {
            const { imageUrl: _dropped, ...rest } = location;
            return rest;
          }
        })
      );

      const compressedEvents = await Promise.all(
        activeMap.events.map(async (eventItem) => {
          if (!eventItem.imageUrl) return eventItem;
          try {
            const compressed = await compressImage(eventItem.imageUrl);
            return { ...eventItem, imageUrl: compressed };
          } catch {
            const { imageUrl: _dropped, ...rest } = eventItem;
            return rest;
          }
        })
      );

      const mapForShare = {
        ...activeMap,
        markerScale: { location: iconScale.location, event: iconScale.event },
        locations: compressedLocations,
        events: compressedEvents,
      };
      const json = JSON.stringify(mapForShare);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url = `${window.location.origin}/share#data=${encoded}`;
      const hasImages = activeMap.locations.some((item) => !!item.imageUrl) || activeMap.events.some((item) => !!item.imageUrl);
      const imageNote = hasImages ? "\n\n地点/事件配图已自动压缩以缩小链接大小（本地存储的原图不受影响）。" : "";

      navigator.clipboard.writeText(url).then(() => {
        alert(`分享链接已复制到剪贴板！\n\n对方打开链接后可以只读浏览这张地图。${imageNote}`);
      }).catch(() => {
        prompt("复制下方链接以分享地图：", url);
      });
    } catch {
      alert("生成分享链接失败，地图数据可能过大。");
    } finally {
      setIsSharing(false);
    }
  }, [activeMap, compressImage, iconScale.event, iconScale.location, isSharing]);

  const relatedEvents = selectedLocation
    ? activeMap.events.filter((eventItem) => getEventLocationId(eventItem) === selectedLocation.id)
    : [];

  const locationManagerIndex = currentLocationDetail?.backTo === "location-manager" && selectedLocation
    ? visibleLocationManagerIds.indexOf(selectedLocation.id)
    : -1;
  const previousLocationId = locationManagerIndex > 0 ? visibleLocationManagerIds[locationManagerIndex - 1] ?? null : null;
  const nextLocationId = locationManagerIndex >= 0 && locationManagerIndex < visibleLocationManagerIds.length - 1
    ? visibleLocationManagerIds[locationManagerIndex + 1] ?? null
    : null;

  const eventManagerIndex = currentEventDetail?.backTo === "event-manager" && selectedEvent
    ? visibleEventManagerIds.indexOf(selectedEvent.id)
    : -1;
  const previousEventId = eventManagerIndex > 0 ? visibleEventManagerIds[eventManagerIndex - 1] ?? null : null;
  const nextEventId = eventManagerIndex >= 0 && eventManagerIndex < visibleEventManagerIds.length - 1
    ? visibleEventManagerIds[eventManagerIndex + 1] ?? null
    : null;

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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.bg, position: "relative", touchAction: "none" }}>
      <div style={topBarStyle(theme)}>
        <div style={{ fontSize: 15, fontWeight: "bold", color: theme.heading, letterSpacing: 1 }}>
          {activeMap.name}
        </div>
        {activeMap.nameEn && (
          <div style={{ fontSize: 11, color: theme.muted, fontStyle: "italic" }}>{activeMap.nameEn}</div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>{activeMap.events.length} 个事件</div>
        <div style={{ fontSize: 11, color: theme.muted, opacity: 0.7 }}>{activeMap.locations.length} 个地点</div>
        <button onClick={handleExport} title="把这张地图导出为 JSON 文件" style={{ padding: "5px 10px", background: `${theme.primary}15`, border: `1px solid ${theme.primary}44`, borderRadius: 6, color: theme.primary, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Georgia, serif" }}>
          <Download size={13} />
          导出
        </button>
        <button onClick={handleShare} disabled={isSharing} title="生成只读分享链接（配图会自动压缩）" style={{ padding: "5px 10px", background: `${theme.primary}15`, border: `1px solid ${theme.primary}44`, borderRadius: 6, color: isSharing ? theme.muted : theme.primary, cursor: isSharing ? "wait" : "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Georgia, serif", opacity: isSharing ? 0.6 : 1 }}>
          <Share2 size={13} />
          {isSharing ? "生成中…" : "分享"}
        </button>
        <button onClick={() => setTagManagerOpen(true)} style={{ padding: "5px 10px", background: `${theme.primary}15`, border: `1px solid ${theme.primary}44`, borderRadius: 6, color: theme.primary, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Georgia, serif" }}>
          <Tags size={13} />
          标签管理
        </button>
        <button
          onClick={() => { setPanelRoute(panelRoute?.kind === "location-manager" ? null : { kind: "location-manager" }); setRepositioning(null); }}
          style={{ padding: "5px 10px", background: panelRoute?.kind === "location-manager" ? `${theme.primary}30` : `${theme.primary}20`, border: `1px solid ${panelRoute?.kind === "location-manager" ? theme.primary : `${theme.primary}66`}`, borderRadius: 6, color: theme.primary, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Georgia, serif" }}
        >
          <List size={13} />
          地点管理
        </button>
        <button
          onClick={() => { setPanelRoute(panelRoute?.kind === "event-manager" ? null : { kind: "event-manager" }); setRepositioning(null); }}
          style={{ padding: "5px 10px", background: panelRoute?.kind === "event-manager" ? `${theme.primary}30` : `${theme.primary}20`, border: `1px solid ${panelRoute?.kind === "event-manager" ? theme.primary : `${theme.primary}66`}`, borderRadius: 6, color: theme.primary, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Georgia, serif" }}
        >
          <Flag size={13} />
          事件管理
        </button>
      </div>

      <div ref={mapAreaRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 12, left: 44, zIndex: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { icon: <ZoomIn size={14} />, fn: () => zoomBy(1.3), title: "放大" },
            { icon: <ZoomOut size={14} />, fn: () => zoomBy(1 / 1.3), title: "缩小" },
            { icon: <Maximize2 size={14} />, fn: () => setView({ scale: 1, translateX: 0, translateY: 0 }), title: "重置" },
          ].map(({ icon, fn, title }) => (
            <button key={title} onClick={fn} title={title}
              style={{ width: 34, height: 34, background: `${theme.bg}DD`, border: `1px solid ${theme.accent}`, borderRadius: 6, color: theme.primary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
              {icon}
            </button>
          ))}
          <button
            onClick={() => setIconScalePanelOpen((prev) => !prev)}
            title="图标大小设置"
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
            <SlidersHorizontal size={14} />
          </button>
          {iconScalePanelOpen && (
            <div
              style={{
                width: 248,
                marginTop: 4,
                background: `${theme.bg}F2`,
                border: `1px solid ${theme.accent}`,
                borderRadius: 8,
                padding: "10px 10px 8px",
                boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
              }}
            >
              {([
                { key: "location" as const, label: "地点图标", icon: <MapPin size={11} /> },
                { key: "event" as const, label: "事件图标", icon: <Flag size={11} /> },
              ]).map((item) => (
                <div key={item.key} style={{ marginBottom: item.key === "event" ? 0 : 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ color: theme.primary, display: "flex", alignItems: "center" }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: theme.heading, flex: 1 }}>{item.label}</span>
                    <button
                      onClick={() =>
                        setIconScale((prev) => ({
                          ...prev,
                          [item.key]: Math.max(40, prev[item.key] - 5),
                        }))
                      }
                      style={scaleTinyButton(theme)}
                      title="缩小"
                    >
                      -
                    </button>
                    <button
                      onClick={() =>
                        setIconScale((prev) => ({
                          ...prev,
                          [item.key]: Math.min(260, prev[item.key] + 5),
                        }))
                      }
                      style={scaleTinyButton(theme)}
                      title="放大"
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        setIconScale((prev) => ({
                          ...prev,
                          [item.key]: 100,
                        }))
                      }
                      style={scaleTinyButton(theme)}
                      title="还原"
                    >
                      还原
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min={40}
                      max={260}
                      step={1}
                      value={iconScale[item.key]}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setIconScale((prev) => ({ ...prev, [item.key]: next }));
                      }}
                      style={{ flex: 1, accentColor: theme.primary }}
                    />
                    <input
                      type="number"
                      min={40}
                      max={260}
                      value={iconScale[item.key]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isNaN(value)) return;
                        const next = Math.max(40, Math.min(260, value));
                        setIconScale((prev) => ({ ...prev, [item.key]: next }));
                      }}
                      style={{
                        width: 60,
                        padding: "3px 6px",
                        background: "rgba(255,255,255,0.05)",
                        border: `1px solid ${theme.accent}`,
                        borderRadius: 6,
                        color: theme.heading,
                        fontSize: 11,
                        outline: "none",
                        fontFamily: "Georgia, serif",
                      }}
                    />
                    <span style={{ color: theme.muted, fontSize: 11 }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 12, left: 44, zIndex: 40, display: "flex", flexDirection: "column", gap: 8 }}>
          {locationLegendCategory && !legendPanels.location.position && renderLegend("location", "地点图例", locationLegendCategory)}
          {activeMap.events.length > 0 && eventLegendCategory && !legendPanels.event.position && renderLegend("event", "事件图例", eventLegendCategory)}
        </div>

        {locationLegendCategory && legendPanels.location.position && renderLegend("location", "地点图例", locationLegendCategory)}
        {activeMap.events.length > 0 && eventLegendCategory && legendPanels.event.position && renderLegend("event", "事件图例", eventLegendCategory)}

        {repositioning && <SelectionHint color={theme.primary} />}

        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", cursor: repositioning ? "crosshair" : isPanning.current ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
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
            <div ref={mapRef} style={{ position: "relative", display: "inline-block" }} onClick={handleMapClick}>
              {activeMap.imageUrl && !imgError ? (
                <img
                  src={activeMap.imageUrl}
                  alt={activeMap.name}
                  style={{ display: "block", width: "auto", height: "calc(100vh - 88px)", maxWidth: "none", pointerEvents: "none", userSelect: "none", opacity: 1 }}
                  draggable={false}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  style={{
                    width: "calc(100vw - 56px)",
                    height: "calc(100vh - 88px)",
                    background: theme.bg,
                    backgroundImage: `linear-gradient(${theme.accent}22 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}22 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <div style={{ fontSize: 32, opacity: 0.25 }}>🗺️</div>
                  <div style={{ fontSize: 13, color: theme.muted, opacity: 0.6 }}>{imgError ? "底图加载失败" : "尚未设置底图"}</div>
                  <div style={{ fontSize: 11, color: theme.muted, opacity: 0.4 }}>{imgError ? "请检查图片链接是否正确" : "双击左侧地图图标可设置底图"}</div>
                </div>
              )}

              {visibleLocations.map((location) => (
                <Marker
                  key={location.id}
                  entity={location}
                  theme={theme}
                  legendCategory={locationLegendCategory}
                  isSelected={selectedLocation?.id === location.id}
                  isRepositioning={!!repositioning}
                  scalePercent={iconScale.location}
                  badgeCount={eventDisplayMode === "collapsed" ? eventCountByLocation.get(location.id) : undefined}
                  onClick={() => openLocationDetail(location.id, null)}
                  onDoubleClick={() => toggleCollapsedEventsForLocation(location.id)}
                />
              ))}

              {visibleEvents.map((eventItem) => (
                <Marker
                  key={eventItem.id}
                  entity={eventItem}
                  theme={theme}
                  legendCategory={eventLegendCategory}
                  isSelected={selectedEvent?.id === eventItem.id}
                  isRepositioning={!!repositioning}
                  scalePercent={iconScale.event}
                  baseZIndex={20}
                  onClick={() => openEventDetail(eventItem.id, null)}
                />
              ))}
            </div>
          </div>
        </div>

        <IntermapFilterPanel
          filter={filter}
          onFilterChange={setFilter}
          visibleLocationCount={visibleLocations.length}
          totalLocationCount={activeMap.locations.length}
          visibleEventCount={visibleEvents.length}
          totalEventCount={activeMap.events.length}
          themeColor={theme.primary}
          themeHeading={theme.heading}
          themeBg={theme.bg}
          themeAccent={theme.accent}
          themeMuted={theme.muted}
        />

        {(panelRoute?.kind === "location-manager" || (currentLocationDetail?.backTo === "location-manager")) && (
          <LocationManagerPanel
            theme={theme}
            onClose={() => setPanelRoute(null)}
            onSelectLocation={(location) => openLocationDetail(location.id, "location-manager")}
            onAddLocation={() => {
              setEditingLocation(undefined);
              setLocationEditorOpen(true);
            }}
            onVisibleLocationsChange={(locations) => setVisibleLocationManagerIds(locations.map((location) => location.id))}
          />
        )}

        {(panelRoute?.kind === "event-manager" || (currentEventDetail?.backTo === "event-manager")) && (
          <EventManagerPanel
            theme={theme}
            onClose={() => setPanelRoute(null)}
            onSelectEvent={(eventItem) => openEventDetail(eventItem.id, "event-manager")}
            onAddEvent={() => {
              setEditingEvent(undefined);
              setEventEditorOpen(true);
            }}
            displayMode={eventDisplayMode}
            onDisplayModeChange={(mode) => {
              setEventDisplayMode(mode);
              if (mode === "expanded") setTemporaryFocusedEventId(null);
            }}
            onVisibleEventsChange={(events) => setVisibleEventManagerIds(events.map((eventItem) => eventItem.id))}
          />
        )}

        {selectedLocation && currentLocationDetail && (
          <EntityDetailPanel
            entity={selectedLocation}
            categories={activeMap.tagCategories}
            theme={theme}
            onClose={closePanel}
            onPrevious={previousLocationId ? () => openLocationDetail(previousLocationId, "location-manager") : undefined}
            onNext={nextLocationId ? () => openLocationDetail(nextLocationId, "location-manager") : undefined}
            canGoPrevious={!!previousLocationId}
            canGoNext={!!nextLocationId}
            onEdit={() => { setEditingLocation(selectedLocation); setLocationEditorOpen(true); }}
            onDelete={() => {
              if (!confirm(`确定删除「${selectedLocation.name}」？`)) return;
              dispatch({ type: "DELETE_LOCATION", mapId: activeMap.id, locationId: selectedLocation.id });
              setPanelRoute(currentLocationDetail.backTo === "location-manager" ? { kind: "location-manager" } : null);
            }}
            onReposition={() => setRepositioning({ kind: "location", id: selectedLocation.id })}
            repositioning={repositioning?.kind === "location" && repositioning.id === selectedLocation.id}
            onConfirmReposition={() => setRepositioning(null)}
            deleteLabel="删除地点"
            extraSection={
              <div style={{ padding: "10px 16px", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 0.5, marginBottom: 8 }}>所属事件</div>
                {relatedEvents.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {relatedEvents.map((eventItem) => (
                      <button
                        key={eventItem.id}
                        onClick={() => handleLocationEventClick(eventItem)}
                        style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${theme.primary}44`, background: `${theme.primary}14`, color: theme.heading, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <TagIconRenderer icon={(eventLegendCategory?.values.find((value) => value.id === eventItem.tags[eventLegendCategory?.id ?? ""])?.icon) ?? { kind: "none" }} size={10} themeColor={theme.primary} />
                        {eventItem.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: theme.muted, opacity: 0.6 }}>暂无所属事件</div>
                )}
              </div>
            }
          />
        )}

        {selectedEvent && currentEventDetail && (
          <EntityDetailPanel
            entity={selectedEvent}
            categories={activeMap.eventTagCategories}
            theme={theme}
            onClose={closePanel}
            onPrevious={previousEventId ? () => openEventDetail(previousEventId, "event-manager") : undefined}
            onNext={nextEventId ? () => openEventDetail(nextEventId, "event-manager") : undefined}
            canGoPrevious={!!previousEventId}
            canGoNext={!!nextEventId}
            onEdit={() => { setEditingEvent(selectedEvent); setEventEditorOpen(true); }}
            onDelete={() => {
              if (!confirm(`确定删除「${selectedEvent.name}」？`)) return;
              dispatch({ type: "DELETE_EVENT", mapId: activeMap.id, eventId: selectedEvent.id });
              closePanel();
            }}
            onReposition={() => setRepositioning({ kind: "event", id: selectedEvent.id })}
            repositioning={repositioning?.kind === "event" && repositioning.id === selectedEvent.id}
            headerMeta={formatEventTime(selectedEvent.time)}
            onConfirmReposition={() => setRepositioning(null)}
            deleteLabel="删除事件"
          />
        )}
      </div>

      {locationEditorOpen && (
        <LocationEditor
          existing={editingLocation}
          tagCategories={activeMap.tagCategories}
          onClose={() => setLocationEditorOpen(false)}
          onSave={(location) => {
            if (editingLocation) {
              dispatch({ type: "UPDATE_LOCATION", mapId: activeMap.id, location });
              openLocationDetail(location.id, currentLocationDetail?.backTo ?? null);
            } else {
              dispatch({ type: "ADD_LOCATION", mapId: activeMap.id, location });
              openLocationDetail(location.id, null);
            }
            setLocationEditorOpen(false);
            setEditingLocation(undefined);
          }}
          themeColor={theme.primary}
          themeHeading={theme.heading}
          themeBg={theme.bg}
          themeAccent={theme.accent}
          themeMuted={theme.muted}
        />
      )}

      {eventEditorOpen && (
        <EventEditor
          existing={editingEvent}
          tagCategories={activeMap.eventTagCategories}
          onClose={() => setEventEditorOpen(false)}
          onSave={(eventItem) => {
            if (editingEvent) {
              dispatch({ type: "UPDATE_EVENT", mapId: activeMap.id, event: eventItem });
              openEventDetail(eventItem.id, currentEventDetail?.backTo ?? null);
            } else {
              dispatch({ type: "ADD_EVENT", mapId: activeMap.id, event: eventItem });
              openEventDetail(eventItem.id, null);
            }
            setEventEditorOpen(false);
            setEditingEvent(undefined);
          }}
          themeColor={theme.primary}
          themeHeading={theme.heading}
          themeBg={theme.bg}
          themeAccent={theme.accent}
          themeMuted={theme.muted}
        />
      )}

      {tagManagerOpen && (
        <TagManager
          onClose={() => setTagManagerOpen(false)}
          themeColor={theme.primary}
          themeHeading={theme.heading}
          themeBg={theme.bg}
          themeAccent={theme.accent}
          themeMuted={theme.muted}
        />
      )}
    </div>
  );
}
