/**
 * @file location-detail-panel.tsx
 * @description Detail panel for a selected location.
 *
 * Layout adapts based on screen orientation:
 * - Portrait (height > width): panel slides up from the bottom, full width, ~50% height
 * - Landscape / wide screen: panel anchors to the right side (original behavior)
 *
 * Orientation is detected via a `matchMedia("(orientation: portrait)")` listener
 * so the layout updates immediately when the device is rotated.
 */

import { useState, useEffect } from "react";
import { X, Move, Check } from "lucide-react";
import type { LocationData, LocationType } from "../types/map-types";

const TYPE_LABELS: Record<LocationType, string> = {
  city: "城镇",
  natural: "自然地貌",
  sacred: "圣地",
  ruin: "废墟遗迹",
  landmark: "地标建筑",
};

const TYPE_COLORS: Record<LocationType, string> = {
  city: "#D97706",
  natural: "#16A34A",
  sacred: "#7C3AED",
  ruin: "#78716C",
  landmark: "#2563EB",
};

interface LocationDetailPanelProps {
  location: LocationData;
  isRepositioning: boolean;
  onClose: () => void;
  onStartReposition: () => void;
  onConfirmReposition: () => void;
}

/**
 * Uses matchMedia to detect portrait vs landscape orientation.
 * Returns true when the screen is in portrait mode (height > width).
 */
function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia("(orientation: portrait)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isPortrait;
}

/**
 * Location detail panel — right side on landscape/desktop, bottom sheet on portrait mobile.
 */
export function LocationDetailPanel({
  location,
  isRepositioning,
  onClose,
  onStartReposition,
  onConfirmReposition,
}: LocationDetailPanelProps) {
  const isPortrait = useIsPortrait();
  const typeColor = TYPE_COLORS[location.type];
  const typeLabel = TYPE_LABELS[location.type];

  // ── Layout styles based on orientation ──────────────────────────────────
  const panelStyle: React.CSSProperties = isPortrait
    ? {
        // Bottom sheet on portrait
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "52%",
        width: "100%",
        background: "rgba(20, 14, 8, 0.96)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(180, 140, 80, 0.45)",
        borderLeft: "none",
        color: "#E8DCC8",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflowY: "auto",
      }
    : {
        // Right sidebar on landscape / desktop
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 300,
        background: "rgba(20, 14, 8, 0.93)",
        backdropFilter: "blur(8px)",
        borderLeft: "1px solid rgba(180, 140, 80, 0.35)",
        color: "#E8DCC8",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflowY: "auto",
      };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "1px solid rgba(180,140,80,0.2)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            background: "none",
            border: "none",
            color: "#A89060",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="关闭"
        >
          <X size={16} />
        </button>

        {/* Zone badge */}
        <div
          style={{
            fontSize: 10,
            color: "#8A7050",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          {location.zoneName}
        </div>

        {/* Location name — on portrait, show name and Latin side by side to save vertical space */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: isPortrait ? 18 : 20, fontWeight: "bold", color: "#F0E0B0", lineHeight: 1.2 }}>
            {location.name}
          </div>
          {location.nameLatin && (
            <div style={{ fontSize: 12, color: "#8A7050", fontStyle: "italic" }}>
              {location.nameLatin}
            </div>
          )}
        </div>

        {/* Type badge */}
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            padding: "2px 8px",
            borderRadius: 99,
            fontSize: 11,
            border: `1px solid ${typeColor}`,
            color: typeColor,
          }}
        >
          {typeLabel}
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          padding: "12px 16px",
          fontSize: 13,
          lineHeight: 1.75,
          color: "#C8B898",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {location.description}
      </div>

      {/* Coordinates */}
      <div
        style={{
          padding: "6px 16px",
          fontSize: 11,
          color: "#6A5840",
          borderTop: "1px solid rgba(180,140,80,0.15)",
          flexShrink: 0,
        }}
      >
        坐标: X={location.x.toFixed(1)}% · Y={location.y.toFixed(1)}%
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid rgba(180,140,80,0.2)",
          flexShrink: 0,
        }}
      >
        {isRepositioning ? (
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#F0C060",
                marginBottom: 8,
                padding: "6px 10px",
                background: "rgba(240,192,96,0.1)",
                border: "1px solid rgba(240,192,96,0.3)",
                borderRadius: 6,
                lineHeight: 1.5,
              }}
            >
              🗺️ 在地图上点击新位置来移动此地点
            </div>
            <button
              onClick={onConfirmReposition}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(22,163,74,0.2)",
                border: "1px solid #16A34A",
                borderRadius: 6,
                color: "#4ADE80",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Check size={14} />
              确认位置
            </button>
          </div>
        ) : (
          <button
            onClick={onStartReposition}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "rgba(180,140,80,0.15)",
              border: "1px solid rgba(180,140,80,0.4)",
              borderRadius: 6,
              color: "#C8A860",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Move size={14} />
            修改位置
          </button>
        )}
      </div>
    </div>
  );
}
