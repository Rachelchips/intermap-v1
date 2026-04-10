/**
 * @file location-editor.tsx
 * @description Modal dialog for creating or editing a map location.
 * Fields: Chinese name, English name (optional), description (max 250),
 * image (optional upload), coordinates (x/y sliders), and tags.
 *
 * How it works:
 * 1. Accepts full theme object (primary, heading, bg, accent, muted)
 * 2. If `existing` is provided, pre-fills all fields for editing
 * 3. Image upload converts local file to base64 data URL; can be cleared
 * 4. On save, calls onSave with a complete MapLocation object
 */

import { useState, useRef } from "react";
import { X, Check, ImagePlus, Trash2, Crop, RotateCcw } from "lucide-react";
import type { MapLocation, TagCategory } from "../types/intermap-types";
import { TagIconRenderer } from "./tag-icon-renderer";
import { ImageCropModal } from "./image-crop-modal";

interface LocationEditorProps {
  /** If provided, we're editing; otherwise creating */
  existing?: MapLocation;
  tagCategories: TagCategory[];
  onClose: () => void;
  onSave: (location: MapLocation) => void;
  /** Theme colors */
  themeColor: string;
  themeHeading: string;
  themeBg?: string;
  themeAccent?: string;
  themeMuted?: string;
}

/**
 * Create/edit location modal.
 * - Generates a random id for new locations
 * - Initial x/y is randomized within the center of the map if creating
 * - Tags default to first value per category
 * - Image is optional: upload converts to base64, can be cleared at any time
 */
