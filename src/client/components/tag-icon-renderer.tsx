/**
 * @file tag-icon-renderer.tsx
 * @description Renders a TagIcon as a small visual element.
 * Supports: shape+color (circle/square/diamond/triangle/star), emoji, or none (fallback dot).
 */

import type { TagIcon } from "../types/intermap-types";

interface TagIconRendererProps {
  icon: TagIcon;
  size?: number;
  /** Override border color */
  borderColor?: string;
  /** Used as the default emoji background when icon.bgColor is not set */
  themeColor?: string;
}

/**
 * Renders the visual marker icon for a tag value.
 * - shape: geometric shape with fill color
 * - emoji: rendered as text
 * - none: small muted dot
 */
export function TagIconRenderer({ icon, size = 12, borderColor, themeColor = "#C8A860" }: TagIconRendererProps) {
  if (icon.kind === "emoji") {
    const defaultBackground = themeColor;
    const baseBackground = icon.bgColor === null ? "transparent" : icon.bgColor ?? defaultBackground;
    const background = icon.bgColor && icon.bgOpacity !== undefined
      ? withAlpha(icon.bgColor, icon.bgOpacity)
      : baseBackground;
    const border = icon.bgColor === null
      ? "transparent"
      : borderColor ?? icon.borderColor ?? lighten(icon.bgColor ?? themeColor, 0.2);
    return (
      <span
        style={{
          fontSize: size * 0.95,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size * 1.45,
          height: size * 1.45,
          borderRadius: "50%",
          background,
          border: `1px solid ${border}`,
          flexShrink: 0,
        }}
      >
        {icon.emoji}
      </span>
    );
  }

  if (icon.kind === "none") {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(150,130,100,0.35)",
          border: `1px solid rgba(150,130,100,0.4)`,
          flexShrink: 0,
        }}
      />
    );
  }

  // shape kind
  const color = icon.color;
  const opacity = icon.opacity ?? 1;
  const border = borderColor ?? lighten(color, 0.4);

  if (icon.shape === "circle") {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          border: `1.5px solid ${border}`,
          flexShrink: 0,
          opacity,
        }}
      />
    );
  }

  if (icon.shape === "square") {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 2,
          background: color,
          border: `1.5px solid ${border}`,
          flexShrink: 0,
          opacity,
        }}
      />
    );
  }

  if (icon.shape === "diamond") {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          background: color,
          border: `1.5px solid ${border}`,
          transform: "rotate(45deg)",
          flexShrink: 0,
          opacity,
        }}
      />
    );
  }

  return null;
}

/** Very simple hex color lightener (adds white overlay) */
function lighten(hex: string, amount: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, Math.round(r + (255 - r) * amount));
    const lg = Math.min(255, Math.round(g + (255 - g) * amount));
    const lb = Math.min(255, Math.round(b + (255 - b) * amount));
    return `rgb(${lr},${lg},${lb})`;
  } catch {
    return hex;
  }
}

function withAlpha(hex: string, alpha: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return hex;
  }
}
