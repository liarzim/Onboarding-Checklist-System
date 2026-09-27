"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ListFilter, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { DEFAULT_DROPDOWN_OPTIONS } from "@/types/schema";

interface DropdownsSettingsTabProps {
  options: Record<string, { label: string; options: string[] }>;
  onSave: (updated: Record<string, { label: string; options: string[] }>) => Promise<void>;
  saving: boolean;
  onResetToDefault: () => void;
}

export default function DropdownsSettingsTab({
  options,
  onSave,
  saving,
  onResetToDefault,
}: DropdownsSettingsTabProps) {
  const [localOptions, setLocalOptions] = useState<Record<string, { label: string; options: string[] }>>(options);
  const dropdownKeys = Object.keys(localOptions.length ? localOptions : DEFAULT_DROPDOWN_OPTIONS);
  const [selectedKey, setSelectedKey] = useState<string>(dropdownKeys[0] || "marital_status");
  const [newOptionText, setNewOptionText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    setLocalOptions(options);
    setHasChanges(false);
  }, [options]);

  const currentGroup = localOptions[selectedKey] || DEFAULT_DROPDOWN_OPTIONS[selectedKey] || {
    label: selectedKey,
    options: [],
  };

  function handleAddOption(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newOptionText.trim();
    if (!trimmed) return;

    if (currentGroup.options.includes(trimmed)) {
      alert("אפשרות זו כבר קיימת ברשימה.");
      return;
    }

    setLocalOptions((prev) => {
      const existing = prev[selectedKey] || { label: selectedKey, options: [] };
      return {
        ...prev,
        [selectedKey]: {
          ...existing,
          options: [...existing.options, trimmed],
        },
      };
    });
    setNewOptionText("");
    setHasChanges(true);
  }

  function handleRemoveOption(index: number) {
    if (currentGroup.options.length <= 1) {
      alert("חובה להשאיר לפחות אפשרות אחת ברשימה.");
      return;
    }

    setLocalOptions((prev) => {
      const existing = prev[selectedKey] || { label: selectedKey, options: [] };
      const updatedList = existing.options.filter((_, i) => i !== index);
      return {
        ...prev,
        [selectedKey]: {
          ...existing,
          options: updatedList,
        },
      };
    });
    setHasChanges(true);
  }

  function handleMoveOption(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentGroup.options.length) return;

    setLocalOptions((prev) => {
      const existing = prev[selectedKey] || { label: selectedKey, options: [] };
      const list = [...existing.options];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        [selectedKey]: {
          ...existing,
          options: list,
        },
      };
    });
    setHasChanges(true);
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-blue-600" />
            <span>ניהול רשימות בחירה נפתחות (Dropdowns)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            הגדרה ועריכה של ערכי הבחירה המוצגים למועמד/ת בטפסים הדיגיטליים.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>איפוס לברירת מחדל</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(localOptions)}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "שומר שינויים..." : "שמור רשימות בחירה"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar + List Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector Sidebar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-xs font-bold text-slate-700 px-2 py-1">
            בחר רשימה לעריכה:
          </div>
          <div className="space-y-1">
            {Object.entries(localOptions).map(([key, group]) => {
              const isSelected = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{group.label}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {group.options.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected List Editor Panel */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {currentGroup.label}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                קוד שדה במערכת: <span className="font-mono text-slate-700">{selectedKey}</span>
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {currentGroup.options.length} אפשרויות זמינות
            </div>
          </div>

          {/* Add Option Form */}
          <form onSubmit={handleAddOption} className="flex gap-2">
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              placeholder="הקלד אפשרות חדשה להוספה לרשימה..."
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newOptionText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>הוסף אפשרות</span>
            </button>
          </form>

          {/* Options List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {currentGroup.options.map((opt, index) => (
              <div
                key={`${opt}_${index}`}
                className="flex items-center justify-between p-3 hover:bg-slate-50 transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold flex items-center justify-center text-[11px]">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{opt}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveOption(index, "up")}
                    disabled={index === 0}
                    title="הזז למעלה"
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOption(index, "down")}
                    disabled={index === currentGroup.options.length - 1}
                    title="הזז למטה"
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    title="מחק אפשרות"
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
