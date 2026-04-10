/**
 * @file intermap-app.tsx
 * @description Root shell for the Intermap application.
 * Composes:
 * - MapSidebar: vertical strip on the left listing all map projects
 * - IntermapMapView: the main interactive map view for the active map
 * - NewMapDialog: modal for creating a new map project
 * - MapSettingsDialog: modal for editing an existing map's name/image/theme (opened by double-clicking sidebar icon)
 *
 * How it works:
 * 1. Renders the MapSidebar with onCreateNew and onEditMap callbacks
 * 2. When onCreateNew fires, shows the NewMapDialog modal
 * 3. On dialog submit, dispatches CREATE_MAP to the store
 * 4. When onEditMap fires (double-click on a map icon), shows MapSettingsDialog for that map
 * 5. IntermapMapView reads activeMap from the store and renders accordingly
 */

import { useState } from "react";
import { MapSidebar } from "../components/map-sidebar";
import { NewMapDialog } from "../components/new-map-dialog";
import { MapSettingsDialog } from "../components/map-settings-dialog";
import { IntermapMapView } from "./intermap-map-workbench";
import { useIntermap } from "../store/intermap-store";
import type { MapProject } from "../types/intermap-types";

/**
 * Top-level app shell.
 * Full viewport, dark background, horizontal flex layout:
 * [56px sidebar] | [flex-1 map view]
 */
export function IntermapApp() {
  const { dispatch, state } = useIntermap();
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);

  const handleCreate = (map: MapProject) => {
    dispatch({ type: "CREATE_MAP", map });
    setShowNewMapDialog(false);
  };

  const editingMap = editingMapId ? state.maps.find((m) => m.id === editingMapId) ?? null : null;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        background: "#0e0b06",
        fontFamily: "Georgia, 'Times New Roman', serif",
        touchAction: "none",
      }}
    >
      {/* Left sidebar — map switcher */}
      <MapSidebar
        onCreateNew={() => setShowNewMapDialog(true)}
        onEditMap={(mapId) => setEditingMapId(mapId)}
      />

      {/* Main map view */}
      <IntermapMapView />

      {/* New map creation dialog */}
      {showNewMapDialog && (
        <NewMapDialog
          onClose={() => setShowNewMapDialog(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Map settings dialog — opened by double-clicking a map icon in the sidebar */}
      {editingMap && (
        <MapSettingsDialog
          map={editingMap}
          onClose={() => setEditingMapId(null)}
          onDeleted={() => setEditingMapId(null)}
        />
      )}
    </div>
  );
}
