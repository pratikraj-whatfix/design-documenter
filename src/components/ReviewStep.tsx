"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ReviewStepProps {
  selectedIds: string[];
  markdown: string;
  onMarkdownChange: (md: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ReviewStep({
  selectedIds,
  markdown,
  onMarkdownChange,
  onNext,
  onBack,
}: ReviewStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (markdown || generated) return;

    setLoading(true);
    setError("");

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcriptIds: selectedIds }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          onMarkdownChange(data.markdown);
          setGenerated(true);
        }
      })
      .catch(() => setError("Failed to generate documentation"))
      .finally(() => setLoading(false));
  }, [selectedIds, markdown, generated, onMarkdownChange]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-slate-500">
          Analyzing conversations and generating documentation
        </p>
        <p className="text-xs text-slate-400">This may take a moment for large chats</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Generation failed</h3>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline">
          Go back and try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Review Documentation
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Preview and edit your documentation before publishing.
          </p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode("preview")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              mode === "preview"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              mode === "edit"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-8">
        {mode === "preview" ? (
          <div className="doc-preview p-8 prose prose-slate max-w-none prose-headings:text-slate-800 prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-indigo-900 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-5 prose-h3:mb-2 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-li:leading-relaxed prose-blockquote:text-indigo-700 prose-blockquote:bg-indigo-50/50 prose-blockquote:border-indigo-400 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:font-medium prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-hr:border-slate-200 prose-hr:my-6 prose-strong:text-slate-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                sub: ({ children }) => (
                  <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-[11px] text-slate-400 leading-relaxed font-normal not-prose">
                    {children}
                  </div>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className="w-full h-[500px] p-6 text-sm font-mono text-slate-700 bg-slate-50 border-none focus:outline-none resize-none"
            spellCheck={false}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <a
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`}
            download="design-documentation.md"
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition"
          >
            Download .md
          </a>
          <button
            onClick={onNext}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
          >
            Publish to Confluence
          </button>
        </div>
      </div>
    </div>
  );
}
