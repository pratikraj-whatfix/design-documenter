"use client";

import { useState } from "react";

interface PublishStepProps {
  markdown: string;
  onBack: () => void;
  onReset: () => void;
}

export default function PublishStep({
  markdown,
  onBack,
  onReset,
}: PublishStepProps) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    url?: string;
    error?: string;
  } | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, mode }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, url: data.url });
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch {
      setResult({ ok: false, error: "Network error. Check your connection." });
    } finally {
      setPublishing(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="max-w-xl mx-auto text-center py-10">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Published Successfully!
        </h2>
        <p className="text-slate-500 mb-6">
          Your design documentation is now live on Confluence.
        </p>
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition mb-4"
          >
            Open in Confluence
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        <div className="mt-6">
          <button
            onClick={onReset}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline"
          >
            Document another session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Publish to Confluence
        </h2>
        <p className="text-slate-500">
          Choose how to add the documentation to your page.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
            mode === "append"
              ? "border-indigo-400 bg-indigo-50/50"
              : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <input
            type="radio"
            name="mode"
            value="append"
            checked={mode === "append"}
            onChange={() => setMode("append")}
            className="mt-1 accent-indigo-600"
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              Append to page
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Add the documentation at the end of the existing page content. Previous content stays untouched.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
            mode === "replace"
              ? "border-indigo-400 bg-indigo-50/50"
              : "border-slate-100 hover:border-slate-200"
          }`}
        >
          <input
            type="radio"
            name="mode"
            value="replace"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
            className="mt-1 accent-indigo-600"
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              Replace page content
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Overwrite the entire page with the new documentation. The old content will be removed.
            </p>
          </div>
        </label>
      </div>

      {result && !result.ok && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-rose-800">Publishing failed</p>
              <p className="text-xs text-rose-600 mt-0.5">{result.error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
        >
          Back to edit
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {publishing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Publishing
            </>
          ) : (
            <>
              Publish Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
