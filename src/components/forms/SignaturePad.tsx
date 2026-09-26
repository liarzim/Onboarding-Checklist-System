"use client";

import { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  signerName?: string;
  disabled?: boolean;
  initialSignatureUrl?: string | null;
}

export default function SignaturePad({
  onSignatureChange,
  signerName,
  disabled = false,
  initialSignatureUrl,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Setup canvas resolution and styling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI screens
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load initial signature if provided
    if (initialSignatureUrl && initialSignatureUrl.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasDrawn(true);
        onSignatureChange(initialSignatureUrl);
      };
      img.src = initialSignatureUrl;
    }
  }, [initialSignatureUrl]);

  function getCanvasCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startDrawing(clientX: number, clientY: number) {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(clientX: number, clientY: number) {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (hasDrawn) {
      const dataUrl = canvas.toDataURL("image/png");
      onSignatureChange(dataUrl);
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <PenTool className="w-4 h-4 text-blue-600" />
          <span>חתימת המועמד/ת (חובה)</span>
          {signerName && (
            <span className="text-xs font-normal text-slate-500">
              ({signerName})
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={clearSignature}
          disabled={!hasDrawn || disabled}
          className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 disabled:opacity-40 transition font-medium px-2 py-1 rounded-lg hover:bg-rose-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>נקה חתימה</span>
        </button>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 overflow-hidden hover:border-slate-400 transition">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
          onMouseMove={(e) => draw(e.clientX, e.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            startDrawing(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault(); // Prevent scrolling while signing
            const touch = e.touches[0];
            draw(touch.clientX, touch.clientY);
          }}
          onTouchEnd={stopDrawing}
          className="w-full h-44 cursor-crosshair touch-none bg-white"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-sm gap-1">
            <PenTool className="w-6 h-6 stroke-1 text-slate-300" />
            <span>חתום כאן באמצעות העכבר, מסך מגע או עט</span>
          </div>
        )}

        {hasDrawn && (
          <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>חתימה נקלטה</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        הנני מצהיר/ה כי חתימתי האלקטרונית לעיל מהווה הסכמה מלאה ומחייבת לתוכן מסמך זה לכל דבר ועניין.
      </p>
    </div>
  );
}
