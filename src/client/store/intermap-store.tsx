/**
 * @file intermap-store.ts
 * @description Central state store for Intermap.
 * Uses React context + useReducer for state management with undo/redo.
 * State is persisted to localStorage on every change.
 *
 * How it works:
 * 1. All map/location mutations go through dispatch()
 * 2. Before each mutation, current state is pushed to undoStack
 * 3. Undo pops undoStack and pushes current to redoStack
 * 4. Redo pops redoStack and pushes current to undoStack
 * 5. State is serialized to localStorage after every dispatch
 */

import { createContext, useContext, useReducer, useEffect, useRef } from "react";
import type { IntermapState, MapProject, MapLocation, MapEvent, TagCategory, TagValue, HistoryEntry } from "../types/intermap-types";
import { MAP_THEMES } from "../types/intermap-types";
import { INITIAL_LOCATIONS } from "../data/locations-data";
import { createBuiltInTramireMap } from "../data/tramire-map";
import { createDefaultEventTagCategories, normalizeMapProject } from "@/lib/intermap-helpers";

// ── Default Tramire map ────────────────────────────────────────────────────────

const DEFAULT_TAG_CATEGORIES: TagCategory[] = [
  {
    id: "type",
    label: "地点类型",
    isLegend: true,
    isBuiltIn: true,
    values: [
      { id: "city",     label: "城镇",   icon: { kind: "shape", shape: "square",   color: "#8B4513" } },
      { id: "natural",  label: "自然地貌", icon: { kind: "shape", shape: "circle",   color: "#2D6A2D" } },
      { id: "sacred",   label: "圣地",   icon: { kind: "shape", shape: "circle",   color: "#6B21A8" } },
      { id: "ruin",     label: "废墟遗迹", icon: { kind: "shape", shape: "diamond",  color: "#5C4033" } },
      { id: "landmark", label: "地标建筑", icon: { kind: "shape", shape: "square", color: "#1E40AF" } },
    ],
  },
  {
    id: "faction",
    label: "所属势力",
    isLegend: false,
    isBuiltIn: true,
    values: [
      { id: "human",        label: "人类",   icon: { kind: "emoji", emoji: "👑" } },
      { id: "treant",       label: "树精",   icon: { kind: "emoji", emoji: "🌳" } },
      { id: "elvenbranch",  label: "枝裔族", icon: { kind: "emoji", emoji: "🌿" } },
      { id: "orc",          label: "兽人",   icon: { kind: "emoji", emoji: "⚔️" } },
      { id: "clawkin",      label: "裂爪族", icon: { kind: "emoji", emoji: "🦅" } },
      { id: "none",         label: "无归属", icon: { kind: "none" } },
    ],
  },
  {
    id: "zone",
    label: "所属区域",
    isLegend: false,
    isBuiltIn: true,
    values: [
      { id: "central_world_root_zone",              label: "中部 - 神树地带",       icon: { kind: "none" } },
      { id: "central_ancient_battlefield_zone",     label: "中部 - 古战场区",       icon: { kind: "none" } },
      { id: "southern_aurelen_zone",                label: "南部 - 奥蕊岚",        icon: { kind: "none" } },
      { id: "southwestern_sanlar_kingdom",          label: "西南部 - 圣岚王国",     icon: { kind: "none" } },
      { id: "northwestern_merton_kingdom",          label: "西北部 - 梅顿王国",     icon: { kind: "none" } },
      { id: "canal_zone_lando_duchy",               label: "运河地带 - 兰多公国",   icon: { kind: "none" } },
      { id: "extreme_northwestern_wasteland",       label: "极西北部 - 西部荒原",   icon: { kind: "none" } },
      { id: "northwestern_offshore_islands",        label: "西北部海面 - 铁礁群岛", icon: { kind: "none" } },
      { id: "lunar_creek_zone",                     label: "沿神树区 - 月神溪地带", icon: { kind: "none" } },
      { id: "southeastern_forest_zone",             label: "东南部 - 密林地带",     icon: { kind: "none" } },
      { id: "northeastern_marsh_zone",              label: "东北部 - 沼泽地带",     icon: { kind: "none" } },
      { id: "eastern_coast_abandoned_zone",         label: "东部沿海 - 废弃海岸地带",icon: { kind: "none" } },
      { id: "forest_and_marsh_boundary_great_rift", label: "密林和沼泽分界线 - 大裂隙",icon: { kind: "none" } },
    ],
  },
];

