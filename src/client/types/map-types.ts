/**
 * @file map-types.ts
 * @description Type definitions for the Tramire fantasy world map system.
 */

/** Location type determines the icon and color used on the map */
export type LocationType =
  | "city"      // Human settlements and capitals
  | "natural"   // Rivers, mountains, forests, etc.
  | "sacred"    // Ancient trees, holy sites
  | "ruin"      // Abandoned cities and ruins
  | "landmark"; // Notable structures (towers, academies)

/** Faction / political affiliation of a location */
export type FactionType =
  | "human"     // 人类
  | "treant"    // 树精
  | "elvenbranch" // 枝裔族
  | "orc"       // 兽人
  | "clawkin"   // 裂爪族
  | "none";     // 无归属

/** A single location on the map */
export interface LocationData {
  id: string;
  name: string;           // Chinese name
  nameLatin?: string;     // Latin/English name
  type: LocationType;
  zone: string;           // Zone key
  zoneName: string;       // Zone display name (Chinese)
  faction?: FactionType;  // Optional faction affiliation
  description: string;
  x: number;              // X position as percentage (0-100) of map width
  y: number;              // Y position as percentage (0-100) of map height
}

/** Map view state for pan and zoom */
export interface MapViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

/** Filter state for the filter panel */
export interface FilterState {
  types: Set<LocationType>;
  factions: Set<FactionType>;
  zones: Set<string>;
}
