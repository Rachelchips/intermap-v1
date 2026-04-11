/**
 * @file intermap-types.ts
 * @description Core type definitions for the Intermap multi-map system.
 */

export type TagIcon =
  | { kind: "shape"; shape: "circle" | "square" | "diamond"; color: string; opacity?: number; borderColor?: string }
  | { kind: "emoji"; emoji: string; bgColor?: string | null; bgOpacity?: number; borderColor?: string }
  | { kind: "none" };

export interface TagValue {
  id: string;
  label: string;
  icon: TagIcon;
}

export interface TagCategory {
  id: string;
  label: string;
  isLegend: boolean;
  isBuiltIn: boolean;
  values: TagValue[];
}

export interface MapLocation {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  x: number;
  y: number;
  imageUrl?: string;
  tags: Record<string, string>;
}

export type EventTime =
  | { kind: "point"; value: string }
  | { kind: "range"; start: string; end: string };

export interface EventSortTime {
  era: "bce" | "ce";
  year: number;
  month: number;
  day: number;
}

export interface MapEvent {
  id: string;
  name: string;
  nameEn?: string;
  time?: EventTime;
  sortTime?: EventSortTime;
  description: string;
  x: number;
  y: number;
  imageUrl?: string;
  tags: Record<string, string>;
}

export type MapThemeMode = "dark" | "light";

export interface ThemeSurface {
  bg: string;
  accent: string;
  heading: string;
  muted: string;
}

export interface MapTheme extends ThemeSurface {
  id: string;
  label: string;
  primary: string;
  modes: Record<MapThemeMode, ThemeSurface>;
}

export const DEFAULT_MAP_THEME_ID = "parchment";
export const DEFAULT_MAP_THEME_MODE: MapThemeMode = "dark";