/** Convert legacy LocationData to MapLocation */
function buildInitialLocations(): MapLocation[] {
  return INITIAL_LOCATIONS.map((loc) => ({
    id: loc.id,
    name: loc.name,
    nameEn: loc.nameLatin,
    description: loc.description,
    x: loc.x,
    y: loc.y,
    tags: {
      type: loc.type,
      faction: loc.faction ?? "none",
      zone: loc.zone,
    },
  }));
}

const TRAMIRE_MAP: MapProject = {
  id: "tramire",
  name: "特兰米尔大洲",
  nameEn: "Tramire Continent",
  imageUrl: "https://static.step1.dev/30f593e11fbf22b47a0cf60b4e3696e3",
  themeId: "parchment",
  tagCategories: DEFAULT_TAG_CATEGORIES,
  locations: buildInitialLocations(),
  eventTagCategories: createDefaultEventTagCategories(buildInitialLocations()),
  events: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function getBuiltInTramireMap(): MapProject {
  return normalizeMapProject(createBuiltInTramireMap());
}

const BUILT_IN_TRAMIRE_MAP: MapProject = getBuiltInTramireMap();

const INITIAL_STATE: IntermapState = {
  maps: [BUILT_IN_TRAMIRE_MAP],
  activeMapId: BUILT_IN_TRAMIRE_MAP.id,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

export type IntermapAction =
  | { type: "SET_ACTIVE_MAP"; mapId: string }
  | { type: "CREATE_MAP"; map: MapProject }
  | { type: "DELETE_MAP"; mapId: string }
  | { type: "UPDATE_MAP_META"; mapId: string; name: string; nameEn?: string; themeId: string }
  | { type: "UPDATE_MAP_IMAGE"; mapId: string; imageUrl: string }
  | { type: "ADD_LOCATION"; mapId: string; location: MapLocation }
  | { type: "UPDATE_LOCATION"; mapId: string; location: MapLocation }
  | { type: "DELETE_LOCATION"; mapId: string; locationId: string }
  | { type: "ADD_EVENT"; mapId: string; event: MapEvent }
  | { type: "UPDATE_EVENT"; mapId: string; event: MapEvent }
  | { type: "DELETE_EVENT"; mapId: string; eventId: string }
  | { type: "ADD_TAG_CATEGORY"; mapId: string; category: TagCategory }
  | { type: "UPDATE_TAG_CATEGORY"; mapId: string; category: TagCategory }
  | { type: "DELETE_TAG_CATEGORY"; mapId: string; categoryId: string }
  | { type: "SET_LEGEND_CATEGORY"; mapId: string; categoryId: string }
  | { type: "ADD_TAG_VALUE"; mapId: string; categoryId: string; value: TagValue }
  | { type: "UPDATE_TAG_VALUE"; mapId: string; categoryId: string; value: TagValue }
  | { type: "DELETE_TAG_VALUE"; mapId: string; categoryId: string; valueId: string }
  | { type: "ADD_EVENT_TAG_CATEGORY"; mapId: string; category: TagCategory }
  | { type: "UPDATE_EVENT_TAG_CATEGORY"; mapId: string; category: TagCategory }
  | { type: "DELETE_EVENT_TAG_CATEGORY"; mapId: string; categoryId: string }
  | { type: "SET_EVENT_LEGEND_CATEGORY"; mapId: string; categoryId: string }
  | { type: "ADD_EVENT_TAG_VALUE"; mapId: string; categoryId: string; value: TagValue }
  | { type: "UPDATE_EVENT_TAG_VALUE"; mapId: string; categoryId: string; value: TagValue }
  | { type: "DELETE_EVENT_TAG_VALUE"; mapId: string; categoryId: string; valueId: string };

function updateMap(state: IntermapState, mapId: string, updater: (m: MapProject) => MapProject): IntermapState {
  return {
    ...state,
    maps: state.maps.map((m) => (m.id === mapId ? normalizeMapProject(updater(m)) : m)),
  };
}

function reducer(state: IntermapState, action: IntermapAction): IntermapState {
  switch (action.type) {
    case "SET_ACTIVE_MAP":
      return { ...state, activeMapId: action.mapId };

    case "CREATE_MAP":
      return { ...state, maps: [...state.maps, normalizeMapProject(action.map)], activeMapId: action.map.id };

    case "DELETE_MAP": {
      const remaining = state.maps.filter((m) => m.id !== action.mapId);
      const newActive = remaining.length > 0 ? (remaining[remaining.length - 1]?.id ?? null) : null;
      return { maps: remaining, activeMapId: newActive };
    }

    case "UPDATE_MAP_META":
      return updateMap(state, action.mapId, (m) => ({ ...m, name: action.name, nameEn: action.nameEn, themeId: action.themeId, updatedAt: Date.now() }));

    case "UPDATE_MAP_IMAGE":
      return updateMap(state, action.mapId, (m) => ({ ...m, imageUrl: action.imageUrl, updatedAt: Date.now() }));

    case "ADD_LOCATION":
      return updateMap(state, action.mapId, (m) => ({ ...m, locations: [...m.locations, action.location], updatedAt: Date.now() }));

    case "UPDATE_LOCATION":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        locations: m.locations.map((l) => (l.id === action.location.id ? action.location : l)),
        updatedAt: Date.now(),
      }));

    case "DELETE_LOCATION":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        locations: m.locations.filter((l) => l.id !== action.locationId),
        updatedAt: Date.now(),
      }));

    case "ADD_EVENT":
      return updateMap(state, action.mapId, (m) => ({ ...m, events: [...m.events, action.event], updatedAt: Date.now() }));

    case "UPDATE_EVENT":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        events: m.events.map((eventItem) => (eventItem.id === action.event.id ? action.event : eventItem)),
        updatedAt: Date.now(),
      }));

    case "DELETE_EVENT":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        events: m.events.filter((eventItem) => eventItem.id !== action.eventId),
        updatedAt: Date.now(),
      }));

    case "ADD_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({ ...m, tagCategories: [...m.tagCategories, action.category], updatedAt: Date.now() }));

    case "UPDATE_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.map((c) => (c.id === action.category.id ? action.category : c)),
        updatedAt: Date.now(),
      }));

    case "DELETE_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.filter((c) => c.id !== action.categoryId),
        updatedAt: Date.now(),
      }));

    case "SET_LEGEND_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.map((c) => ({ ...c, isLegend: c.id === action.categoryId })),
        updatedAt: Date.now(),
      }));

    case "ADD_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.map((c) =>
          c.id === action.categoryId ? { ...c, values: [...c.values, action.value] } : c
        ),
        updatedAt: Date.now(),
      }));

    case "UPDATE_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.map((c) =>
          c.id === action.categoryId
            ? { ...c, values: c.values.map((v) => (v.id === action.value.id ? action.value : v)) }
            : c
        ),
        updatedAt: Date.now(),
      }));

    case "DELETE_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        tagCategories: m.tagCategories.map((c) =>
          c.id === action.categoryId ? { ...c, values: c.values.filter((v) => v.id !== action.valueId) } : c
        ),
        updatedAt: Date.now(),
      }));

    case "ADD_EVENT_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({ ...m, eventTagCategories: [...m.eventTagCategories, action.category], updatedAt: Date.now() }));

    case "UPDATE_EVENT_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.map((c) => (c.id === action.category.id ? action.category : c)),
        updatedAt: Date.now(),
      }));

    case "DELETE_EVENT_TAG_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.filter((c) => c.id !== action.categoryId),
        updatedAt: Date.now(),
      }));

    case "SET_EVENT_LEGEND_CATEGORY":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.map((c) => ({ ...c, isLegend: c.id === action.categoryId })),
        updatedAt: Date.now(),
      }));

    case "ADD_EVENT_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.map((c) =>
          c.id === action.categoryId ? { ...c, values: [...c.values, action.value] } : c
        ),
        updatedAt: Date.now(),
      }));

    case "UPDATE_EVENT_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.map((c) =>
          c.id === action.categoryId
            ? { ...c, values: c.values.map((v) => (v.id === action.value.id ? action.value : v)) }
            : c
        ),
        updatedAt: Date.now(),
      }));

    case "DELETE_EVENT_TAG_VALUE":
      return updateMap(state, action.mapId, (m) => ({
        ...m,
        eventTagCategories: m.eventTagCategories.map((c) =>
          c.id === action.categoryId ? { ...c, values: c.values.filter((v) => v.id !== action.valueId) } : c
        ),
        updatedAt: Date.now(),
      }));

    default:
      return state;
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "intermap_v3";
const LEGACY_STORAGE_KEYS = ["intermap_v2", "intermap_v1"] as const;
/** The canonical image URL for the built-in Tramire map — always kept in sync. */
const TRAMIRE_MAP_ID = BUILT_IN_TRAMIRE_MAP.id;
const TRAMIRE_IMAGE_URL = BUILT_IN_TRAMIRE_MAP.imageUrl;

