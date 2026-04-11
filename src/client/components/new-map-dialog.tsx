/**
 * @file new-map-dialog.tsx
 * @description Modal dialog for creating a new map project.
 */

import { useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import {
  DEFAULT_MAP_THEME_MODE,
  getMapTheme,
  MAP_THEMES,
} from "../types/intermap-types";
import type { MapProject, MapThemeMode, TagCategory } from "../types/intermap-types";
import { createDefaultEventTagCategories } from "@/lib/intermap-helpers";

interface NewMapDialogProps {
  onClose: () => void;
  onCreate: (map: MapProject) => void;
}

const DEFAULT_TAG_CATEGORIES: TagCategory[] = [
  {
    id: "type",
    label: "地点类型",
    isLegend: true,
    isBuiltIn: true,
    values: [
      { id: "settlement", label: "居民点", icon: { kind: "shape", shape: "square", color: "#8B4513" } },
      { id: "natural", label: "自然地貌", icon: { kind: "shape", shape: "circle", color: "#2D6A2D" } },
      { id: "landmark", label: "地标", icon: { kind: "shape", shape: "square", color: "#1E40AF" } },
    ],
  },
  {
    id: "zone",
    label: "所属区域",
    isLegend: false,
    isBuiltIn: true,
    values: [],
  },
];

const APPEARANCE_OPTIONS: { value: MapThemeMode; label: string }[] = [
  { value: "dark", label: "深色背景" },
  { value: "light", label: "浅色背景" },
];

export function NewMapDialog({ onClose, onCreate }: NewMapDialogProps) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [themeId, setThemeId] = useState("parchment");
  const [themeMode, setThemeMode] = useState<MapThemeMode>(DEFAULT_MAP_THEME_MODE);
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
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

  const handleCreate = () => {
    if (!name.trim()) return;

    const newMap: MapProject = {
      id: `map_${Date.now()}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      imageUrl,
      themeId,
      themeMode,
      tagCategories: DEFAULT_TAG_CATEGORIES,
      locations: [],
      eventTagCategories: createDefaultEventTagCategories([]),
      events: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(newMap);
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...dialogStyle(selectedTheme),
          color: selectedTheme.heading,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: selectedTheme.heading }}>新建地图</div>
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
          onClick={handleCreate}
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
          创建地图
        </button>
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
