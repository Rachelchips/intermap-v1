import { useState, useCallback, useEffect } from "react";
import { X, Plus, Tag, Star, Check, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { useIntermap } from "../store/intermap-store";
import type { MapEvent, MapLocation, TagCategory, TagValue, TagIcon } from "../types/intermap-types";
import { TagIconRenderer } from "./tag-icon-renderer";
import { EVENT_LOCATION_CATEGORY_ID, NONE_TAG_VALUE_ID } from "@/lib/intermap-helpers";

interface TagManagerProps {
  onClose: () => void;
  themeColor: string;
  themeHeading: string;
  themeBg: string;
  themeAccent: string;
  themeMuted: string;
}

type TargetMode = "locations" | "events";
type AssignableEntity = MapLocation | MapEvent;

const SHAPES = ["circle", "square", "diamond"] as const;

const PRESET_COLORS = [
  "#C8A860", "#8B4513", "#2D6A2D", "#6B21A8", "#5C4033",
  "#1E40AF", "#C86060", "#60C880", "#60A8C8", "#A860C8",
  "#F87171", "#FB923C", "#4ADE80", "#FBBF24", "#E879F9",
];

function IconPicker({ icon, onChange, themeColor }: {
  icon: TagIcon;
  onChange: (icon: TagIcon) => void;
  themeColor: string;
}) {
  const [emojiInput, setEmojiInput] = useState(icon.kind === "emoji" ? icon.emoji : "");
  const [colorInput, setColorInput] = useState(icon.kind === "shape" ? icon.color : "#C8A860");
  const [opacity, setOpacity] = useState(icon.kind === "shape" ? (icon.opacity ?? 1) : 1);
  const [borderColor, setBorderColor] = useState<string | undefined>(
    icon.kind === "shape" ? icon.borderColor : undefined
  );
  const [borderColorInput, setBorderColorInput] = useState(
    icon.kind === "shape" && icon.borderColor ? icon.borderColor : "#FFD700"
  );

  const kind = icon.kind;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["none", "shape", "emoji"] as const).map((k) => (
          <button key={k}
            onClick={() => {
              if (k === "none") onChange({ kind: "none" });
              else if (k === "emoji") onChange({ kind: "emoji", emoji: emojiInput || "⭐" });
              else onChange({ kind: "shape", shape: "circle", color: colorInput, opacity, borderColor });
            }}
            style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11,
              border: `1px solid ${kind === k ? themeColor : "rgba(180,140,60,0.25)"}`,
              background: kind === k ? `${themeColor}22` : "transparent",
              color: kind === k ? themeColor : "#9A8060",
              cursor: "pointer",
            }}>
            {k === "none" ? "默认" : k === "shape" ? "形状" : "Emoji"}
          </button>
        ))}
      </div>

      {kind === "shape" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {SHAPES.map((shape) => (
              <button key={shape}
                onClick={() => onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), shape, opacity, borderColor })}
                style={{
                  width: 32, height: 32,
                  border: `1.5px solid ${(icon as Extract<TagIcon, { kind: "shape" }>).shape === shape ? themeColor : "rgba(180,140,60,0.3)"}`,
                  borderRadius: 6, background: "rgba(255,255,255,0.04)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <TagIconRenderer icon={{ kind: "shape", shape, color: colorInput }} size={14} />
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {PRESET_COLORS.map((color) => (
              <button key={color}
                onClick={() => { setColorInput(color); onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), color, opacity, borderColor }); }}
                style={{
                  width: 20, height: 20, borderRadius: "50%", background: color, border: `2px solid ${colorInput === color ? "#fff" : "transparent"}`,
                  cursor: "pointer", padding: 0,
                }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#8A7050" }}>自定义颜色：</span>
            <input type="color" value={colorInput}
              onChange={(e) => { setColorInput(e.target.value); onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), color: e.target.value, opacity, borderColor }); }}
              style={{ width: 28, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "#8A7050" }}>透明度：</span>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity}
              onChange={(e) => {
                const nextOpacity = parseFloat(e.target.value);
                setOpacity(nextOpacity);
                onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), opacity: nextOpacity, borderColor });
              }}
              style={{ flex: 1, accentColor: themeColor }} />
            <span style={{ fontSize: 11, color: "#9A8060", width: 28 }}>{Math.round(opacity * 100)}%</span>
          </div>

          <div style={{ borderTop: "1px solid rgba(180,140,60,0.15)", paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#8A7050", minWidth: 40 }}>外边框：</span>
              <button
                onClick={() => {
                  setBorderColor(undefined);
                  onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), borderColor: undefined });
                }}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${borderColor === undefined ? themeColor : "rgba(180,140,60,0.25)"}`,
                  background: borderColor === undefined ? `${themeColor}22` : "transparent",
                  color: borderColor === undefined ? themeColor : "#9A8060",
                }}>
                无边框
              </button>
              <button
                onClick={() => {
                  const nextColor = borderColorInput;
                  setBorderColor(nextColor);
                  onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), borderColor: nextColor });
                }}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${borderColor !== undefined ? themeColor : "rgba(180,140,60,0.25)"}`,
                  background: borderColor !== undefined ? `${themeColor}22` : "transparent",
                  color: borderColor !== undefined ? themeColor : "#9A8060",
                }}>
                有颜色边框
              </button>
            </div>
            {borderColor !== undefined && (
              <div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                  {["#FFD700", "#FFE066", "#FFFFFF", "#A0E0FF", "#80FF80", "#FF8888", "#D8B4FE"].map((color) => (
                    <button key={color} onClick={() => {
                      setBorderColorInput(color);
                      setBorderColor(color);
                      onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), borderColor: color });
                    }}
                      style={{
                        width: 20, height: 20, borderRadius: "50%", background: color,
                        border: `2px solid ${borderColorInput === color ? "#fff" : "transparent"}`,
                        cursor: "pointer", padding: 0,
                        boxShadow: `0 0 4px ${color}88`,
                      }} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#8A7050" }}>自定义：</span>
                  <input type="color" value={borderColorInput}
                    onChange={(e) => {
                      setBorderColorInput(e.target.value);
                      setBorderColor(e.target.value);
                      onChange({ ...(icon as Extract<TagIcon, { kind: "shape" }>), borderColor: e.target.value });
                    }}
                    style={{ width: 28, height: 22, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: colorInput,
                    border: `3px solid ${borderColor}`,
                    boxShadow: `0 0 6px ${borderColor}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 10, color: "#8A7050" }}>预览效果</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {kind === "emoji" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={emojiInput}
            onChange={(e) => {
              setEmojiInput(e.target.value);
              if (e.target.value) onChange({ kind: "emoji", emoji: e.target.value });
            }}
            placeholder="粘贴或输入 emoji…"
            maxLength={4}
            style={{
              width: 80, padding: "5px 8px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(180,140,60,0.3)", borderRadius: 6,
              color: "#E8DCC8", fontSize: 20, outline: "none", textAlign: "center",
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["⭐", "🌟", "🏰", "🌊", "🌳", "⚔️", "🛡️", "👑", "🌿", "🦅", "🔮", "💀", "🗺️", "⛰️", "🏔️"].map((emoji) => (
              <button key={emoji} onClick={() => { setEmojiInput(emoji); onChange({ kind: "emoji", emoji }); }}
                style={{
                  width: 28, height: 28, borderRadius: 6, fontSize: 16,
                  border: `1px solid ${emojiInput === emoji ? themeColor : "rgba(180,140,60,0.2)"}`,
                  background: "rgba(255,255,255,0.04)", cursor: "pointer",
                }}>{emoji}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValueEditor({
  value,
  categoryId,
  mapId,
  entities,
  themeColor,
  themeHeading,
  targetMode,
  onClose,
  lockLabel,
}: {
  value: TagValue;
  categoryId: string;
  mapId: string;
  entities: AssignableEntity[];
  themeColor: string;
  themeHeading: string;
  targetMode: TargetMode;
  onClose: () => void;
  lockLabel?: boolean;
}) {
  const { dispatch } = useIntermap();
  const [label, setLabel] = useState(value.label);
  const [icon, setIcon] = useState<TagIcon>(value.icon);

  useEffect(() => {
    setLabel(value.label);
    setIcon(value.icon);
  }, [value]);

  const assignedIds = new Set(entities.filter((entity) => entity.tags[categoryId] === value.id).map((entity) => entity.id));
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds));

  useEffect(() => {
    setSelected(new Set(assignedIds));
  }, [value.id, categoryId, entities]);

  const targetLabel = targetMode === "locations" ? "地点" : "事件";

  const handleSave = useCallback(() => {
    if (targetMode === "locations") {
      dispatch({ type: "UPDATE_TAG_VALUE", mapId, categoryId, value: { ...value, label: lockLabel ? value.label : label, icon } });
    } else {
      dispatch({ type: "UPDATE_EVENT_TAG_VALUE", mapId, categoryId, value: { ...value, label: lockLabel ? value.label : label, icon } });
    }

    entities.forEach((entity) => {
      const wasAssigned = assignedIds.has(entity.id);
      const nowAssigned = selected.has(entity.id);
      if (wasAssigned === nowAssigned) return;

      const nextTags = { ...entity.tags };
      nextTags[categoryId] = nowAssigned ? value.id : NONE_TAG_VALUE_ID;

      if (targetMode === "locations") {
        dispatch({ type: "UPDATE_LOCATION", mapId, location: { ...(entity as MapLocation), tags: nextTags } });
      } else {
        dispatch({ type: "UPDATE_EVENT", mapId, event: { ...(entity as MapEvent), tags: nextTags } });
      }
    });

    onClose();
  }, [assignedIds, categoryId, dispatch, entities, icon, label, lockLabel, mapId, onClose, selected, targetMode, value]);

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: themeHeading, fontSize: 13, fontWeight: "bold" }}>编辑小分类</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A7050", cursor: "pointer" }}><X size={14} /></button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#8A7050", display: "block", marginBottom: 4 }}>名称</label>
        <input value={lockLabel ? value.label : label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={30}
          disabled={lockLabel}
          style={{
            width: "100%", padding: "6px 8px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(180,140,60,0.3)", borderRadius: 6, color: "#E8DCC8",
            fontSize: 13, outline: "none", boxSizing: "border-box", opacity: lockLabel ? 0.6 : 1,
          }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#8A7050", display: "block", marginBottom: 4 }}>图标</label>
        <IconPicker icon={icon} onChange={setIcon} themeColor={themeColor} />
      </div>

      {entities.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#8A7050", display: "block", marginBottom: 6 }}>勾选属于此分类的{targetLabel}</label>
          <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid rgba(180,140,60,0.2)", borderRadius: 6 }}>
            {entities.map((entity) => {
              const checked = selected.has(entity.id);
              return (
                <div key={entity.id} onClick={() => setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(entity.id)) next.delete(entity.id);
                  else next.add(entity.id);
                  return next;
                })}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", cursor: "pointer", opacity: checked ? 1 : 0.5, borderBottom: "1px solid rgba(180,140,60,0.1)" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${checked ? themeColor : "#4A3820"}`, background: checked ? `${themeColor}33` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && <Check size={8} color={themeColor} />}
                  </div>
                  <span style={{ fontSize: 12, color: "#C8B898" }}>{entity.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={handleSave}
        style={{ width: "100%", padding: "8px", borderRadius: 7, border: `1px solid ${themeColor}`, background: `${themeColor}22`, color: themeHeading, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <Check size={13} /> 保存
      </button>
    </div>
  );
}

export function TagManager({ onClose, themeColor, themeHeading, themeBg, themeAccent, themeMuted }: TagManagerProps) {
  const { activeMap, dispatch } = useIntermap();
  const [mode, setMode] = useState<TargetMode>("locations");
  const [selectedCatIds, setSelectedCatIds] = useState<Record<TargetMode, string | null>>({
    locations: activeMap?.tagCategories[0]?.id ?? null,
    events: activeMap?.eventTagCategories[0]?.id ?? null,
  });
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addingValue, setAddingValue] = useState(false);
  const [newValueName, setNewValueName] = useState("");
  const [editingCatLabel, setEditingCatLabel] = useState<string | null>(null);
  const [catLabelInput, setCatLabelInput] = useState("");

  useEffect(() => {
    setSelectedCatIds({
      locations: activeMap?.tagCategories[0]?.id ?? null,
      events: activeMap?.eventTagCategories[0]?.id ?? null,
    });
  }, [activeMap?.id]);

  if (!activeMap) return null;

  const cats = mode === "locations" ? activeMap.tagCategories : activeMap.eventTagCategories;
  const entities = mode === "locations" ? activeMap.locations : activeMap.events;
  const targetLabel = mode === "locations" ? "地点" : "事件";
  const selectedCatId = selectedCatIds[mode];
  const selectedCat = cats.find((category) => category.id === selectedCatId) ?? null;
  const editingValue = selectedCat?.values.find((value) => value.id === editingValueId) ?? null;
  const isLockedEventLocationCategory = mode === "events" && selectedCat?.id === EVENT_LOCATION_CATEGORY_ID;

  const setSelectedCatId = (nextId: string | null) => {
    setSelectedCatIds((prev) => ({ ...prev, [mode]: nextId }));
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    const id = `cat_${Date.now()}`;
    const category: TagCategory = {
      id,
      label: newCatName.trim(),
      isLegend: false,
      isBuiltIn: false,
      values: [
        { id: NONE_TAG_VALUE_ID, label: "无归属", icon: { kind: "none" } },
      ],
    };

    if (mode === "locations") {
      dispatch({ type: "ADD_TAG_CATEGORY", mapId: activeMap.id, category });
      activeMap.locations.forEach((location) => {
        dispatch({ type: "UPDATE_LOCATION", mapId: activeMap.id, location: { ...location, tags: { ...location.tags, [id]: NONE_TAG_VALUE_ID } } });
      });
    } else {
      dispatch({ type: "ADD_EVENT_TAG_CATEGORY", mapId: activeMap.id, category });
      activeMap.events.forEach((eventItem) => {
        dispatch({ type: "UPDATE_EVENT", mapId: activeMap.id, event: { ...eventItem, tags: { ...eventItem.tags, [id]: NONE_TAG_VALUE_ID } } });
      });
    }

    setNewCatName("");
    setAddingCat(false);
    setSelectedCatId(id);
  };

  const handleDeleteCat = (category: TagCategory) => {
    const locked = mode === "events" && category.id === EVENT_LOCATION_CATEGORY_ID;
    if (category.isLegend || locked) return;
    if (!confirm(`确定删除标签「${category.label}」？所有${targetLabel}中与该标签有关的数据将被清除，且不可恢复。`)) return;

    if (mode === "locations") {
      dispatch({ type: "DELETE_TAG_CATEGORY", mapId: activeMap.id, categoryId: category.id });
      activeMap.locations.forEach((location) => {
        const nextTags = { ...location.tags };
        delete nextTags[category.id];
        dispatch({ type: "UPDATE_LOCATION", mapId: activeMap.id, location: { ...location, tags: nextTags } });
      });
    } else {
      dispatch({ type: "DELETE_EVENT_TAG_CATEGORY", mapId: activeMap.id, categoryId: category.id });
      activeMap.events.forEach((eventItem) => {
        const nextTags = { ...eventItem.tags };
        delete nextTags[category.id];
        dispatch({ type: "UPDATE_EVENT", mapId: activeMap.id, event: { ...eventItem, tags: nextTags } });
      });
    }

    setSelectedCatId(cats.find((cat) => cat.id !== category.id)?.id ?? null);
  };

  const handleSetLegend = (category: TagCategory) => {
    if (mode === "locations") {
      dispatch({ type: "SET_LEGEND_CATEGORY", mapId: activeMap.id, categoryId: category.id });
    } else {
      dispatch({ type: "SET_EVENT_LEGEND_CATEGORY", mapId: activeMap.id, categoryId: category.id });
    }
  };

  const handleRenameCat = (category: TagCategory) => {
    const locked = mode === "events" && category.id === EVENT_LOCATION_CATEGORY_ID;
    if (locked) return;
    setEditingCatLabel(category.id);
    setCatLabelInput(category.label);
  };

  const handleSaveCatLabel = (category: TagCategory) => {
    if (!catLabelInput.trim()) return;
    if (mode === "locations") {
      dispatch({ type: "UPDATE_TAG_CATEGORY", mapId: activeMap.id, category: { ...category, label: catLabelInput.trim() } });
    } else {
      dispatch({ type: "UPDATE_EVENT_TAG_CATEGORY", mapId: activeMap.id, category: { ...category, label: catLabelInput.trim() } });
    }
    setEditingCatLabel(null);
  };

  const handleAddValue = () => {
    if (!newValueName.trim() || !selectedCat || isLockedEventLocationCategory) return;
    const value: TagValue = {
      id: `val_${Date.now()}`,
      label: newValueName.trim(),
      icon: { kind: "none" },
    };

    if (mode === "locations") {
      dispatch({ type: "ADD_TAG_VALUE", mapId: activeMap.id, categoryId: selectedCat.id, value });
    } else {
      dispatch({ type: "ADD_EVENT_TAG_VALUE", mapId: activeMap.id, categoryId: selectedCat.id, value });
    }

    setNewValueName("");
    setAddingValue(false);
  };

  const handleDeleteValue = (value: TagValue) => {
    if (!selectedCat) return;
    const lockedValue = mode === "events" && selectedCat.id === EVENT_LOCATION_CATEGORY_ID;
    if (lockedValue || value.id === NONE_TAG_VALUE_ID) return;

    const hasAssignments = entities.some((entity) => entity.tags[selectedCat.id] === value.id);
    if (hasAssignments) {
      alert(`不能删除「${value.label}」，因为有${targetLabel}属于此分类！请先将相关${targetLabel}改为其他分类。`);
      return;
    }
    if (!confirm(`确定删除「${value.label}」？`)) return;

    if (mode === "locations") {
      dispatch({ type: "DELETE_TAG_VALUE", mapId: activeMap.id, categoryId: selectedCat.id, valueId: value.id });
    } else {
      dispatch({ type: "DELETE_EVENT_TAG_VALUE", mapId: activeMap.id, categoryId: selectedCat.id, valueId: value.id });
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 720, background: themeBg,
        border: `1px solid ${themeAccent}`,
        borderRadius: 14, display: "flex", flexDirection: "column",
        maxHeight: "88vh", overflow: "hidden",
        boxShadow: "0 12px 60px rgba(0,0,0,0.8)",
        fontFamily: "Georgia, serif",
        color: "#E8DCC8",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${themeAccent}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Tag size={16} color={themeColor} />
          <span style={{ fontSize: 16, fontWeight: "bold", color: themeHeading, flex: 1 }}>标签管理</span>
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { key: "locations", label: "地点" },
              { key: "events", label: "事件" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key);
                  setEditingValueId(null);
                  setAddingCat(false);
                  setAddingValue(false);
                  setEditingCatLabel(null);
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${mode === tab.key ? themeColor : `${themeAccent}66`}`,
                  background: mode === tab.key ? `${themeColor}22` : "transparent",
                  color: mode === tab.key ? themeColor : themeMuted,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: themeMuted, cursor: "pointer", padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: 220, borderRight: `1px solid ${themeAccent}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${themeAccent}22`, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: themeMuted }}>{targetLabel}标签类别</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cats.map((category) => {
                const locked = mode === "events" && category.id === EVENT_LOCATION_CATEGORY_ID;
                return (
                  <div key={category.id}
                    onClick={() => { setSelectedCatId(category.id); setEditingValueId(null); }}
                    style={{
                      padding: "9px 12px", cursor: "pointer",
                      background: selectedCatId === category.id ? `${themeColor}15` : "transparent",
                      borderLeft: `3px solid ${selectedCatId === category.id ? themeColor : "transparent"}`,
                      borderBottom: `1px solid ${themeAccent}22`,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingCatLabel === category.id ? (
                        <input
                          value={catLabelInput}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setCatLabelInput(e.target.value)}
                          onBlur={() => handleSaveCatLabel(category)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveCatLabel(category); if (e.key === "Escape") setEditingCatLabel(null); }}
                          autoFocus
                          style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${themeColor}`, color: themeHeading, fontSize: 12, outline: "none", padding: "0 2px" }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: selectedCatId === category.id ? themeHeading : "#B0A080", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {category.label}
                        </span>
                      )}
                      <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                        {category.isLegend && <span style={{ fontSize: 9, color: themeColor, background: `${themeColor}22`, borderRadius: 3, padding: "0 4px" }}>图例</span>}
                        {category.isBuiltIn && <span style={{ fontSize: 9, color: themeMuted, background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "0 4px" }}>内置</span>}
                        {locked && <span style={{ fontSize: 9, color: themeMuted, background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "0 4px" }}>固定</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                      <button title={locked ? "固定标签不可重命名" : "重命名"} onClick={() => handleRenameCat(category)}
                        disabled={locked}
                        style={{ background: "none", border: "none", color: locked ? "rgba(120,100,80,0.35)" : themeMuted, cursor: locked ? "not-allowed" : "pointer", padding: 2, display: "flex" }}>
                        <Pencil size={11} />
                      </button>
                      <button title={category.isLegend ? "当前图例" : "设为图例"}
                        onClick={() => handleSetLegend(category)}
                        style={{ background: "none", border: "none", color: category.isLegend ? themeColor : themeMuted, cursor: "pointer", padding: 2, display: "flex" }}>
                        <Star size={11} fill={category.isLegend ? themeColor : "none"} />
                      </button>
                      <button
                        title={category.isLegend ? "图例标签不可删除，请先切换图例" : locked ? "固定标签不可删除" : `删除标签「${category.label}」`}
                        onClick={() => handleDeleteCat(category)}
                        disabled={category.isLegend || locked}
                        style={{
                          background: "none",
                          border: "none",
                          color: category.isLegend || locked ? "rgba(120,100,80,0.35)" : "#C86060",
                          cursor: category.isLegend || locked ? "not-allowed" : "pointer",
                          padding: 2,
                          display: "flex",
                          opacity: category.isLegend || locked ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "8px 12px", borderTop: `1px solid ${themeAccent}22`, flexShrink: 0 }}>
              {addingCat ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCat(); if (e.key === "Escape") setAddingCat(false); }}
                    autoFocus placeholder="标签名称…" maxLength={20}
                    style={{ flex: 1, padding: "4px 6px", background: "rgba(255,255,255,0.05)", border: `1px solid ${themeColor}66`, borderRadius: 5, color: "#E8DCC8", fontSize: 12, outline: "none" }} />
                  <button onClick={handleAddCat} style={{ background: `${themeColor}22`, border: `1px solid ${themeColor}66`, borderRadius: 5, color: themeColor, cursor: "pointer", padding: "4px 8px", fontSize: 12 }}>+</button>
                </div>
              ) : (
                <button onClick={() => setAddingCat(true)}
                  style={{ width: "100%", padding: "5px", background: "transparent", border: `1px dashed rgba(180,140,60,0.3)`, borderRadius: 6, color: "#8A7050", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Plus size={11} /> 新增{targetLabel}标签类
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selectedCat ? (
              <>
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${themeAccent}22`, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: themeHeading, fontWeight: "bold", flex: 1 }}>{selectedCat.label}</span>
                  <span style={{ fontSize: 10, color: themeMuted }}>{entities.length} 个{targetLabel}</span>
                  {selectedCat.isLegend && (
                    <span style={{ fontSize: 10, color: themeColor, background: `${themeColor}22`, borderRadius: 4, padding: "2px 6px" }}>图例中</span>
                  )}
                </div>

                {editingValue ? (
                  <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
                    <ValueEditor
                      value={editingValue}
                      categoryId={selectedCat.id}
                      mapId={activeMap.id}
                      entities={entities}
                      themeColor={themeColor}
                      themeHeading={themeHeading}
                      targetMode={mode}
                      lockLabel={mode === "events" && selectedCat.id === EVENT_LOCATION_CATEGORY_ID && editingValue.id !== NONE_TAG_VALUE_ID}
                      onClose={() => setEditingValueId(null)}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {selectedCat.values.map((value) => {
                      const assignmentCount = entities.filter((entity) => entity.tags[selectedCat.id] === value.id).length;
                      const lockedValue = mode === "events" && selectedCat.id === EVENT_LOCATION_CATEGORY_ID;
                      const canDelete = !lockedValue && value.id !== NONE_TAG_VALUE_ID && assignmentCount === 0;

                      return (
                        <div key={value.id}
                          style={{ padding: "8px 16px", borderBottom: `1px solid ${themeAccent}22`, display: "flex", alignItems: "center", gap: 8 }}>
                          <TagIconRenderer icon={value.icon} size={14} />
                          <span style={{ flex: 1, fontSize: 13, color: "#C8B898" }}>{value.label}</span>
                          <span style={{ fontSize: 10, color: themeMuted }}>{assignmentCount} 个{targetLabel}</span>
                          <button onClick={() => setEditingValueId(value.id)}
                            style={{ background: "none", border: `1px solid rgba(180,140,60,0.2)`, borderRadius: 5, color: "#9A8060", cursor: "pointer", padding: "3px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                            <Pencil size={10} /> 编辑
                          </button>
                          {value.id !== NONE_TAG_VALUE_ID && (
                            <button onClick={() => handleDeleteValue(value)}
                              disabled={!canDelete}
                              style={{ background: "none", border: "none", color: canDelete ? "#C86060" : "#7A5050", cursor: canDelete ? "pointer" : "not-allowed", padding: 3, display: "flex" }}
                              title={lockedValue ? "固定分类的值不可删除" : assignmentCount > 0 ? `有${targetLabel}属于此分类，不可删除` : "删除"}>
                              {canDelete ? <Trash2 size={12} /> : <AlertTriangle size={12} />}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ padding: "10px 16px" }}>
                      {addingValue ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input value={newValueName} onChange={(e) => setNewValueName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddValue(); if (e.key === "Escape") setAddingValue(false); }}
                            autoFocus placeholder="新分类名称…" maxLength={30}
                            disabled={isLockedEventLocationCategory}
                            style={{ flex: 1, padding: "5px 8px", background: "rgba(255,255,255,0.05)", border: `1px solid ${themeColor}66`, borderRadius: 6, color: "#E8DCC8", fontSize: 12, outline: "none", opacity: isLockedEventLocationCategory ? 0.5 : 1 }} />
                          <button onClick={handleAddValue}
                            disabled={isLockedEventLocationCategory}
                            style={{ padding: "5px 12px", background: `${themeColor}22`, border: `1px solid ${themeColor}66`, borderRadius: 6, color: themeColor, cursor: isLockedEventLocationCategory ? "not-allowed" : "pointer", fontSize: 12, opacity: isLockedEventLocationCategory ? 0.5 : 1 }}>
                            添加
                          </button>
                          <button onClick={() => setAddingValue(false)}
                            style={{ padding: "5px 8px", background: "transparent", border: "1px solid rgba(180,140,60,0.2)", borderRadius: 6, color: "#8A7050", cursor: "pointer", fontSize: 12 }}>
                            取消
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingValue(true)}
                          disabled={isLockedEventLocationCategory}
                          style={{ padding: "6px 14px", background: "transparent", border: `1px dashed rgba(180,140,60,0.3)`, borderRadius: 7, color: "#8A7050", cursor: isLockedEventLocationCategory ? "not-allowed" : "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, opacity: isLockedEventLocationCategory ? 0.5 : 1 }}>
                          <Plus size={12} /> 新增小分类
                        </button>
                      )}
                      {isLockedEventLocationCategory && (
                        <div style={{ marginTop: 8, fontSize: 11, color: themeMuted, opacity: 0.75 }}>
                          归属地点由地点列表自动同步，不能手动增删。
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: themeMuted, fontSize: 13 }}>
                请选择左侧的标签类
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
