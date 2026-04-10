/**
 * @file image-crop-modal.tsx
 * @description A modal for interactively cropping an image.
 *
 * How it works:
 * 1. Renders the source image in a fixed-size preview box via CSS object-fit: contain
 * 2. An SVG overlay shows a draggable/resizable crop selection rectangle
 * 3. The user can:
 *    - Drag anywhere outside the selection to create a new crop box
 *    - Drag the selection itself to move it
 *    - Drag any of the 8 handles (corners + edge midpoints) to resize it
 * 4. On confirm, a hidden <canvas> draws the original image and exports
 *    only the selected region as a JPEG data-URL
 * 5. The modal calls onCrop(croppedDataUrl) and closes
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, Crop } from "lucide-react";

interface Rect { x: number; y: number; w: number; h: number }
type Handle = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br" | "move"

interface ImageCropModalProps {
  src: string;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
  themeColor: string;
  themeHeading: string;
  themeBg: string;
  themeAccent: string;
  themeMuted: string;
}

const PREVIEW_W = 480;
const PREVIEW_H = 320;
const MIN_SIZE = 20;

/** Map a handle name to its x/y anchor in [0..1] relative to the rect */
const HANDLE_ANCHORS: Record<Handle, [number, number]> = {
  tl: [0, 0], tc: [0.5, 0], tr: [1, 0],
  ml: [0, 0.5],            mr: [1, 0.5],
  bl: [0, 1], bc: [0.5, 1], br: [1, 1],
  move: [0.5, 0.5],
};

/**
 * Clamp a value between min and max.
 */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Normalize a rect so w/h are always positive.
 */
function normalizeRect(r: Rect): Rect {
  const x = r.w < 0 ? r.x + r.w : r.x;
  const y = r.h < 0 ? r.y + r.h : r.y;
  return { x, y, w: Math.abs(r.w), h: Math.abs(r.h) };
}

