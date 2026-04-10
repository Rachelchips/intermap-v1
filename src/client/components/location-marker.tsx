/**
 * @file location-marker.tsx
 * @description Map marker pin component for a single location.
 * Renders a colored icon pinned at (x%, y%) on the map.
 * Different types have different shapes/colors.
 */

import type { LocationData, LocationType } from "../types/map-types";

/** Color and label config per location type */
const TYPE_CONFIG: Record<LocationType, { bg: string; border: string; symbol: string }> = {
  city:     { bg: "#8B4513", border: "#FFD700", symbol: "⬟" },
  natural:  { bg: "#2D6A2D", border: "#90EE90", symbol: "◆" },
  sacred:   { bg: "#6B21A8", border: "#E9D5FF", symbol: "✦" },
  ruin:     { bg: "#5C4033", border: "#B8A398", symbol: "☆" },
  landmark: { bg: "#1E40AF", border: "#93C5FD", symbol: "▲" },
};

interface LocationMarkerProps {
  location: LocationData;
  isSelected: boolean;
  isRepositioning: boolean;
  onClick: (location: LocationData) => void;
}

/**
 * A single clickable pin on the map.
 * Position is controlled by the parent via absolute % positioning.
 */
export function LocationMarker({
  location,
  isSelected,
  isRepositioning,
  onClick,
}: LocationMarkerProps) {
  const config = TYPE_CONFIG[location.type];
  const size = isSelected ? 22 : 16;

  return (
    <button
      style={{
        position: "absolute",
        left: `${location.x}%`,
        top: `${100 - location.y}%`,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        borderRadius: location.type === "city" ? "4px" : "50%",
        backgroundColor: config.bg,
        border: `2px solid ${isSelected ? "#FFFFFF" : config.border}`,
        cursor: isRepositioning ? "crosshair" : "pointer",
        transition: "width 0.15s, height 0.15s, box-shadow 0.15s",
        boxShadow: isSelected
          ? `0 0 0 3px rgba(255,255,255,0.6), 0 0 12px ${config.border}`
          : `0 1px 4px rgba(0,0,0,0.5)`,
        zIndex: isSelected ? 20 : 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.55,
        color: config.border,
        padding: 0,
        lineHeight: 1,
        pointerEvents: isRepositioning && !isSelected ? "none" : "auto",
      }}
      title={location.name}
      onClick={(e) => {
        e.stopPropagation();
        onClick(location);
      }}
      aria-label={location.name}
    />
  );
}
