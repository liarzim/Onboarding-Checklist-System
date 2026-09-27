"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

interface DatePickerInputProps {
  value: string; // Stored format: MM/DD/YYYY or initial value
  onChange: (value: string) => void; // Emits MM/DD/YYYY format
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Converts any incoming date string (MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY)
 * to display format DD/MM/YYYY.
 */
export function toDisplayDate(rawDate?: string | null): string {
  if (!rawDate || typeof rawDate !== "string") return "";
  const trimmed = rawDate.trim();
  if (!trimmed) return "";

  // 1. Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}/${m}/${y}`;
  }

  // 2. Format: MM/DD/YYYY (or DD/MM/YYYY)
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const [p1, p2, p3] = slashParts;
    // If p3 is 4 digits year:
    if (p3.length === 4) {
      const num1 = parseInt(p1, 10);
      const num2 = parseInt(p2, 10);

      // If already DD/MM/YYYY (e.g. day > 12)
      if (num1 > 12 && num2 <= 12) {
        return `${p1.padStart(2, "0")}/${p2.padStart(2, "0")}/${p3}`;
      }
      // If storage format MM/DD/YYYY (month <= 12):
      // When stored as MM/DD/YYYY, p1 is month, p2 is day
      return `${p2.padStart(2, "0")}/${p1.padStart(2, "0")}/${p3}`;
    }
  }

  return trimmed;
}

/**
 * Converts display format DD/MM/YYYY to storage format MM/DD/YYYY.
 */
export function toStorageDate(displayDate?: string | null): string {
  if (!displayDate || typeof displayDate !== "string") return "";
  const trimmed = displayDate.trim();
  if (!trimmed) return "";

  // If in DD/MM/YYYY
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y.length === 4) {
      return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
    }
  }

  // If in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${m}/${d}/${y}`;
  }

  return trimmed;
}

/**
 * Converts display format DD/MM/YYYY to HTML5 date input format YYYY-MM-DD.
 */
function toIsoDate(displayDate?: string): string {
  if (!displayDate) return "";
  const parts = displayDate.split("/");
  if (parts.length === 3 && parts[2]?.length === 4) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

export default function DatePickerInput({
  value,
  onChange,
  label,
  placeholder = "DD/MM/YYYY",
  required = false,
  disabled = false,
  className = "",
  id,
}: DatePickerInputProps) {
  const [displayText, setDisplayText] = useState<string>(() => toDisplayDate(value));
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Sync displayText when parent value changes
  useEffect(() => {
    setDisplayText(toDisplayDate(value));
  }, [value]);

  // Handle manual typing in DD/MM/YYYY
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    let input = e.target.value.replace(/[^\d/]/g, "");

    // Auto-add slash after 2 digits and 5 digits if user is typing
    if (input.length === 2 && !input.includes("/")) {
      input = `${input}/`;
    } else if (input.length === 5 && input.indexOf("/", 3) === -1) {
      input = `${input}/`;
    }

    if (input.length > 10) {
      input = input.substring(0, 10);
    }

    setDisplayText(input);

    // If complete DD/MM/YYYY
    if (input.length === 10) {
      const storageVal = toStorageDate(input);
      onChange(storageVal);
    } else if (input === "") {
      onChange("");
    }
  }

  // Handle native date picker selection
  function handleNativePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const isoVal = e.target.value; // YYYY-MM-DD
    if (!isoVal) return;
    const [y, m, d] = isoVal.split("-");
    const displayVal = `${d}/${m}/${y}`;
    const storageVal = `${m}/${d}/${y}`;
    setDisplayText(displayVal);
    onChange(storageVal);
  }

  function openDatePicker() {
    if (disabled) return;
    const picker = hiddenDateInputRef.current;
    if (picker) {
      if (typeof picker.showPicker === "function") {
        try {
          picker.showPicker();
        } catch {
          picker.click();
        }
      } else {
        picker.click();
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="font-bold text-slate-700 block mb-1 text-xs sm:text-sm"
        >
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={displayText}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          dir="ltr"
          maxLength={10}
          className="w-full border border-slate-300 rounded-xl py-2 px-3 pl-10 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
        />

        {/* Calendar picker trigger button */}
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          title="פתח תאריכון לבחירת תאריך"
          className="absolute left-2 text-slate-400 hover:text-blue-600 focus:outline-none transition p-1 rounded-md"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Hidden native HTML5 date input used for the calendar dialog */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={toIsoDate(displayText)}
          onChange={handleNativePickerChange}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute left-2 w-0 h-0 opacity-0 pointer-events-none"
        />
      </div>
    </div>
  );
}
