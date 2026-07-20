"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

interface Props {
  imageUrl: string;
  pathname: string;
  onSave: (pathname: string, blob: Blob) => Promise<void>;
  onClose: () => void;
}

/**
 * Rotates an image by the given degrees (90° increments) using canvas.
 * No crop applied — just rotation of the full image.
 */
async function getRotatedImg(imageSrc: string, rotation: number): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Normalize rotation to 0, 90, 180, 270
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  if (normalizedRotation === 90 || normalizedRotation === 270) {
    canvas.width = image.height;
    canvas.height = image.width;
  } else {
    canvas.width = image.width;
    canvas.height = image.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalizedRotation * Math.PI) / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

/**
 * Applies crop and rotation to an image using canvas.
 */
async function getCroppedImg(
  imageSrc: string,
  crop: Area,
  rotation: number,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate bounding box of the rotated image
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  // Set canvas size to bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate and rotate
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d")!;

  croppedCanvas.width = crop.width;
  croppedCanvas.height = crop.height;

  croppedCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed — likely a CORS issue with this image URL."));
          return;
        }
        console.log("[getCroppedImg] Success", { size: blob.size });
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    image.src = url;
  });
}

export default function PhotoEditor({ imageUrl, pathname, onSave, onClose }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proxy the image through our own API to avoid CORS canvas tainting
  const proxiedUrl = `/api/admin/proxy-image?url=${encodeURIComponent(imageUrl)}`;

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const rotateLeft = () => setRotation((r) => (r - 90) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let blob: Blob;

      // If only rotated (no zoom/crop changes), use the simpler rotation-only path
      const isRotationOnly = rotation !== 0 && zoom === 1;

      if (isRotationOnly) {
        console.log("[PhotoEditor] Rotation-only save", { rotation });
        blob = await getRotatedImg(proxiedUrl, rotation);
      } else if (croppedAreaPixels) {
        console.log("[PhotoEditor] Crop+rotation save", { rotation, crop: croppedAreaPixels });
        blob = await getCroppedImg(proxiedUrl, croppedAreaPixels, rotation);
      } else {
        setError("No changes to save. Try rotating or cropping first.");
        setSaving(false);
        return;
      }

      console.log("[PhotoEditor] Got blob", { size: blob.size, type: blob.type });
      if (blob.size === 0) {
        throw new Error("Generated image is empty (0 bytes).");
      }
      await onSave(pathname, blob);
      console.log("[PhotoEditor] onSave completed successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PhotoEditor] Save failed:", msg, err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
          >
            ← Cancel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={rotateLeft}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-700"
            title="Rotate left 90°"
          >
            ↺ Left
          </button>
          <button
            onClick={rotateRight}
            className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-700"
            title="Rotate right 90°"
          >
            ↻ Right
          </button>
          <span className="mx-2 text-xs text-neutral-500">
            {rotation}°
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 px-4 py-2 text-sm text-red-200">
          Error: {error}
        </div>
      )}

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={proxiedUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          showGrid
        />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center justify-center gap-4 border-t border-neutral-800 bg-neutral-950 px-4 py-3">
        <span className="text-xs text-neutral-500">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-48"
        />
        <span className="w-10 text-xs text-neutral-400">{zoom.toFixed(1)}x</span>
      </div>
    </div>
  );
}