export const MAP_THEMES: MapTheme[] = [
  {
    id: "parchment",
    label: "羊皮纸",
    primary: "#C8A860",
    bg: "#1A1208",
    accent: "#6E5422",
    heading: "#F0E0B0",
    muted: "#8A7050",
    modes: {
      dark: {
        bg: "#1A1208",
        accent: "#6E5422",
        heading: "#F0E0B0",
        muted: "#8A7050",
      },
      light: {
        bg: "#F3E8CE",
        accent: "#C9AC6A",
        heading: "#4A3312",
        muted: "#8B6A3E",
      },
    },
  },
  {
    id: "ocean",
    label: "深海蓝",
    primary: "#4E86B7",
    bg: "#0D1B26",
    accent: "#2E5572",
    heading: "#E2EDF5",
    muted: "#84A2B8",
    modes: {
      dark: {
        bg: "#0D1B26",
        accent: "#2E5572",
        heading: "#E2EDF5",
        muted: "#84A2B8",
      },
      light: {
        bg: "#EAF3F8",
        accent: "#9EBED2",
        heading: "#203B50",
        muted: "#5F7C91",
      },
    },
  },
  {
    id: "forest",
    label: "苔林绿",
    primary: "#6E9A63",
    bg: "#10170F",
    accent: "#466343",
    heading: "#E6F0E0",
    muted: "#8CA088",
    modes: {
      dark: {
        bg: "#10170F",
        accent: "#466343",
        heading: "#E6F0E0",
        muted: "#8CA088",
      },
      light: {
        bg: "#EEF5EA",
        accent: "#A7C49D",
        heading: "#294127",
        muted: "#667F60",
      },
    },
  },
  {
    id: "ember",
    label: "炉灰红",
    primary: "#C6544B",
    bg: "#1D100F",
    accent: "#7F312C",
    heading: "#F3DEDB",
    muted: "#AE7A75",
    modes: {
      dark: {
        bg: "#1D100F",
        accent: "#7F312C",
        heading: "#F3DEDB",
        muted: "#AE7A75",
      },
      light: {
        bg: "#FAECE8",
        accent: "#D99A93",
        heading: "#5D201C",
        muted: "#8E5C58",
      },
    },
  },
  {
    id: "snow",
    label: "霜湖灰",
    primary: "#8FA4B3",
    bg: "#151A1F",
    accent: "#4B6070",
    heading: "#EEF4F7",
    muted: "#8C9BA6",
    modes: {
      dark: {
        bg: "#151A1F",
        accent: "#4B6070",
        heading: "#EEF4F7",
        muted: "#8C9BA6",
      },
      light: {
        bg: "#F2F6F8",
        accent: "#C4D1D8",
        heading: "#2B3B45",
        muted: "#657782",
      },
    },
  },
  {
    id: "blossom",
    label: "花雾粉",
    primary: "#CC7D9A",
    bg: "#1E1217",
    accent: "#7A4356",
    heading: "#F6DFE8",
    muted: "#A77A89",
    modes: {
      dark: {
        bg: "#1E1217",
        accent: "#7A4356",
        heading: "#F6DFE8",
        muted: "#A77A89",
      },
      light: {
        bg: "#FCEFF3",
        accent: "#E2B0C0",
        heading: "#5B2438",
        muted: "#8D5F70",
      },
    },
  },
  {
    id: "mint",
    label: "薄荷绿",
    primary: "#56B79A",
    bg: "#0D1714",
    accent: "#2C6F60",
    heading: "#E1F6F0",
    muted: "#7EA69A",
    modes: {
      dark: {
        bg: "#0D1714",
        accent: "#2C6F60",
        heading: "#E1F6F0",
        muted: "#7EA69A",
      },
      light: {
        bg: "#ECFBF6",
        accent: "#A9DCCC",
        heading: "#1E4F44",
        muted: "#5D8B80",
      },
    },
  },
  {
    id: "lemon",
    label: "柠霜黄",
    primary: "#C8B54E",
    bg: "#1A180C",
    accent: "#77691F",
    heading: "#F5F0CF",
    muted: "#9D9358",
    modes: {
      dark: {
        bg: "#1A180C",
        accent: "#77691F",
        heading: "#F5F0CF",
        muted: "#9D9358",
      },
      light: {
        bg: "#FBF8E6",
        accent: "#DCCC86",
        heading: "#55470D",
        muted: "#807233",
      },
    },
  },
  {
    id: "lilac",
    label: "浅丁香",
    primary: "#9582C3",
    bg: "#17131B",
    accent: "#57487C",
    heading: "#EEE7FA",
    muted: "#8E83A7",
    modes: {
      dark: {
        bg: "#17131B",
        accent: "#57487C",
        heading: "#EEE7FA",
        muted: "#8E83A7",
      },
      light: {
        bg: "#F3F0FB",
        accent: "#C7BCE5",
        heading: "#3D305F",
        muted: "#6F6391",
      },
    },
  },
];

export function resolveMapTheme(theme: MapTheme, mode: MapThemeMode = DEFAULT_MAP_THEME_MODE): MapTheme {
  const resolvedMode = mode === "light" ? "light" : "dark";
  return {
    ...theme,
    ...theme.modes[resolvedMode],
  };
}

export function getMapTheme(themeId: string | undefined, mode: MapThemeMode = DEFAULT_MAP_THEME_MODE): MapTheme {
  const theme = MAP_THEMES.find((item) => item.id === themeId) ?? MAP_THEMES[0]!;
  return resolveMapTheme(theme, mode);
}

export interface MapProject {
  id: string;
  name: string;
  nameEn?: string;
  imageUrl: string;
  themeId: string;
  themeMode?: MapThemeMode;
  markerScale?: {
    location: number;
    event: number;
  };
  tagCategories: TagCategory[];
  locations: MapLocation[];
  eventTagCategories: TagCategory[];
  events: MapEvent[];
  createdAt: number;
  updatedAt: number;
}

export interface IntermapState {
  maps: MapProject[];
  activeMapId: string | null;
}

export interface HistoryEntry {
  maps: MapProject[];
  activeMapId: string | null;
}

export interface MapViewState {
  scale: number;
  translateX: number;
  translateY: number;
}
