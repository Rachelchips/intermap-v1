/**
 * @file intermap-types.ts
 * @description Core type definitions for the Intermap multi-map system.
 *
 * Data model overview:
 * - IntermapStore: top-level state — list of maps + which one is active
 * - MapProject: one map — has metadata, location/event tag categories, and entities
 * - TagCategory: a dimension like "地点类型" — can be set as the legend
 * - TagValue: a specific tag within a category (e.g. "城市")
 * - MapLocation: a pin on the map — references tag values by id
 */

// ── Icon system ────────────────────────────────────────────────────────────────

/** A simple shape+color icon, or an emoji, or nothing */
export type TagIcon =
  | { kind: "shape"; shape: "circle" | "square" | "diamond"; color: string; opacity?: number; borderColor?: string }
  | { kind: "emoji"; emoji: string }
  | { kind: "none" };

// ── Tag system ─────────────────────────────────────────────────────────────────

/** A sub-category tag value (e.g. "城市", "自然景观") */
export interface TagValue {
  id: string;
  label: string;        // Display name
  icon: TagIcon;
}

/** A tag category (e.g. "地点类型", "所属势力") */
export interface TagCategory {
  id: string;
  label: string;        // Category name (e.g. "地点类型")
  isLegend: boolean;    // If true, markers use this category's icon/style
  isBuiltIn: boolean;   // Built-in categories cannot be deleted
  values: TagValue[];   // Sub-tags under this category
}

// ── Location ──────────────────────────────────────────────────────────────────

/** A single pin/location on the map */
export interface MapLocation {
  id: string;
  name: string;           // Chinese name
  nameEn?: string;        // English name (optional)
  description: string;    // Max 250 chars
  x: number;              // 0–100% of map width
  y: number;              // 0–100% of map height (0=south, 100=north)
  /** Optional illustration image — data URL (base64) or external URL */
  imageUrl?: string;
  /** Map from category id → tag value id (one tag value per category) */
  tags: Record<string, string>;
}

/** A single event pin on the map */
export interface MapEvent {
  id: string;
  name: string;           // Chinese name
  nameEn?: string;        // English name (optional)
  description: string;    // Max 250 chars
  x: number;              // 0–100% of map width
  y: number;              // 0–100% of map height (0=south, 100=north)
  /** Optional illustration image — data URL (base64) or external URL */
  imageUrl?: string;
  /** Map from category id → tag value id (one tag value per category) */
  tags: Record<string, string>;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/** Theme color preset for a map */
export interface MapTheme {
  id: string;
  label: string;
  /** Primary UI color in hex — drives the whole palette */
  primary: string;
  /** Darker background tint */
  bg: string;
  /** Border/accent color */
  accent: string;
  /** Text color for headings */
  heading: string;
  /** Muted text */
  muted: string;
}

export const MAP_THEMES: MapTheme[] = [
  { id: "parchment", label: "羊皮纸",  primary: "#C8A860", bg: "#1a1208", accent: "rgba(180,140,60,0.4)",  heading: "#F0E0B0", muted: "#8A7050" },
  { id: "ocean",     label: "深海蓝",  primary: "#60A8C8", bg: "#081420", accent: "rgba(60,120,180,0.4)",  heading: "#B0D8F0", muted: "#507080" },
  { id: "forest",   label: "森林绿",  primary: "#60C880", bg: "#081408", accent: "rgba(60,160,80,0.4)",   heading: "#B0F0C0", muted: "#508060" },
  { id: "ember",    label: "赤焰红",  primary: "#C86060", bg: "#200808", accent: "rgba(180,60,60,0.4)",   heading: "#F0B0B0", muted: "#805050" },
  { id: "dusk",     label: "暮色紫",  primary: "#A860C8", bg: "#140820", accent: "rgba(120,60,180,0.4)",  heading: "#D8B0F0", muted: "#706080" },
  { id: "snow",     label: "冰雪白",  primary: "#C8D0E8", bg: "#101418", accent: "rgba(160,170,200,0.4)", heading: "#E8EEF8", muted: "#808898" },
];

// ── Map Project ───────────────────────────────────────────────────────────────

/** A full map project */
export interface MapProject {
  id: string;
  name: string;           // Chinese name
  nameEn?: string;        // English name (optional)
  imageUrl: string;       // Background map image URL or data URL
  themeId: string;        // References MAP_THEMES[].id
  tagCategories: TagCategory[];
  locations: MapLocation[];
  eventTagCategories: TagCategory[];
  events: MapEvent[];
  createdAt: number;      // timestamp
  updatedAt: number;      // timestamp
}

// ── Store ─────────────────────────────────────────────────────────────────────

/** Top-level application state */
export interface IntermapState {
  maps: MapProject[];
  activeMapId: string | null;
}

/** A snapshot entry in the undo/redo history stack */
export interface HistoryEntry {
  maps: MapProject[];
  activeMapId: string | null;
}

// ── Map view state ────────────────────────────────────────────────────────────

export interface MapViewState {
  scale: number;
  translateX: number;
  translateY: number;
}
