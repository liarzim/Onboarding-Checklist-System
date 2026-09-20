"use client";

import { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  isAcknowledged: boolean;
  onAcknowledgeChange: (acknowledged: boolean) => void;
  signerName?: string;
  disabled?: boolean;
}

export default function SignatureCanvas({
  onSignatureChange,
  isAcknowledged,
  onAcknowledgeChange,
  signerName,
  disabled = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Setup transparent canvas with crisp DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    // Stroke properties: dark navy / slate-900, rounded ends
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getCoordinates(clientX: number, clientY: number) {
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

    const { x, y } = getCoordinates(clientX, clientY);
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

    const { x, y } = getCoordinates(clientX, clientY);
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
      // Export as transparent PNG Data URL
      const dataUrl = canvas.toDataURL("image/png");
      onSignatureChange(dataUrl);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <PenTool className="w-4 h-4 text-blue-600" />
          <span>חתימה דיגיטלית מאוחדת לכל 9 הטפסים</span>
          {signerName && (
            <span className="text-xs font-normal text-slate-500">
              ({signerName})
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasDrawn || disabled}
          className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 disabled:opacity-40 transition font-medium px-2.5 py-1 rounded-lg hover:bg-rose-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>נקה חתימה</span>
        </button>
      </div>

      {/* Signature Canvas Box with transparent background */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white/80 overflow-hidden hover:border-slate-400 transition shadow-inner">
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
            e.preventDefault(); // Prevent touch scrolling during signature
            const touch = e.touches[0];
            draw(touch.clientX, touch.clientY);
          }}
          onTouchEnd={stopDrawing}
          className="w-full h-44 cursor-crosshair touch-none"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm gap-1.5 select-none">
            <PenTool className="w-6 h-6 stroke-1 text-slate-300" />
            <span>חתום כאן באמצעות אצבע במובייל או עכבר בדסקטופ</span>
          </div>
        )}

        {hasDrawn && (
          <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>חתימה נקלטה בהצלחה</span>
          </div>
        )}
      </div>

      {/* Mandatory Checkbox */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAcknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs text-slate-700 leading-relaxed font-semibold">
            אני מאשר כי חתימתי זו מהווה חתימה אלקטרונית תקפה המחייבת בכל 9 הטפסים
          </span>
        </label>
      </div>
    </div>
  );
}
