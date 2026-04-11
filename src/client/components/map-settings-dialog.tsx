/**
 * @file map-settings-dialog.tsx
 * @description Modal dialog for editing an existing map project's metadata.
 */

import { useRef, useState } from "react";
import { Check, Trash2, Upload, X } from "lucide-react";
import {
  DEFAULT_MAP_THEME_MODE,
  getMapTheme,
  MAP_THEMES,
} from "../types/intermap-types";
import type { MapProject, MapThemeMode } from "../types/intermap-types";
import { useIntermap } from "../store/intermap-store";

interface MapSettingsDialogProps {
  map: MapProject;
  onClose: () => void;
  onDeleted?: () => void;
}

const APPEARANCE_OPTIONS: { value: MapThemeMode; label: string }[] = [
  { value: "dark", label: "深色背景" },
  { value: "light", label: "浅色背景" },
];

export function MapSettingsDialog({ map, onClose, onDeleted }: MapSettingsDialogProps) {
  const { dispatch } = useIntermap();
  const [name, setName] = useState(map.name);
  const [nameEn, setNameEn] = useState(map.nameEn ?? "");
  const [imageUrl, setImageUrl] = useState(map.imageUrl);
  const [imagePreview, setImagePreview] = useState(map.imageUrl);
  const [themeId, setThemeId] = useState(map.themeId);
  const [themeMode, setThemeMode] = useState<MapThemeMode>(map.themeMode ?? DEFAULT_MAP_THEME_MODE);
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTheme = getMapTheme(themeId, themeMode);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageUrl(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    dispatch({
      type: "UPDATE_MAP_META",
      mapId: map.id,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      themeId,
      themeMode,
    });

    if (imageUrl !== map.imageUrl) {
      dispatch({
        type: "UPDATE_MAP_IMAGE",
        mapId: map.id,
        imageUrl,
      });
    }

    onClose();
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ ...dialogStyle(selectedTheme), color: selectedTheme.heading }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: selectedTheme.heading }}>地图设置</div>
          <button onClick={onClose} style={iconButtonStyle(selectedTheme)}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle(selectedTheme)}>地图名称（必填）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入地图名称..."
            maxLength={40}
            style={inputStyle(selectedTheme)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle(selectedTheme)}>English Name（可选）</label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Optional English name..."
            maxLength={60}
            style={inputStyle(selectedTheme)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle(selectedTheme)}>底图</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["url", "upload"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setImageTab(tab)}
                style={segmentedButtonStyle(selectedTheme, imageTab === tab)}
              >
                {tab === "url" ? "输入 URL" : "上传图片"}
              </button>
            ))}
          </div>

          {imageTab === "url" ? (
            <input
              value={imageUrl.startsWith("data:") ? "" : imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://..."
              style={inputStyle(selectedTheme)}
            />
          ) : (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} style={uploadButtonStyle(selectedTheme)}>
                <Upload size={14} />
                {imageUrl && imageUrl.startsWith("data:") ? "已选择图片" : "点击选择图片"}
              </button>
            </div>
          )}

          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              style={{ marginTop: 8, width: "100%", height: 84, objectFit: "cover", borderRadius: 8, border: `1px solid ${selectedTheme.accent}`, opacity: 0.85 }}
              onError={() => setImagePreview("")}
            />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle(selectedTheme)}>背景风格</label>
          <div style={{ display: "flex", gap: 8 }}>
            {APPEARANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setThemeMode(option.value)}
                style={segmentedButtonStyle(selectedTheme, themeMode === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle(selectedTheme)}>主题风格</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MAP_THEMES.map((themeOption) => {
              const previewTheme = getMapTheme(themeOption.id, themeMode);
              const isActive = themeId === themeOption.id;
              return (
                <button
                  key={themeOption.id}
                  onClick={() => setThemeId(themeOption.id)}
                  title={themeOption.label}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    border: isActive ? `3px solid ${previewTheme.primary}` : `2px solid ${previewTheme.accent}`,
                    background: previewTheme.bg,
                    cursor: "pointer",
                    position: "relative",
                    boxShadow: isActive ? `0 0 0 3px ${previewTheme.primary}22` : "none",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ width: 17, height: 17, borderRadius: "50%", background: previewTheme.primary, display: "block" }} />
                  {isActive && (
                    <div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: previewTheme.primary, whiteSpace: "nowrap" }}>
                      {previewTheme.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ height: 20 }} />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            border: `1px solid ${selectedTheme.primary}`,
            background: `${selectedTheme.primary}22`,
            color: selectedTheme.heading,
            cursor: name.trim() ? "pointer" : "not-allowed",
            fontSize: 14,
            fontFamily: "Georgia, serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: name.trim() ? 1 : 0.5,
          }}
        >
          <Check size={15} />
          保存设置
        </button>

        <div style={{ height: 1, background: selectedTheme.accent, margin: "16px 0 12px", opacity: 0.45 }} />

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={deleteButtonStyle}>
            <Trash2 size={13} />
            删除这张地图
          </button>
        ) : (
          <div style={{ background: "rgba(180,60,60,0.1)", border: "1px solid rgba(180,60,60,0.4)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#E88080", marginBottom: 10, textAlign: "center", lineHeight: 1.65 }}>
              确定要删除“{map.name}”吗？
              <br />
              <span style={{ opacity: 0.78, fontSize: 11 }}>地图及其所有地点、事件数据都会被永久删除，无法恢复。</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={cancelDeleteButtonStyle(selectedTheme)}>
                取消
              </button>
              <button
                onClick={() => {
                  dispatch({ type: "DELETE_MAP", mapId: map.id });
                  onDeleted?.();
                  onClose();
                }}
                style={confirmDeleteButtonStyle}
              >
                确认删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

function dialogStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 500,
    background: theme.bg,
    border: `1px solid ${theme.accent}`,
    borderRadius: 14,
    padding: "20px 24px",
    fontFamily: "Georgia, serif",
    boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
  };
}

function labelStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  return {
    fontSize: 12,
    color: theme.muted,
    display: "block",
    marginBottom: 6,
  };
}

function inputStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  const isLightMode = theme.bg === theme.modes.light.bg;
  return {
    width: "100%",
    padding: "8px 10px",
    background: isLightMode ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${theme.accent}`,
    borderRadius: 8,
    color: theme.heading,
    fontSize: 13,
    outline: "none",
    fontFamily: "Georgia, serif",
    boxSizing: "border-box",
  };
}

function segmentedButtonStyle(theme: ReturnType<typeof getMapTheme>, active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 7,
    border: `1px solid ${active ? theme.primary : theme.accent}`,
    background: active ? `${theme.primary}22` : "transparent",
    color: active ? theme.primary : theme.muted,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Georgia, serif",
  };
}

function uploadButtonStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px",
    border: `1.5px dashed ${theme.accent}`,
    borderRadius: 8,
    background: "transparent",
    color: theme.muted,
    cursor: "pointer",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontFamily: "Georgia, serif",
  };
}

function iconButtonStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    color: theme.muted,
    cursor: "pointer",
    padding: 4,
  };
}

const deleteButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: 8,
  border: "1px solid rgba(180,60,60,0.35)",
  background: "rgba(180,60,60,0.08)",
  color: "#C86060",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "Georgia, serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

function cancelDeleteButtonStyle(theme: ReturnType<typeof getMapTheme>): React.CSSProperties {
  return {
    flex: 1,
    padding: "7px",
    borderRadius: 6,
    border: `1px solid ${theme.accent}`,
    background: "transparent",
    color: theme.muted,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Georgia, serif",
  };
}

const confirmDeleteButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "7px",
  borderRadius: 6,
  border: "1px solid rgba(180,60,60,0.6)",
  background: "rgba(180,60,60,0.2)",
  color: "#E88080",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "Georgia, serif",
  fontWeight: "bold",
};