export function ImageCropModal({
  src,
  onCrop,
  onClose,
  themeColor,
  themeHeading,
  themeBg,
  themeAccent,
  themeMuted,
}: ImageCropModalProps) {
  // Natural image dimensions (needed for final crop calculation)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  // The image's rendered region inside the preview box (respecting aspect ratio)
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: PREVIEW_W, h: PREVIEW_H });
  // Crop selection in preview coordinates (relative to the preview box)
  const [crop, setCrop] = useState<Rect>({ x: 20, y: 20, w: PREVIEW_W - 40, h: PREVIEW_H - 40 });

  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drag state
  const dragging = useRef<{ handle: Handle; startX: number; startY: number; startCrop: Rect } | null>(null);

  // ── Load image and compute rendered rect ──────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalSize({ w: nw, h: nh });

      // Compute the actual rendered region inside PREVIEW_W × PREVIEW_H (object-fit: contain)
      const scaleX = PREVIEW_W / nw;
      const scaleY = PREVIEW_H / nh;
      const scale = Math.min(scaleX, scaleY);
      const rw = nw * scale;
      const rh = nh * scale;
      const rx = (PREVIEW_W - rw) / 2;
      const ry = (PREVIEW_H - rh) / 2;
      setImgRect({ x: rx, y: ry, w: rw, h: rh });
      // Default crop = full image area
      setCrop({ x: rx, y: ry, w: rw, h: rh });
    };
    img.src = src;
  }, [src]);

  // ── Mouse pointer events ─────────────────────────────────────────────────
  const getPreviewCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const el = previewRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  /** Determine which handle (or 'move' for inside, null for outside) the pointer is on */
  const hitTestHandle = useCallback((px: number, py: number, c: Rect): Handle | null => {
    const norm = normalizeRect(c);
    const handles: Handle[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];
    for (const h of handles) {
      const [ax, ay] = HANDLE_ANCHORS[h];
      const hx = norm.x + ax * norm.w;
      const hy = norm.y + ay * norm.h;
      if (Math.abs(px - hx) <= 7 && Math.abs(py - hy) <= 7) return h;
    }
    if (px >= norm.x && px <= norm.x + norm.w && py >= norm.y && py <= norm.y + norm.h) return "move";
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const { x: px, y: py } = getPreviewCoords(e);
    const norm = normalizeRect(crop);
    const hit = hitTestHandle(px, py, norm);

    if (hit === null) {
      // Start a new crop selection from scratch
      dragging.current = { handle: "br", startX: px, startY: py, startCrop: { x: px, y: py, w: 0, h: 0 } };
    } else {
      dragging.current = { handle: hit, startX: px, startY: py, startCrop: normalizeRect(crop) };
    }
  }, [crop, getPreviewCoords, hitTestHandle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const { x: px, y: py } = getPreviewCoords(e);
    const dx = px - dragging.current.startX;
    const dy = py - dragging.current.startY;
    const sc = dragging.current.startCrop;
    const { x: imgX, y: imgY, w: imgW, h: imgH } = imgRect;

    setCrop((prev) => {
      let { x, y, w, h } = sc;

      if (dragging.current?.handle === "move") {
        x = clamp(sc.x + dx, imgX, imgX + imgW - sc.w);
        y = clamp(sc.y + dy, imgY, imgY + imgH - sc.h);
        return { x, y, w, h };
      }

      const handle = dragging.current?.handle ?? "br";

      // Horizontal adjustments
      if (handle === "tl" || handle === "ml" || handle === "bl") {
        const newX = clamp(sc.x + dx, imgX, sc.x + sc.w - MIN_SIZE);
        w = sc.x + sc.w - newX;
        x = newX;
      }
      if (handle === "tr" || handle === "mr" || handle === "br") {
        w = clamp(sc.w + dx, MIN_SIZE, imgX + imgW - sc.x);
      }

      // Vertical adjustments
      if (handle === "tl" || handle === "tc" || handle === "tr") {
        const newY = clamp(sc.y + dy, imgY, sc.y + sc.h - MIN_SIZE);
        h = sc.y + sc.h - newY;
        y = newY;
      }
      if (handle === "bl" || handle === "bc" || handle === "br") {
        h = clamp(sc.h + dy, MIN_SIZE, imgY + imgH - sc.y);
      }

      return { x, y, w, h };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPreviewCoords, imgRect]);

  const handleMouseUp = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Confirm crop ─────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!canvasRef.current || naturalSize.w === 0) return;
    const norm = normalizeRect(crop);

    // Map crop rect (in preview coords) back to natural image coordinates
    const scaleX = naturalSize.w / imgRect.w;
    const scaleY = naturalSize.h / imgRect.h;
    const sx = (norm.x - imgRect.x) * scaleX;
    const sy = (norm.y - imgRect.y) * scaleY;
    const sw = norm.w * scaleX;
    const sh = norm.h * scaleY;

    const canvas = canvasRef.current;
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, Math.round(sw), Math.round(sh));
      const cropped = canvas.toDataURL("image/jpeg", 0.92);
      onCrop(cropped);
    };
    img.src = src;
  }, [crop, imgRect, naturalSize, onCrop, src]);

  // ── Render ───────────────────────────────────────────────────────────────
  const norm = normalizeRect(crop);
  const handles: Handle[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: themeBg,
        border: `1px solid ${themeColor}66`,
        borderRadius: 14,
        padding: "20px 24px",
        color: themeHeading,
        fontFamily: "Georgia, serif",
        boxShadow: "0 12px 50px rgba(0,0,0,0.8)",
        maxWidth: 540,
        width: "100%",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: "bold", color: themeHeading }}>
            <Crop size={16} color={themeColor} />
            裁剪配图
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: themeMuted, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 11, color: themeMuted, marginBottom: 12, opacity: 0.8 }}>
          拖拽选框来选择保留区域，也可拖动边角和边缘调整大小
        </div>

        {/* Preview box with crop overlay */}
        <div
          ref={previewRef}
          style={{
            position: "relative",
            width: PREVIEW_W,
            height: PREVIEW_H,
            maxWidth: "100%",
            background: "#000",
            borderRadius: 8,
            overflow: "hidden",
            cursor: "crosshair",
            userSelect: "none",
            border: `1px solid ${themeAccent}`,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Background image */}
          <img
            src={src}
            alt="裁剪预览"
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
          />

          {/* Dark overlay outside selection */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <mask id="crop-mask">
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="white" />
                <rect x={norm.x} y={norm.y} width={norm.w} height={norm.h} fill="black" />
              </mask>
            </defs>
            <rect width={PREVIEW_W} height={PREVIEW_H} fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
          </svg>

          {/* Crop border + handles */}
          <div
            style={{
              position: "absolute",
              left: norm.x,
              top: norm.y,
              width: norm.w,
              height: norm.h,
              border: `2px solid ${themeColor}`,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {/* Rule-of-thirds grid lines */}
            {[1, 2].map((n) => (
              <div key={`v${n}`} style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${(n / 3) * 100}%`,
                borderLeft: `1px solid rgba(255,255,255,0.25)`,
              }} />
            ))}
            {[1, 2].map((n) => (
              <div key={`h${n}`} style={{
                position: "absolute", left: 0, right: 0,
                top: `${(n / 3) * 100}%`,
                borderTop: `1px solid rgba(255,255,255,0.25)`,
              }} />
            ))}
          </div>

          {/* Resize/move handles (on top, pointer-events: all) */}
          {handles.map((h) => {
            const [ax, ay] = HANDLE_ANCHORS[h];
            const hx = norm.x + ax * norm.w;
            const hy = norm.y + ay * norm.h;
            return (
              <div
                key={h}
                data-handle={h}
                style={{
                  position: "absolute",
                  left: hx,
                  top: hy,
                  width: 12,
                  height: 12,
                  background: themeColor,
                  border: "2px solid #fff",
                  borderRadius: 2,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            );
          })}
        </div>

        {/* Size info */}
        <div style={{ fontSize: 11, color: themeMuted, marginTop: 8, opacity: 0.7 }}>
          已选区域：{Math.round(norm.w)} × {Math.round(norm.h)} px（预览坐标）
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: 8,
              border: `1px solid ${themeAccent}`,
              background: "transparent",
              color: themeMuted,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "Georgia, serif",
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2,
              padding: "9px",
              borderRadius: 8,
              border: `1px solid ${themeColor}`,
              background: `${themeColor}22`,
              color: themeHeading,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "Georgia, serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Check size={14} /> 确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}
