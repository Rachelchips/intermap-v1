/**
 * @file map-view.tsx
 * @description Main interactive fantasy world map for the Tramire continent.
 * Supports both mouse (desktop) and touch (mobile) interactions:
 * - Mouse: scroll to zoom, drag to pan, click markers
 * - Touch: pinch to zoom, single-finger pan, tap markers
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { INITIAL_LOCATIONS } from "../data/locations-data";
import type { LocationData, MapViewState, FilterState } from "../types/map-types";
import { LocationMarker } from "../components/location-marker";
import { LocationDetailPanel } from "../components/location-detail-panel";
import { FilterPanel, buildDefaultFilter } from "../components/filter-panel";
import { ZoomIn, ZoomOut, Maximize2, ClipboardCopy, Check as CheckIcon, ChevronDown, ChevronUp } from "lucide-react";

// Map image — updated to latest version.
const MAP_IMAGE_URL =
  "https://static.step1.dev/30f593e11fbf22b47a0cf60b4e3696e3";

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

/** Get the distance between two touch points. */
function getTouchDist(t1: React.Touch, t2: React.Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Get the midpoint between two touch points. */
function getTouchMid(t1: React.Touch, t2: React.Touch): { x: number; y: number } {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

export function MapView() {
  const [locations, setLocations] = useState<LocationData[]>(INITIAL_LOCATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [repositioning, setRepositioning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [filter, setFilter] = useState<FilterState>(buildDefaultFilter);
  const [view, setView] = useState<MapViewState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // ── Portrait orientation detection ───────────────────────────────────────
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Mouse pan state ──────────────────────────────────────────────────────
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewAtPanStart = useRef({ translateX: 0, translateY: 0 });

  // ── Touch state ──────────────────────────────────────────────────────────
  // Single-finger pan
  const touchPanActive = useRef(false);
  const touchPanStart = useRef({ x: 0, y: 0 });
  const viewAtTouchPanStart = useRef({ translateX: 0, translateY: 0 });
  // Pinch zoom
  const pinchActive = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchStartMid = useRef({ x: 0, y: 0 });
  const viewAtPinchStart = useRef({ translateX: 0, translateY: 0 });
  // Track whether a touch moved (to distinguish tap from pan/pinch)
  const touchMoved = useRef(false);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;

  /** Apply all active filters to determine which locations are visible. */
  const visibleLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (!filter.types.has(loc.type)) return false;
      const faction = loc.faction ?? "none";
      if (!filter.factions.has(faction)) return false;
      if (!filter.zones.has(loc.zone)) return false;
      return true;
    });
  }, [locations, filter]);

  // ── Zoom helper ──────────────────────────────────────────────────────────

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

  // ── Mouse handlers ───────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoomBy]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON") return;
      if (repositioning) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      viewAtPanStart.current = { translateX: view.translateX, translateY: view.translateY };
      e.preventDefault();
    },
    [repositioning, view.translateX, view.translateY]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setView((prev) => ({
      ...prev,
      translateX: viewAtPanStart.current.translateX + dx,
      translateY: viewAtPanStart.current.translateY + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (!repositioning || !selectedId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON") return;
      const mapEl = mapRef.current;
      if (!mapEl) return;
      const rect = mapEl.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = 100 - ((e.clientY - rect.top) / rect.height) * 100;
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === selectedId
            ? { ...loc, x: Math.round(xPct * 10) / 10, y: Math.round(yPct * 10) / 10 }
            : loc
        )
      );
      setRepositioning(false);
    },
    [repositioning, selectedId]
  );

  // ── Touch handlers ───────────────────────────────────────────────────────

  /**
   * onTouchStart:
   * - 1 finger → start pan tracking
   * - 2 fingers → start pinch-zoom tracking
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
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
        pinchStartMid.current = rect
          ? { x: mid.x - rect.left, y: mid.y - rect.top }
          : { x: mid.x, y: mid.y };
        viewAtPinchStart.current = { translateX: view.translateX, translateY: view.translateY };
      }
    },
    [view.translateX, view.translateY, view.scale]
  );

  /**
   * onTouchMove:
   * - 1 finger → pan the map
   * - 2 fingers → pinch zoom centered on midpoint
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      touchMoved.current = true;

      if (e.touches.length === 1 && touchPanActive.current && !repositioning) {
        const t = e.touches[0]!;
        const dx = t.clientX - touchPanStart.current.x;
        const dy = t.clientY - touchPanStart.current.y;
        setView((prev) => ({
          ...prev,
          translateX: viewAtTouchPanStart.current.translateX + dx,
          translateY: viewAtTouchPanStart.current.translateY + dy,
        }));
      } else if (e.touches.length === 2 && pinchActive.current) {
        const t1 = e.touches[0]!;
        const t2 = e.touches[1]!;
        const dist = getTouchDist(t1, t2);
        if (pinchStartDist.current === 0) return;
        const scaleRatio = dist / pinchStartDist.current;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, pinchStartScale.current * scaleRatio)
        );
        const mid = pinchStartMid.current;
        const overallRatio = newScale / pinchStartScale.current;
        setView({
          scale: newScale,
          translateX: mid.x - overallRatio * (mid.x - viewAtPinchStart.current.translateX),
          translateY: mid.y - overallRatio * (mid.y - viewAtPinchStart.current.translateY),
        });
      }
    },
    [repositioning]
  );

  /**
   * onTouchEnd:
   * - If no movement happened (tap), handle repositioning or close panel on map bg tap
   */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchPanActive.current = false;
      pinchActive.current = false;

      // Tap without significant movement
      if (!touchMoved.current && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]!;
        const target = e.target as HTMLElement;
        // Don't intercept button taps
        if (target.tagName === "BUTTON") return;

        if (repositioning && selectedId) {
          const mapEl = mapRef.current;
          if (!mapEl) return;
          const rect = mapEl.getBoundingClientRect();
          const xPct = ((t.clientX - rect.left) / rect.width) * 100;
          const yPct = 100 - ((t.clientY - rect.top) / rect.height) * 100;
          setLocations((prev) =>
            prev.map((loc) =>
              loc.id === selectedId
                ? { ...loc, x: Math.round(xPct * 10) / 10, y: Math.round(yPct * 10) / 10 }
                : loc
            )
          );
          setRepositioning(false);
        }
      }
    },
    [repositioning, selectedId]
  );

  const handleSelectLocation = useCallback((loc: LocationData) => {
    setSelectedId(loc.id);
    setRepositioning(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setRepositioning(false);
  }, []);

  /** Export all current location coordinates as a compact JSON string to clipboard. */
  const handleExportCoords = useCallback(() => {
    const coords = locations.map(({ id, x, y }) => ({ id, x, y }));
    const text = JSON.stringify(coords, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [locations]);

  // ── Prevent native scroll/zoom on the map container ─────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Prevent wheel scroll from the page
    const onWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    // Prevent native pinch-zoom on mobile
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // ── Legend config ────────────────────────────────────────────────────────

  const LEGEND = [
    { color: "#8B4513", border: "#FFD700", label: "城镇", shape: "4px" },
    { color: "#6B21A8", border: "#E9D5FF", label: "圣地", shape: "50%" },
    { color: "#2D6A2D", border: "#90EE90", label: "自然地貌", shape: "50%" },
    { color: "#5C4033", border: "#B8A398", label: "废墟遗迹", shape: "50%" },
    { color: "#1E40AF", border: "#93C5FD", label: "地标建筑", shape: "50%" },
  ];

  // ── Draggable legend state ───────────────────────────────────────────────
  /** Legend position in pixels from top-left of the map area. null = use default bottom-left anchor. */
  const [legendPos, setLegendPos] = useState<{ x: number; y: number } | null>(null);
  /** Whether the legend body is collapsed (only header visible). */
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const legendDragging = useRef(false);
  /** Track drag distance to distinguish a click (toggle) from a drag (move). */
  const legendDragMoved = useRef(false);
  const legendDragStart = useRef({ mx: 0, my: 0, lx: 0, ly: 0 });
  const legendRef = useRef<HTMLDivElement>(null);

  /** Get the map area element's bounding rect for clamping. */
  const getMapAreaRect = useCallback(() => {
    return containerRef.current?.parentElement?.getBoundingClientRect() ?? null;
  }, []);

  /** Mouse down on legend drag handle → start drag (does NOT toggle collapse). */
  const handleLegendMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const legendEl = legendRef.current;
      if (!legendEl) return;
      const mapAreaEl = containerRef.current?.parentElement;
      if (!mapAreaEl) return;
      const mapRect = mapAreaEl.getBoundingClientRect();
      const legendRect = legendEl.getBoundingClientRect();
      const currentX = legendRect.left - mapRect.left;
      const currentY = legendRect.top - mapRect.top;
      legendDragging.current = true;
      legendDragMoved.current = false;
      legendDragStart.current = { mx: e.clientX, my: e.clientY, lx: currentX, ly: currentY };
    },
    []
  );

  /** Window-level mouse handlers for legend drag. */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!legendDragging.current) return;
      const dx = e.clientX - legendDragStart.current.mx;
      const dy = e.clientY - legendDragStart.current.my;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      legendDragMoved.current = true;
      const mapRect = getMapAreaRect();
      if (!mapRect) return;
      const legendEl = legendRef.current;
      if (!legendEl) return;
      const legendRect = legendEl.getBoundingClientRect();
      const newX = Math.max(0, Math.min(mapRect.width - legendRect.width, legendDragStart.current.lx + dx));
      const newY = Math.max(0, Math.min(mapRect.height - legendRect.height, legendDragStart.current.ly + dy));
      setLegendPos({ x: newX, y: newY });
    };
    const onMouseUp = () => {
      legendDragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [getMapAreaRect]);

  /**
   * Touch handlers for legend dragging.
   * These are attached via useEffect with { passive: false } so we can call preventDefault,
   * which React synthetic events cannot reliably do on mobile.
   */
  useEffect(() => {
    const legendEl = legendRef.current;
    if (!legendEl) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only handle touches on the drag handle (header area), not the toggle button
      const target = e.target as HTMLElement;
      if (target.closest("[data-legend-toggle]")) return;
      e.stopPropagation();
      // Don't preventDefault here — it would block the toggle button's click
      const t = e.touches[0];
      if (!t) return;
      const mapAreaEl = containerRef.current?.parentElement;
      if (!mapAreaEl) return;
      const mapRect = mapAreaEl.getBoundingClientRect();
      const legendRect = legendEl.getBoundingClientRect();
      const currentX = legendRect.left - mapRect.left;
      const currentY = legendRect.top - mapRect.top;
      legendDragging.current = true;
      legendDragMoved.current = false;
      legendDragStart.current = { mx: t.clientX, my: t.clientY, lx: currentX, ly: currentY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!legendDragging.current) return;
      e.stopPropagation();
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - legendDragStart.current.mx;
      const dy = t.clientY - legendDragStart.current.my;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      legendDragMoved.current = true;
      const mapRect = getMapAreaRect();
      if (!mapRect) return;
      const legendRect = legendEl.getBoundingClientRect();
      const newX = Math.max(0, Math.min(mapRect.width - legendRect.width, legendDragStart.current.lx + dx));
      const newY = Math.max(0, Math.min(mapRect.height - legendRect.height, legendDragStart.current.ly + dy));
      setLegendPos({ x: newX, y: newY });
    };

    const onTouchEnd = () => {
      legendDragging.current = false;
    };

    legendEl.addEventListener("touchstart", onTouchStart, { passive: true });
    legendEl.addEventListener("touchmove", onTouchMove, { passive: false });
    legendEl.addEventListener("touchend", onTouchEnd);
    return () => {
      legendEl.removeEventListener("touchstart", onTouchStart);
      legendEl.removeEventListener("touchmove", onTouchMove);
      legendEl.removeEventListener("touchend", onTouchEnd);
    };
  }, [getMapAreaRect]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#1a1208",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Georgia, 'Times New Roman', serif",
        // Disable native browser touch behaviors (pan, zoom) so we control them.
        touchAction: "none",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          padding: "8px 12px",
          background: "rgba(0,0,0,0.6)",
          borderBottom: "1px solid rgba(180,140,60,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          minHeight: 44,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#E8D080", letterSpacing: 2, whiteSpace: "nowrap" }}>
          特兰米尔大洲
        </div>
        <div style={{ fontSize: 11, color: "#7A6040", fontStyle: "italic", whiteSpace: "nowrap", display: "var(--hint-display, block)" }} className="desktop-hint">
          Tramire Continent
        </div>
        <div style={{ flex: 1 }} />
        {/* Hide verbose hint on narrow screens via inline style — pure CSS variable trick */}
        <div
          style={{ fontSize: 11, color: "#5A4830", whiteSpace: "nowrap" }}
          className="desktop-hint"
        >
          滚轮缩放 · 拖拽平移 · 点击地点查看详情
        </div>
        <button
          onClick={handleExportCoords}
          title="导出所有地点坐标到剪贴板"
          style={{
            padding: "5px 10px",
            background: copied ? "rgba(22,163,74,0.2)" : "rgba(180,140,60,0.15)",
            border: `1px solid ${copied ? "#16A34A" : "rgba(180,140,60,0.4)"}`,
            borderRadius: 6,
            color: copied ? "#4ADE80" : "#C8A860",
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all 0.2s",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {copied ? <CheckIcon size={13} /> : <ClipboardCopy size={13} />}
          {copied ? "已复制！" : "导出坐标"}
        </button>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Filter panel */}
        <FilterPanel
          filter={filter}
          onChange={setFilter}
          hiddenLocationCount={visibleLocations.length}
          toggleButtonTop={
            // In portrait mode when the detail panel (bottom sheet) is visible,
            // move the filter toggle button up to avoid overlapping the panel title.
            isPortrait && selectedId ? "22%" : "50%"
          }
        />

        {/* Zoom buttons */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 44,
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            { icon: <ZoomIn size={14} />, fn: () => zoomBy(1.3), title: "放大" },
            { icon: <ZoomOut size={14} />, fn: () => zoomBy(1 / 1.3), title: "缩小" },
            {
              icon: <Maximize2 size={14} />,
              fn: () => setView({ scale: 1, translateX: 0, translateY: 0 }),
              title: "重置",
            },
          ].map(({ icon, fn, title }) => (
            <button
              key={title}
              onClick={fn}
              title={title}
              style={{
                width: 36,
                height: 36,
                background: "rgba(20,14,8,0.85)",
                border: "1px solid rgba(180,140,60,0.4)",
                borderRadius: 6,
                color: "#C8A860",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // Larger touch target on mobile
                touchAction: "manipulation",
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Legend — draggable & collapsible */}
        <div
          ref={legendRef}
          onMouseDown={handleLegendMouseDown}
          style={{
            position: "absolute",
            // If user has dragged it, use absolute x/y; otherwise anchor to bottom-left
            ...(legendPos
              ? { left: legendPos.x, top: legendPos.y }
              : { bottom: 12, left: 44 }),
            zIndex: 40,
            background: "rgba(20,14,8,0.88)",
            border: "1px solid rgba(180,140,60,0.35)",
            borderRadius: 8,
            padding: legendCollapsed ? "7px 12px" : "8px 12px 10px",
            color: "#C8B898",
            fontSize: 11,
            cursor: "grab",
            userSelect: "none",
            touchAction: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
            transition: "padding 0.2s",
            minWidth: 90,
          }}
        >
          {/* Header row: drag handle on left, dedicated toggle button on right */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: "bold", color: "#E8D080", fontSize: 12 }}>图例</div>
            {/* Dedicated toggle button — uses both onClick (desktop) and onTouchEnd (mobile)
                because parent touchAction:none can suppress click on iOS Safari */}
            <button
              data-legend-toggle="true"
              onClick={(e) => {
                e.stopPropagation();
                setLegendCollapsed((prev) => !prev);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setLegendCollapsed((prev) => !prev);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#C8A860",
                opacity: 0.8,
                lineHeight: 1,
                flexShrink: 0,
                padding: "4px 6px",
                margin: "-4px -6px",
                display: "flex",
                alignItems: "center",
                minWidth: 32,
                minHeight: 32,
                justifyContent: "center",
              }}
            >
              {legendCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Collapsible body */}
          {!legendCollapsed && (
            <div style={{ marginTop: 6 }}>
              {LEGEND.map(({ color, border, label, shape }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: color,
                      border: `1.5px solid ${border}`,
                      borderRadius: shape,
                      flexShrink: 0,
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pan/zoom viewport — handles BOTH mouse and touch */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            cursor: repositioning ? "crosshair" : "grab",
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
            <div
              ref={mapRef}
              style={{ position: "relative", display: "inline-block" }}
              onClick={handleMapClick}
            >
              {/* Loading overlay */}
              {!imgLoaded && !imgError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1a1208",
                    color: "#C8A860",
                    fontSize: 14,
                    zIndex: 5,
                  }}
                >
                  正在加载地图…
                </div>
              )}
              {/* Error overlay */}
              {imgError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1a1208",
                    color: "#C87060",
                    fontSize: 14,
                    gap: 8,
                    zIndex: 5,
                  }}
                >
                  <span>⚠️ 地图图片加载失败</span>
                  <span style={{ fontSize: 11, color: "#7A5040" }}>请检查网络连接后刷新页面</span>
                </div>
              )}
              <img
                src={MAP_IMAGE_URL}
                alt="特兰米尔大洲地图"
                style={{
                  display: "block",
                  width: "auto",
                  height: "calc(100vh - 44px)",
                  maxWidth: "none",
                  pointerEvents: "none",
                  userSelect: "none",
                  filter: "sepia(5%) contrast(1.05)",
                  opacity: imgLoaded ? 1 : 0,
                  transition: "opacity 0.4s",
                }}
                draggable={false}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {visibleLocations.map((loc) => (
                <LocationMarker
                  key={loc.id}
                  location={loc}
                  isSelected={loc.id === selectedId}
                  isRepositioning={repositioning}
                  onClick={handleSelectLocation}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedLocation && (
          <LocationDetailPanel
            location={selectedLocation}
            isRepositioning={repositioning}
            onClose={handleClose}
            onStartReposition={() => setRepositioning(true)}
            onConfirmReposition={() => setRepositioning(false)}
          />
        )}

        {/* Repositioning hint banner */}
        {repositioning && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(240,192,96,0.15)",
              border: "1px solid rgba(240,192,96,0.5)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#F0C060",
              fontSize: 13,
              zIndex: 40,
              pointerEvents: "none",
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
            }}
          >
            🗺️ 点击地图上的新位置来移动「{selectedLocation?.name}」
          </div>
        )}
      </div>
    </div>
  );
}
