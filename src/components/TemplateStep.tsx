"use client";

import { useState } from "react";
import {
  TemplateSection,
  DEFAULT_SECTIONS,
  PROMPT_SUGGESTIONS,
} from "@/lib/template";

interface TemplateStepProps {
  sections: TemplateSection[];
  onSectionsChange: (sections: TemplateSection[]) => void;
  userPrompt: string;
  onPromptChange: (prompt: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TemplateStep({
  sections,
  onSectionsChange,
  userPrompt,
  onPromptChange,
  onNext,
  onBack,
}: TemplateStepProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const enabledSections = sections.filter((s) => s.enabled);
  const disabledSections = sections.filter((s) => !s.enabled);

  const toggleSection = (id: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const restoreSection = (id: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === id ? { ...s, enabled: true } : s
      )
    );
  };

  const resetAll = () => {
    onSectionsChange(DEFAULT_SECTIONS.map((s) => ({ ...s })));
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const enabledIds = enabledSections.map((s) => s.id);
    const [moved] = enabledIds.splice(dragIdx, 1);
    enabledIds.splice(targetIdx, 0, moved);

    const disabledIds = disabledSections.map((s) => s.id);
    const ordered = [...enabledIds, ...disabledIds];
    const sectionMap = new Map(sections.map((s) => [s.id, s]));
    onSectionsChange(ordered.map((id) => sectionMap.get(id)!));

    setDragIdx(null);
    setDragOverIdx(null);
  };

  const addChip = (text: string) => {
    const current = userPrompt.trim();
    if (current.includes(text)) return;
    onPromptChange(current ? `${current}\n${text}` : text);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Configure Documentation Template
        </h2>
        <p className="text-slate-500 text-sm">
          Choose which sections to include, reorder them by dragging, and add
          any specific instructions.
        </p>
      </div>

      {/* Section Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Sections ({enabledSections.length} active)
          </h3>
          <button
            onClick={resetAll}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Reset to default
          </button>
        </div>

        <div className="space-y-2">
          {enabledSections.map((section, idx) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onDrop={() => handleDrop(idx)}
              className={`group rounded-xl border-2 bg-white transition-all duration-200 ${
                dragOverIdx === idx && dragIdx !== idx
                  ? "border-indigo-400 shadow-md"
                  : "border-slate-100 hover:border-slate-200"
              } ${dragIdx === idx ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Drag handle */}
                <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="5" cy="3" r="1.5" />
                    <circle cx="11" cy="3" r="1.5" />
                    <circle cx="5" cy="8" r="1.5" />
                    <circle cx="11" cy="8" r="1.5" />
                    <circle cx="5" cy="13" r="1.5" />
                    <circle cx="11" cy="13" r="1.5" />
                  </svg>
                </div>

                {/* Section number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {section.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {section.description}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Remove section"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Placeholder hints */}
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {section.placeholders.map((p, i) => (
                  <span
                    key={i}
                    className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100"
                  >
                    {p.split(":")[0]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Removed sections (re-add) */}
      {disabledSections.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            Removed sections  click to restore
          </h3>
          <div className="flex flex-wrap gap-2">
            {disabledSections.map((section) => (
              <button
                key={section.id}
                onClick={() => restoreSection(section.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt / Instructions Area */}
      <div className="mb-8">
        <div className="rounded-xl border-2 border-slate-100 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Additional Instructions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Guide the tone, focus, or specifics of the generated documentation.
            </p>
          </div>

          <textarea
            value={userPrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="e.g., Focus on the accessibility decisions we made. Keep the tone formal for a stakeholder audience."
            className="w-full px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 border-none focus:outline-none resize-none bg-transparent"
            rows={3}
          />

          <div className="px-4 pb-3">
            <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide font-medium">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addChip(suggestion)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    userPrompt.includes(suggestion)
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={enabledSections.length === 0}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate Documentation
        </button>
      </div>
    </div>
  );
}
