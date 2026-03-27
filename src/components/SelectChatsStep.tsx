"use client";

import { useState, useEffect } from "react";

interface Transcript {
  id: string;
  title: string;
  label: string;
  summary: string;
  messageCount: number;
  preview: string;
  modifiedAt: string;
  sizeKb: number;
}

interface SelectChatsStepProps {
  selectedId: string | null;
  onSelectionChange: (id: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SelectChatsStep({
  selectedId,
  onSelectionChange,
  onNext,
  onBack,
}: SelectChatsStepProps) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/transcripts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTranscripts(data.transcripts || []);
      })
      .catch(() => setError("Failed to load chat sessions"))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-slate-500">Scanning for Cursor conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No conversations found</h3>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline">
          Go back to setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Select a Conversation
        </h2>
        <p className="text-slate-500 text-sm">
          Choose the Cursor chat session that contains the design exploration you want to document.
        </p>
      </div>

      {transcripts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No conversation transcripts found.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8 max-h-[480px] overflow-y-auto pr-1">
          {transcripts.map((t) => {
            const isSelected = selectedId === t.id;

            return (
              <button
                key={t.id}
                onClick={() => onSelectionChange(isSelected ? null : t.id)}
                className={`w-full text-left rounded-xl border-2 transition-all duration-200 p-4 ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50/60 shadow-sm"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate">
                      {t.label}
                    </h3>
                    {t.summary && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {t.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>{formatDate(t.modifiedAt)}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{t.messageCount} messages</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{t.sizeKb} KB</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedId}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Configure Template
        </button>
      </div>
    </div>
  );
}
