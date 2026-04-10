import { useRef, useState } from "react";
import { Check, Crop, ImagePlus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import type { EventSortTime, EventTime, MapEvent, TagCategory } from "../types/intermap-types";
import { normalizeEventSortTime } from "@/lib/intermap-helpers";
import { ImageCropModal } from "./image-crop-modal";
import { TagIconRenderer } from "./tag-icon-renderer";

interface EventEditorProps {
  existing?: MapEvent;
  tagCategories: TagCategory[];
  onClose: () => void;
  onSave: (eventItem: MapEvent) => void;
  themeColor: string;
  themeHeading: string;
  themeBg?: string;
  themeAccent?: string;
  themeMuted?: string;
}

function buildEventTime(
  mode: EventTime["kind"],
  pointValue: string,
  rangeStart: string,
  rangeEnd: string
): EventTime | undefined {
  if (mode === "range") {
    const start = rangeStart.trim();
    const end = rangeEnd.trim();
    return start && end ? { kind: "range", start, end } : undefined;
  }

  const value = pointValue.trim();
  return value ? { kind: "point", value } : undefined;
}

function buildEventSortTime(
  enabled: boolean,
  era: EventSortTime["era"],
  year: string,
  month: string,
  day: string
): EventSortTime | undefined {
  if (!enabled) return undefined;

  const withDefault = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : 1;
  };

  return normalizeEventSortTime({
    era,
    year: withDefault(year),
    month: withDefault(month),
    day: withDefault(day),
  });
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function parseSortTimeText(text: string): EventSortTime | undefined {
  const normalized = text.trim().replace(/\s+/g, "");
  if (!normalized) return undefined;

  const match = normalized.match(/^(?:(公元前|公元后|前|后|BCE|BC|CE|AD))?(\d{1,6})年(\d{1,2})月(\d{1,2})日$/i);
  if (!match) return undefined;

  const eraToken = (match[1] ?? "").toLowerCase();
  const era: EventSortTime["era"] =
    eraToken === "公元前" || eraToken === "前" || eraToken === "bce" || eraToken === "bc"
      ? "bce"
      : "ce";

  return normalizeEventSortTime({
    era,
    year: Number(match[2]),
    month: Number(match[3]),
    day: Number(match[4]),
  });
}

function formatSortTimeText(sortTime: EventSortTime): string {
  const eraLabel = sortTime.era === "bce" ? "公元前" : "公元后";
  return `${eraLabel}${sortTime.year}年${sortTime.month}月${sortTime.day}日`;
}

export function EventEditor({
  existing,
  tagCategories,
  onClose,
  onSave,
  themeColor,
  themeHeading,
  themeBg = "#1a1208",
  themeAccent = "rgba(180,140,60,0.3)",
  themeMuted = "#8A7050",
}: EventEditorProps) {
  const isNew = !existing;

  const defaultTags: Record<string, string> = {};
  tagCategories.forEach((cat) => {
    defaultTags[cat.id] = existing?.tags[cat.id] ?? cat.values[0]?.id ?? "";
  });

  const [name, setName] = useState(existing?.name ?? "");
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? "");
  const [hasSortTime, setHasSortTime] = useState(Boolean(existing?.sortTime));
  const [sortEra, setSortEra] = useState<EventSortTime["era"]>(existing?.sortTime?.era ?? "ce");
  const [sortYear, setSortYear] = useState(existing?.sortTime?.year ? String(existing.sortTime.year) : "");
  const [sortMonth, setSortMonth] = useState(existing?.sortTime?.month ? String(existing.sortTime.month) : "");
  const [sortDay, setSortDay] = useState(existing?.sortTime?.day ? String(existing.sortTime.day) : "");
  const [timeMode, setTimeMode] = useState<EventTime["kind"]>(existing?.time?.kind ?? "point");
  const [timePoint, setTimePoint] = useState(existing?.time?.kind === "point" ? existing.time.value : "");
  const [timeStart, setTimeStart] = useState(existing?.time?.kind === "range" ? existing.time.start : "");
  const [timeEnd, setTimeEnd] = useState(existing?.time?.kind === "range" ? existing.time.end : "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(existing?.imageUrl);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>(existing?.imageUrl);
  const [cropOpen, setCropOpen] = useState(false);
  const [x, setX] = useState(existing?.x ?? Math.round(30 + Math.random() * 40));
  const [y, setY] = useState(existing?.y ?? Math.round(30 + Math.random() * 40));
  const [tags, setTags] = useState<Record<string, string>>(defaultTags);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eventTime = buildEventTime(timeMode, timePoint, timeStart, timeEnd);
  const eventSortTime = buildEventSortTime(hasSortTime, sortEra, sortYear, sortMonth, sortDay);
  const sortTimeValid = !hasSortTime || Boolean(eventSortTime);
  const canFillSortTime = hasSortTime && Boolean(eventSortTime);
  const canSave = Boolean(name.trim() && eventTime && sortTimeValid);

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
    e.target.value = "";
  };

  const handleFillSortTime = () => {
    if (!eventSortTime || !hasSortTime) return;
    const filledText = formatSortTimeText(eventSortTime);
    if (timeMode === "point") {
      setTimePoint(filledText);
      return;
    }
    setTimeStart(filledText);
  };

  const handleSave = () => {
    if (!name.trim() || !eventTime || (hasSortTime && !eventSortTime)) return;

    const eventItem: MapEvent = {
      id: existing?.id ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      time: eventTime,
      sortTime: eventSortTime,
      description: description.slice(0, 250),
      imageUrl: imageUrl || undefined,
      x,
      y,
      tags,
    };

    onSave(eventItem);
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: "bold", color: themeHeading }}>
            {isNew ? "新建事件" : "编辑事件"}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: themeMuted, cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <Field label="事件名称（必填）" muted={themeMuted}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入事件名称..."
            maxLength={40}
            style={inputStyle}
          />
        </Field>

        <Field label="English Name（可选）" muted={themeMuted}>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Optional English name..."
            maxLength={60}
            style={inputStyle}
          />
        </Field>

        <Field label="排序时间（可选）" muted={themeMuted}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: hasSortTime ? 10 : 0,
              color: themeMuted,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!hasSortTime}
              onChange={(e) => setHasSortTime(!e.target.checked)}
              style={{ accentColor: themeColor }}
            />
            无排序时间
          </label>

          {hasSortTime ? (
            <div
              style={{
                border: `1px solid ${themeAccent}`,
                borderRadius: 8,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[
                  { id: "bce" as const, label: "公元前" },
                  { id: "ce" as const, label: "公元后" },
                ].map((option) => {
                  const isSelected = sortEra === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSortEra(option.id)}
                      style={pillButton(isSelected, themeColor, themeHeading, themeMuted, themeAccent)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <NumberInput
                  label="年"
                  value={sortYear}
                  onChange={setSortYear}
                  placeholder="年"
                  inputStyle={inputStyle}
                />
                <NumberInput
                  label="月"
                  value={sortMonth}
                  onChange={setSortMonth}
                  placeholder="月"
                  inputStyle={inputStyle}
                />
                <NumberInput
                  label="日"
                  value={sortDay}
                  onChange={setSortDay}
                  placeholder="日"
                  inputStyle={inputStyle}
                />
              </div>

              {!sortTimeValid && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#D8A56A" }}>
                  排序时间留空会自动按 1 补齐；如果手动填写，则月份需在 1-12、日期需在 1-31。
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: themeMuted, opacity: 0.75 }}>
              不填写排序时间时，事件在时间排序下会自动排到最后。
            </div>
          )}
        </Field>

        <Field
          label="显示时间（必填）"
          muted={themeMuted}
          action={
            <button
              onClick={handleFillSortTime}
              disabled={!canFillSortTime}
              title={
                hasSortTime
                  ? "将排序时间填充到显示时间（时间段填充开始时间）"
                  : "当前已选择无排序时间"
              }
              style={{
                ...fillButtonStyle(themeColor, themeHeading, themeMuted, canFillSortTime),
                opacity: canFillSortTime ? 1 : 0.45,
                cursor: canFillSortTime ? "pointer" : "not-allowed",
              }}
            >
              <Sparkles size={11} /> 一键填充排序时间
            </button>
          }
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[
              { id: "point" as const, label: "时间点" },
              { id: "range" as const, label: "时间段" },
            ].map((option) => {
              const isSelected = timeMode === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTimeMode(option.id)}
                  style={pillButton(isSelected, themeColor, themeHeading, themeMuted, themeAccent)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {timeMode === "point" ? (
            <input
              value={timePoint}
              onChange={(e) => setTimePoint(e.target.value)}
              placeholder="例如：公元后682年3月4日"
              maxLength={50}
              style={inputStyle}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                placeholder="开始时间"
                maxLength={50}
                style={{ ...inputStyle, flex: 1 }}
              />
              <span style={{ color: themeMuted, fontSize: 14, fontFamily: "Georgia, serif" }}>~</span>
              <input
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                placeholder="结束时间"
                maxLength={50}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          )}

          <div style={{ marginTop: 6, fontSize: 11, color: themeMuted, opacity: 0.75 }}>
            一键填充会把当前排序时间写入显示时间；时间段模式下写入开始时间，之后可继续手动修改。
          </div>
        </Field>

        <Field label={`简介（${description.length}/250）`} muted={themeMuted}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 250))}
            placeholder="描述这个事件..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          />
        </Field>

        <Field label="配图（可选）" muted={themeMuted}>
          {imageUrl ? (
            <div
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${themeAccent}`,
              }}
            >
              <img
                src={imageUrl}
                alt="配图预览"
                style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 5 }}>
                <button
                  onClick={() => setCropOpen(true)}
                  title="裁剪配图"
                  style={imageActionButton(themeAccent)}
                >
                  <Crop size={12} /> 裁剪
                </button>
                {originalImageUrl && imageUrl !== originalImageUrl && (
                  <button
                    onClick={() => setImageUrl(originalImageUrl)}
                    title="恢复原图"
                    style={imageActionButton(themeAccent)}
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
                  style={imageActionButton(themeAccent)}
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </Field>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: themeMuted, display: "block", marginBottom: 6 }}>坐标</label>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: themeMuted, opacity: 0.8, marginBottom: 3 }}>
                X = {x.toFixed(1)}%
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={x}
                onChange={(e) => setX(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: themeColor }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: themeMuted, opacity: 0.8, marginBottom: 3 }}>
                Y = {y.toFixed(1)}%
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={y}
                onChange={(e) => setY(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: themeColor }}
              />
            </div>
          </div>
          <div style={{ fontSize: 10, color: themeMuted, opacity: 0.6, marginTop: 4 }}>
            也可以保存后在地图上拖拽移动
          </div>
        </div>

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

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px",
            borderRadius: 8,
            border: `1px solid ${themeColor}`,
            background: `${themeColor}22`,
            color: themeHeading,
            cursor: canSave ? "pointer" : "not-allowed",
            fontSize: 14,
            fontFamily: "Georgia, serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: canSave ? 1 : 0.5,
            transition: "all 0.2s",
          }}
        >
          <Check size={15} />
          {isNew ? "创建事件" : "保存修改"}
        </button>
      </div>

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

function Field({
  label,
  children,
  muted,
  action,
}: {
  label: string;
  children: React.ReactNode;
  muted: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
        <label style={{ fontSize: 12, color: muted, display: "block" }}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  inputStyle,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: "#8A7050", marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        inputMode="numeric"
        placeholder={placeholder}
        maxLength={6}
        style={inputStyle}
      />
    </div>
  );
}

function pillButton(
  active: boolean,
  themeColor: string,
  themeHeading: string,
  themeMuted: string,
  themeAccent: string
): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 20,
    border: `1px solid ${active ? themeColor : themeAccent}`,
    background: active ? `${themeColor}22` : "transparent",
    color: active ? themeHeading : themeMuted,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    transition: "all 0.15s",
  };
}

function fillButtonStyle(
  themeColor: string,
  themeHeading: string,
  themeMuted: string,
  active: boolean
): React.CSSProperties {
  return {
    padding: "4px 9px",
    borderRadius: 999,
    border: `1px solid ${active ? themeColor : `${themeMuted}55`}`,
    background: active ? `${themeColor}22` : "rgba(255,255,255,0.03)",
    color: active ? themeHeading : themeMuted,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontFamily: "Georgia, serif",
    transition: "all 0.15s",
  };
}

function imageActionButton(themeAccent: string): React.CSSProperties {
  return {
    background: "rgba(0,0,0,0.65)",
    border: `1px solid ${themeAccent}`,
    borderRadius: 6,
    color: "#E8DCC8",
    cursor: "pointer",
    padding: "3px 6px",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
  };
}
