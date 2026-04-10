/**
 * @file new-map-dialog.tsx
 * @description Modal dialog for creating a new map project.
 * Steps:
 * 1. Enter map name (Chinese required, English optional)
 * 2. Upload or paste a background image URL
 * 3. Choose a theme color preset
 * 4. Submit to create the map
 */

import { useState, useRef } from "react";
import { X, Upload, Check } from "lucide-react";
import { MAP_THEMES } from "../types/intermap-types";
import type { MapProject, TagCategory } from "../types/intermap-types";
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
      { id: "settlement", label: "居民点",   icon: { kind: "shape", shape: "square",  color: "#8B4513" } },
      { id: "natural",    label: "自然地貌", icon: { kind: "shape", shape: "circle",  color: "#2D6A2D" } },
      { id: "landmark",   label: "地标",   icon: { kind: "shape", shape: "square",  color: "#1E40AF" } },
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

/**
 * Full-screen modal for new map creation.
 * Handles file input via FileReader to convert uploaded images to data URLs.
 */
export function NewMapDialog({ onClose, onCreate }: NewMapDialogProps) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [themeId, setThemeId] = useState("parchment");
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const fileRef = useRef<HTMLInputElement>(null);

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
    const theme = MAP_THEMES.find((t) => t.id === themeId) ?? MAP_THEMES[0]!;
    const newMap: MapProject = {
      id: `map_${Date.now()}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      imageUrl,
      themeId,
      tagCategories: DEFAULT_TAG_CATEGORIES,
      locations: [],
      eventTagCategories: createDefaultEventTagCategories([]),
      events: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    void theme;
    onCreate(newMap);
  };

  const selectedTheme = MAP_THEMES.find((t) => t.id === themeId) ?? MAP_THEMES[0]!;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#1a1208",
          border: "1px solid rgba(180,140,60,0.4)",
          borderRadius: 12,
          padding: "20px 24px",
          color: "#E8DCC8",
          fontFamily: "Georgia, serif",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#F0E0B0" }}>新建地图</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#A89060", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Name fields */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#8A7050", display: "block", marginBottom: 5 }}>地图名称（必填）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入地图名称..."
            maxLength={40}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#8A7050", display: "block", marginBottom: 5 }}>English Name（可选）</label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Optional English name..."
            maxLength={60}
            style={inputStyle}
          />
        </div>

        {/* Image input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#8A7050", display: "block", marginBottom: 6 }}>底图</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["url", "upload"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setImageTab(tab)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: `1px solid ${imageTab === tab ? "rgba(180,140,60,0.6)" : "rgba(180,140,60,0.2)"}`,
                  background: imageTab === tab ? "rgba(180,140,60,0.15)" : "transparent",
                  color: imageTab === tab ? "#C8A860" : "#7A6040",
                  cursor: "pointer",
                  fontSize: 12,
                }}
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
              style={inputStyle}
            />
          ) : (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1.5px dashed rgba(180,140,60,0.35)",
                  borderRadius: 6,
                  background: "transparent",
                  color: "#8A7050",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Upload size={14} />
                {imageUrl && imageUrl.startsWith("data:") ? "已选择图片 ✓" : "点击选择图片"}
              </button>
            </div>
          )}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              style={{ marginTop: 8, width: "100%", height: 80, objectFit: "cover", borderRadius: 6, opacity: 0.7 }}
            />
          )}
        </div>

        {/* Theme picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#8A7050", display: "block", marginBottom: 8 }}>主题风格</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MAP_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                title={t.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: themeId === t.id ? `3px solid ${t.primary}` : "2px solid rgba(180,140,60,0.2)",
                  background: t.bg,
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: themeId === t.id ? `0 0 8px ${t.primary}88` : "none",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.primary, display: "block" }} />
                {themeId === t.id && (
                  <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: t.primary, whiteSpace: "nowrap" }}>
                    {t.label}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ height: 18 }} />
        </div>

        {/* Submit */}
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
            transition: "all 0.2s",
          }}
        >
          <Check size={15} />
          创建地图
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(180,140,60,0.3)",
  borderRadius: 6,
  color: "#E8DCC8",
  fontSize: 13,
  outline: "none",
  fontFamily: "Georgia, serif",
  boxSizing: "border-box",
};