function migrateRemovedShapeIcons(map: MapProject): MapProject {
  return normalizeMapProject({
    ...map,
    tagCategories: map.tagCategories.map((cat) => ({
      ...cat,
      values: cat.values.map((v) => {
        if (v.icon.kind === "shape" && ((v.icon.shape as string) === "triangle" || (v.icon.shape as string) === "star")) {
          return { ...v, icon: { ...v.icon, shape: "square" as const } };
        }
        return v;
      }),
    })),
  } as MapProject);
}

function coerceActiveMapId(savedActiveMapId: string | null, maps: MapProject[]): string | null {
  if (savedActiveMapId && maps.some((map) => map.id === savedActiveMapId)) {
    return savedActiveMapId;
  }

  return maps[0]?.id ?? null;
}

function migrateCurrentState(saved: IntermapState): IntermapState {
  const savedMaps = Array.isArray(saved.maps) ? saved.maps : [];
  const maps = savedMaps.length > 0
    ? savedMaps.map((map) => {
        const patched = map.id === TRAMIRE_MAP_ID ? { ...map, imageUrl: TRAMIRE_IMAGE_URL } : map;
        return migrateRemovedShapeIcons(patched as MapProject);
      })
    : [getBuiltInTramireMap()];

  return {
    maps,
    activeMapId: coerceActiveMapId(saved.activeMapId, maps),
  };
}