export function LocationEditor({
  existing,
  tagCategories,
  onClose,
  onSave,
  themeColor,
  themeHeading,
  themeBg = "#1a1208",
  themeAccent = "rgba(180,140,60,0.3)",
  themeMuted = "#8A7050",
}: LocationEditorProps) {
  const isNew = !existing;

  const defaultTags: Record<string, string> = {};
  tagCategories.forEach((cat) => {
    defaultTags[cat.id] = existing?.tags[cat.id] ?? cat.values[0]?.id ?? "";
  });

  const [name, setName] = useState(existing?.name ?? "");
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(existing?.imageUrl);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>(existing?.imageUrl);
  const [cropOpen, setCropOpen] = useState(false);
  const [x, setX] = useState(existing?.x ?? Math.round(30 + Math.random() * 40));
  const [y, setY] = useState(existing?.y ?? Math.round(30 + Math.random() * 40));
  const [tags, setTags] = useState<Record<string, string>>(defaultTags);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Convert uploaded image to base64 data URL */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (typeof result === "string") {
        setImageUrl(result);
        setOriginalImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so re-selecting the same file fires onChange again
    e.target.value = "";
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const location: MapLocation = {
      id: existing?.id ?? `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      description: description.slice(0, 250),
      imageUrl: imageUrl || undefined,
      x,
      y,
      tags,
    };
    onSave(location);
  };

  // Dynamic input style using theme colors
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${themeAccent}`,
    borderRadius: 6,
    color: "#E8DCC8",
    fontSize: 13,
    outline: "none",
    fontFamily: "Georgia, serif",
    boxSizing: "border-box",
  };

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
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: themeBg,
          border: `1px solid ${themeColor}66`,
          borderRadius: 12,
          padding: "20px 24px",
          color: "#E8DCC8",
          fontFamily: "Georgia, serif",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: "bold", color: themeHeading }}>
            {isNew ? "新建地点" : "编辑地点"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: themeMuted, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <Field label="地点名称（必填）" muted={themeMuted}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="输入地点名称..." maxLength={40} style={inputStyle} />
        </Field>

        {/* English name */}
        <Field label="English Name（可选）" muted={themeMuted}>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)}
            placeholder="Optional English name..." maxLength={60} style={inputStyle} />
        </Field>

        {/* Description */}
        <Field label={`简介（${description.length}/250）`} muted={themeMuted}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 250))}
            placeholder="描述这个地点..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          />
        </Field>

        {/* Image (optional) */}
        <Field label="配图（可选）" muted={themeMuted}>
          {imageUrl ? (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${themeAccent}` }}>
              <img
                src={imageUrl}
                alt="配图预览"
                style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }}
              />
              {/* Crop + Remove buttons */}
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 5 }}>
                <button
                  onClick={() => setCropOpen(true)}
                  title="裁剪配图"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    border: `1px solid ${themeAccent}`,
                    borderRadius: 6,
                    color: "#E8DCC8",
                    cursor: "pointer",
                    padding: "3px 6px",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11,
                  }}
                >
                  <Crop size={12} /> 裁剪
                </button>
                {originalImageUrl && imageUrl !== originalImageUrl && (
                  <button
                    onClick={() => setImageUrl(originalImageUrl)}
                    title="恢复原图"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      border: `1px solid ${themeAccent}`,
                      borderRadius: 6,
                      color: "#E8DCC8",
                      cursor: "pointer",
                      padding: "3px 6px",
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <RotateCcw size={12} /> 恢复
                  </button>
                )}
                <button
                  onClick={() => {
                    setImageUrl(undefined);
                    setOriginalImageUrl(undefined);
                  }}
                  title="移除配图"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    border: `1px solid ${themeAccent}`,
                    borderRadius: 6,
                    color: "#E8DCC8",
                    cursor: "pointer",
                    padding: "3px 6px",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11,
                  }}
                >
                  <Trash2 size={12} /> 移除
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "20px 0",
                background: "rgba(255,255,255,0.03)",
                border: `1.5px dashed ${themeAccent}`,
                borderRadius: 8,
                color: themeMuted,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                transition: "all 0.15s",
              }}
            >
              <ImagePlus size={22} color={themeMuted} />
              点击上传图片
            </button>
          )}
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </Field>

        {/* Coordinates */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: themeMuted, display: "block", marginBottom: 6 }}>坐标</label>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: themeMuted, opacity: 0.8, marginBottom: 3 }}>X = {x.toFixed(1)}%</div>
              <input type="range" min={0} max={100} step={0.5} value={x}
                onChange={(e) => setX(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: themeColor }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: themeMuted, opacity: 0.8, marginBottom: 3 }}>Y = {y.toFixed(1)}%</div>
              <input type="range" min={0} max={100} step={0.5} value={y}
                onChange={(e) => setY(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: themeColor }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: themeMuted, opacity: 0.6, marginTop: 4 }}>也可以保存后在地图上拖拽移动</div>
        </div>

        {/* Tags */}
        {tagCategories.map((cat) => (
          <Field key={cat.id} label={cat.label} muted={themeMuted}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {cat.values.map((val) => {
                const isSelected = tags[cat.id] === val.id;
                return (
                  <button
                    key={val.id}
                    onClick={() => setTags((prev) => ({ ...prev, [cat.id]: val.id }))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: `1px solid ${isSelected ? themeColor : themeAccent}`,
                      background: isSelected ? `${themeColor}22` : "transparent",
                      color: isSelected ? themeHeading : themeMuted,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.15s",
                    }}
                  >
                    <TagIconRenderer icon={val.icon} size={10} />
                    {val.label}
                  </button>
                );
              })}
              {cat.values.length === 0 && (
                <span style={{ fontSize: 11, color: themeMuted, opacity: 0.6 }}>暂无标签选项</span>
              )}
            </div>
          </Field>
        ))}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px",
            borderRadius: 8,
            border: `1px solid ${themeColor}`,
            background: `${themeColor}22`,
            color: themeHeading,
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
          {isNew ? "创建地点" : "保存修改"}
        </button>
      </div>

      {/* Image crop modal — rendered outside the scrollable container to avoid clipping */}
      {cropOpen && imageUrl && (
        <ImageCropModal
          src={imageUrl}
          onCrop={(cropped) => {
            setImageUrl(cropped);
            setCropOpen(false);
          }}
          onClose={() => setCropOpen(false)}
          themeColor={themeColor}
          themeHeading={themeHeading}
          themeBg={themeBg}
          themeAccent={themeAccent}
          themeMuted={themeMuted ?? "#8A7050"}
        />
      )}
    </div>
  );
}

function Field({ label, children, muted }: { label: string; children: React.ReactNode; muted: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: muted, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
