# Project Structure

## 1. Tech Stack

- Framework: React 19, TanStack Start (SSR), TanStack Router
- Styling: Tailwind CSS v4, inline styles for map components
- Server: tRPC on H3
- Data: React Query, Zod

## 2. Directory Structure

```
src/
├── client/
│   ├── components/
│   │   ├── location-marker.tsx      # Pin marker for a location
│   │   └── location-detail-panel.tsx # Sidebar info panel
│   ├── data/
│   │   └── locations-data.ts        # All 40+ Tramire locations
│   ├── types/
│   │   └── map-types.ts             # LocationData, LocationType, MapViewState
│   └── views/
│       └── map-view.tsx             # Main interactive map page
├── routes/
│   ├── __root.tsx
│   └── index.tsx                    # Renders MapView
└── server/trpc/
```

## 3. Core Modules

### 3.0c MapSettingsDialog (src/client/components/map-settings-dialog.tsx)
Modal for editing an existing map's name, English name, background image, and theme. Opened by double-clicking a map icon in the sidebar. Dispatches UPDATE_MAP_META and UPDATE_MAP_IMAGE.

### 3.0 TagManager (src/client/components/tag-manager.tsx)
Modal panel for managing tag categories and values. Supports create/rename/delete for both categories and values, icon picker (shape+color+opacity / emoji / default), location assignment checklist per value, and set-as-legend toggle.

### 3.0b IntermapFilterPanel (src/client/components/intermap-filter-panel.tsx)
Dynamic filter panel driven by active map's tag categories. Replaces static filter-panel.tsx for the Intermap system. Toggle button on left edge, collapsible sections per category.

### 3.1 MapView (src/client/views/map-view.tsx)
Main map component. Handles pan/zoom via mouse events, renders all markers, manages selected location and repositioning state.

### 3.2 LocationMarker (src/client/components/location-marker.tsx)
Absolute-positioned button pin at (x%, y%) on the map image.

### 3.3 LocationDetailPanel (src/client/components/location-detail-panel.tsx)
Slide-in right panel showing full location info and reposition controls.

## 4. Routes

| Path | File             | Description         |
| ---- | ---------------- | ------------------- |
| /    | routes/index.tsx | Interactive map page |

## 5. Data Flow

### 5.1 State Management
- `locations`: useState array of LocationData (initialized from INITIAL_LOCATIONS)
- `selectedId`: string | null — which location is open
- `repositioning`: boolean — whether click-to-move mode is active
- `view`: MapViewState — current pan/zoom transform

### 5.2 Repositioning
When user clicks "修改位置" → repositioning=true → next map click calculates (x%, y%) from click position relative to the map image element → updates location in state.