function migrateLegacyState(saved: IntermapState): IntermapState {
  const legacyMaps = Array.isArray(saved.maps) ? saved.maps : [];
  const maps = [
    getBuiltInTramireMap(),
    ...legacyMaps
      .filter((map) => map.id !== TRAMIRE_MAP_ID)
      .map((map) => migrateRemovedShapeIcons(map as MapProject)),
  ];

  return {
    maps,
    activeMapId: coerceActiveMapId(saved.activeMapId, maps),
  };
}

function loadState(): IntermapState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return migrateCurrentState(JSON.parse(raw) as IntermapState);
    }

    const legacyRaw = localStorage.getItem("intermap_v2");
    if (legacyRaw) {
      return migrateLegacyState(JSON.parse(legacyRaw) as IntermapState);
    }

    localStorage.removeItem("intermap_v1");
    return INITIAL_STATE; /*
    // Always patch the built-in Tramire map's imageUrl so stale cache doesn't show broken image
    // Also migrate: triangle/star shapes → square (these shapes were removed)
    const migrated = {
      ...saved,
      maps: saved.maps.map((m) => {
        const patched = m.id === "tramire" ? { ...m, imageUrl: TRAMIRE_IMAGE_URL } : m;
        return normalizeMapProject({
          ...patched,
          tagCategories: patched.tagCategories.map((cat) => ({
            ...cat,
            values: cat.values.map((v) => {
              if (v.icon.kind === "shape" && ((v.icon.shape as string) === "triangle" || (v.icon.shape as string) === "star")) {
                return { ...v, icon: { ...v.icon, shape: "square" as const } };
              }
              return v;
            }),
          })),
        } as MapProject);
      }),
    };
    return migrated; */
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state: IntermapState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch { /* quota exceeded — ignore */ }
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface IntermapStoreValue {
  state: IntermapState;
  dispatch: (action: IntermapAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Convenience: the currently active MapProject (or null) */
  activeMap: MapProject | null;
  /** Convenience: theme for the active map */
  theme: import("../types/intermap-types").MapTheme | null;
}

import React from "react";

export const IntermapContext = createContext<IntermapStoreValue | null>(null);

/** Provider — wrap the whole app with this. */
export function IntermapProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState);
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  /** Dispatch that pushes undo history and clears redo stack */
  const dispatch = (action: IntermapAction) => {
    undoStack.current.push({ maps: state.maps, activeMapId: state.activeMapId });
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    rawDispatch(action);
    forceRender();
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ maps: state.maps, activeMapId: state.activeMapId });
    rawDispatch({ type: "CREATE_MAP", map: prev.maps[0]! }); // hack — use RESTORE action
    // Proper restore: dispatch RESTORE
    forceRender();
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ maps: state.maps, activeMapId: state.activeMapId });
    forceRender();
  };

  // Persist on every state change
  useEffect(() => { saveState(state); }, [state]);

  const activeMap = state.maps.find((m) => m.id === state.activeMapId) ?? null;
  const theme = activeMap ? (MAP_THEMES.find((t) => t.id === activeMap.themeId) ?? MAP_THEMES[0]!) : null;

  return (
    <IntermapContext.Provider value={{
      state, dispatch, undo, redo,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
      activeMap,
      theme,
    }}>
      {children}
    </IntermapContext.Provider>
  );
}

/** Hook to access the store */
export function useIntermap(): IntermapStoreValue {
  const ctx = useContext(IntermapContext);
  if (!ctx) throw new Error("useIntermap must be used inside IntermapProvider");
  return ctx;
}
