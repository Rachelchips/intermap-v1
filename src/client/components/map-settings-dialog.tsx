/**
 * @file map-settings-dialog.tsx
 * @description Modal dialog for editing an existing map project's metadata.
 * Allows changing:
 * - Chinese name (required)
 * - English name (optional)
 * - Background image (URL or file upload)
 * - Theme color preset
 *
 * How it works:
 * 1. Pre-fills all fields from the existing MapProject passed in via `map` prop
 * 2. User edits fields; image preview updates live
 * 3. On save, dispatches UPDATE_MAP_META (name + theme) and UPDATE_MAP_IMAGE (imageUrl if changed)
 * 4. onClose fires to dismiss the modal
 */

import { useState, useRef } from "react";
import { X, Upload, Check, Trash2 } from "lucide-react";
import { MAP_THEMES } from "../types/intermap-types";
import type { MapProject } from "../types/intermap-types";
import { useIntermap } from "../store/intermap-store";

interface MapSettingsDialogProps {
  map: MapProject;
  onClose: () => void;
  /** Called after the map is deleted so parent can close the dialog */
  onDeleted?: () => void;
}

/**
 * Full-screen modal for editing an existing map's settings.
 * Pre-fills from the current MapProject, dispatches store updates on save.
 */
export function MapSettingsDialog({ map, onClose, onDeleted }: MapSettingsDialogProps) {
  const { dispatch } = useIntermap();
  const [name, setName] = useState(map.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nameEn, setNameEn] = useState(map.nameEn ?? "");
  const [imageUrl, setImageUrl] = useState(map.imageUrl);
  const [imagePreview, setImagePreview] = useState(map.imageUrl);
  const [themeId, setThemeId] = useState(map.themeId);
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

  const handleSave = () => {
    if (!name.trim()) return;
    // Save name + English name + theme
    dispatch({
      type: "UPDATE_MAP_META",
      mapId: map.id,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      themeId,
    });
    // Save imageUrl if it changed
    if (imageUrl !== map.imageUrl) {
      dispatch({
        type: "UPDATE_MAP_IMAGE",
        mapId: map.id,
        imageUrl,
      });
    }
    onClose();
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
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#F0E0B0" }}>地图设置</div>
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
              onError={() => setImagePreview("")}
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

        {/* Save button */}
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
            transition: "all 0.2s",
          }}
        >
          <Check size={15} />
          保存设置
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(180,140,60,0.15)", margin: "16px 0 12px" }} />

        {/* Delete map */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
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
              transition: "all 0.2s",
            }}
          >
            <Trash2 size={13} />
            删除这张地图
          </button>
        ) : (
          <div style={{ background: "rgba(180,60,60,0.1)", border: "1px solid rgba(180,60,60,0.4)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "#E88080", marginBottom: 10, textAlign: "center" }}>
              确定要删除「{map.name}」吗？<br />
              <span style={{ opacity: 0.7, fontSize: 11 }}>地图及其所有地点数据将永久删除，无法恢复。</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid rgba(180,140,60,0.3)", background: "transparent", color: "#A89060", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  dispatch({ type: "DELETE_MAP", mapId: map.id });
                  onDeleted?.();
                  onClose();
                }}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "1px solid rgba(180,60,60,0.6)", background: "rgba(180,60,60,0.2)", color: "#E88080", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", fontWeight: "bold" }}
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
