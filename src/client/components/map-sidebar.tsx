/**
 * @file map-sidebar.tsx
 * @description Globe-style sidebar showing all maps.
 * Features:
 * - Vertical icon strip on the left edge
 * - Each map shown as a circular thumbnail with its name
 * - Active map highlighted with theme color ring
 * - "+" button at bottom to create a new map
 * - Hovering reveals map name tooltip
 */

import { useState, useRef } from "react";
import { Plus, Globe, Map as MapIcon, FolderOpen } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import { getMapTheme } from "../types/intermap-types";
import type { MapProject } from "../types/intermap-types";

interface MapSidebarProps {
  onCreateNew: () => void;
  onEditMap: (mapId: string) => void;
}

/**
 * Vertical sidebar listing all map projects.
 * Clicking a map sets it as active; "+" opens the creation dialog.
 */
export function MapSidebar({ onCreateNew, onEditMap }: MapSidebarProps) {
  const { state, dispatch, activeMap } = useIntermap();
  const [hovered, setHovered] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const shellTheme = getMapTheme(activeMap?.themeId, activeMap?.themeMode);
  const isLightShell = shellTheme.bg === shellTheme.modes.light.bg;
  const sidebarBg = isLightShell ? shellTheme.bg : `${shellTheme.bg}F2`;
  const sidebarBorder = shellTheme.accent;
  const tooltipBg = isLightShell ? "#FFFFFF" : `${shellTheme.bg}F7`;
  const tooltipShadow = isLightShell ? "0 6px 18px rgba(80,60,30,0.12)" : "0 2px 12px rgba(0,0,0,0.6)";
  const chromeMuted = isLightShell ? shellTheme.muted : "rgba(180,140,60,0.7)";

  /** Read a JSON file and import it as a new MapProject */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw) as MapProject;
        // Basic validation: must have id, name, locations array, tagCategories array
        if (!parsed.id || !parsed.name || !Array.isArray(parsed.locations) || !Array.isArray(parsed.tagCategories)) {
          alert("文件格式不正确，请确认是从本应用导出的地图 JSON 文件。");
          return;
        }
        // Give it a new id to avoid collision with existing maps
        const newMap: MapProject = {
          ...parsed,
          id: `imported_${Date.now()}`,
          name: parsed.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        dispatch({ type: "CREATE_MAP", map: newMap });
      } catch {
        alert("JSON 解析失败，请确认文件内容是否完整。");
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = "";
  };

  return (
    <div
      style={{
        width: 56,
        height: "100%",
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
        gap: 6,
        flexShrink: 0,
        zIndex: 50,
        overflowY: "auto",
        overflowX: "visible",
      }}
    >
      {/* App globe icon */}
      <div
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: chromeMuted,
          marginBottom: 6,
        }}
      >
        <Globe size={20} />
      </div>

      {/* Divider */}
      <div style={{ width: 28, height: 1, background: `${shellTheme.accent}AA`, flexShrink: 0 }} />

      {/* Map list */}
      {state.maps.map((map) => {
        const theme = getMapTheme(map.themeId, map.themeMode);
        const isActive = map.id === activeMap?.id;
        const isHovered = hovered === map.id;

        return (
          <div key={map.id} style={{ position: "relative", flexShrink: 0 }}>
            {/* Tooltip */}
            {isHovered && (
              <div
                style={{
                  position: "absolute",
                  left: 46,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: tooltipBg,
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                  color: theme.heading,
                  fontSize: 12,
                  pointerEvents: "none",
                  zIndex: 100,
                  boxShadow: tooltipShadow,
                }}
              >
                {map.name}
                {map.nameEn && (
                  <span style={{ color: theme.muted, marginLeft: 6, fontSize: 10 }}>{map.nameEn}</span>
                )}
              </div>
            )}

            <button
              onClick={() => dispatch({ type: "SET_ACTIVE_MAP", mapId: map.id })}
              onDoubleClick={(e) => { e.stopPropagation(); onEditMap(map.id); }}
              onMouseEnter={() => setHovered(map.id)}
              onMouseLeave={() => setHovered(null)}
              title={`${map.name}（双击编辑设置）`}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: isActive
                  ? `2.5px solid ${theme.primary}`
                  : `2px solid ${shellTheme.accent}`,
                background: isActive
                  ? `${theme.accent}`
                  : isLightShell
                    ? "rgba(255,255,255,0.82)"
                    : "rgba(30,24,12,0.8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: isActive
                  ? `0 0 10px ${theme.primary}44`
                  : isLightShell
                    ? "0 2px 6px rgba(80,60,30,0.08)"
                    : "none",
                overflow: "hidden",
                padding: 0,
              }}
            >
              {map.imageUrl ? (
                <img
                  src={map.imageUrl}
                  alt={map.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: isActive ? 1 : 0.6,
                  }}
                />
              ) : (
                <MapIcon size={16} style={{ color: isActive ? theme.primary : shellTheme.muted }} />
              )}
            </button>
          </div>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        style={{ display: "none" }}
      />

      {/* Import map button */}
      <button
        onClick={() => importInputRef.current?.click()}
        title="导入地图 JSON"
        onMouseEnter={() => setHovered("__import__")}
        onMouseLeave={() => setHovered(null)}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: `1.5px dashed ${shellTheme.accent}`,
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: shellTheme.muted,
          transition: "all 0.2s",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <FolderOpen size={15} />
        {hovered === "__import__" && (
          <div
            style={{
              position: "absolute",
              left: 46,
              top: "50%",
              transform: "translateY(-50%)",
              background: tooltipBg,
              border: `1px solid ${shellTheme.accent}`,
              borderRadius: 6,
              padding: "4px 10px",
              whiteSpace: "nowrap",
              color: shellTheme.heading,
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 100,
              boxShadow: tooltipShadow,
            }}
          >
            导入地图 JSON
          </div>
        )}
      </button>

      {/* Create new map button */}
      <button
        onClick={onCreateNew}
        title="新建地图"
        onMouseEnter={() => setHovered("__new__")}
        onMouseLeave={() => setHovered(null)}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: `1.5px dashed ${shellTheme.accent}`,
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: shellTheme.primary,
          transition: "all 0.2s",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <Plus size={16} />
        {hovered === "__new__" && (
          <div
            style={{
              position: "absolute",
              left: 46,
              top: "50%",
              transform: "translateY(-50%)",
              background: tooltipBg,
              border: `1px solid ${shellTheme.accent}`,
              borderRadius: 6,
              padding: "4px 10px",
              whiteSpace: "nowrap",
              color: shellTheme.heading,
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 100,
              boxShadow: tooltipShadow,
            }}
          >
            新建地图
          </div>
        )}
      </button>
    </div>
  );
}
