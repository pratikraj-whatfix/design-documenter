"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ConfluenceSection {
  id: string;
  heading: string;
  level: number;
  content: string;
}

interface PublishStepProps {
  markdown: string;
  onBack: () => void;
  onReset: () => void;
}

function parseConfluenceSections(html: string): ConfluenceSection[] {
  const sections: ConfluenceSection[] = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  const headings: { level: number; title: string; index: number }[] = [];

  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      title: match[2].replace(/<[^>]*>/g, "").trim(),
      index: match.index,
    });
  }

  if (headings.length === 0) {
    if (html.trim()) {
      sections.push({
        id: "existing-0",
        heading: "(Page content)",
        level: 1,
        content: html,
      });
    }
    return sections;
  }

  if (headings[0].index > 0) {
    const before = html.substring(0, headings[0].index).trim();
    if (before) {
      sections.push({
        id: "existing-pre",
        heading: "(Preamble)",
        level: 0,
        content: before,
      });
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : html.length;
    sections.push({
      id: `existing-${i}`,
      heading: headings[i].title,
      level: headings[i].level,
      content: html.substring(start, end),
    });
  }

  return sections;
}

export default function PublishStep({
  markdown,
  onBack,
  onReset,
}: PublishStepProps) {
  const [publishing, setPublishing] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [existingSections, setExistingSections] = useState<ConfluenceSection[]>([]);
  const [insertAfter, setInsertAfter] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace" | "insert">("append");
  const [pageTitle, setPageTitle] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  const fetchExistingPage = useCallback(async () => {
    setLoadingPage(true);
    try {
      const res = await fetch("/api/confluence/page");
      const data = await res.json();
      if (data.ok && data.body) {
        setPageTitle(data.title || "Confluence Page");
        const sections = parseConfluenceSections(data.body);
        setExistingSections(sections);
        if (sections.length > 0) {
          setInsertAfter(sections[sections.length - 1].id);
        }
      } else {
        setExistingSections([]);
      }
    } catch {
      setExistingSections([]);
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    fetchExistingPage();
  }, [fetchExistingPage]);

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          mode,
          insertAfterId: mode === "insert" ? insertAfter : undefined,
          generateToc: true,
        }),
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
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Publish to Confluence
        </h2>
        <p className="text-slate-500 text-sm">
          Choose where to place your documentation on the Confluence page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Confluence Page Preview */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {loadingPage ? "Loading..." : pageTitle}
            </h3>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {loadingPage ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              </div>
            ) : existingSections.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <p>Page is empty or could not be loaded.</p>
                <p className="text-xs mt-1">Documentation will be added as new content.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {existingSections.map((section, idx) => {
                  const isInsertPoint = mode === "insert" && insertAfter === section.id;
                  return (
                    <div key={section.id}>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                          mode === "replace"
                            ? "opacity-40 bg-rose-50"
                            : "bg-slate-50"
                        }`}
                      >
                        <span
                          className="font-medium text-slate-700"
                          style={{ paddingLeft: `${(section.level > 0 ? section.level - 1 : 0) * 12}px` }}
                        >
                          {section.heading}
                        </span>
                      </div>

                      {/* Insert-here button */}
                      {mode === "insert" && (
                        <button
                          onClick={() => setInsertAfter(section.id)}
                          className={`w-full my-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isInsertPoint
                              ? "bg-indigo-50 border-2 border-indigo-400 text-indigo-600"
                              : "border-2 border-dashed border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {isInsertPoint ? (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Insert here
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Insert after this section
                            </>
                          )}
                        </button>
                      )}

                      {/* Show divider for append mode on last item */}
                      {mode === "append" && idx === existingSections.length - 1 && (
                        <div className="mt-2 pt-2 border-t-2 border-dashed border-indigo-300">
                          <div className="rounded-lg px-3 py-2 bg-indigo-50 text-xs font-medium text-indigo-600">
                            New documentation will be appended here
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: New documentation preview */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100">
            <h3 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              New Documentation
            </h3>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto doc-preview prose prose-sm prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {markdown.length > 3000 ? markdown.substring(0, 3000) + "\n\n*... (truncated preview) ...*" : markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Publish mode selector */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Publish Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              value: "append" as const,
              label: "Append",
              desc: "Add at the end of existing content",
              icon: "M12 4v16m0 0l-4-4m4 4l4-4",
            },
            {
              value: "insert" as const,
              label: "Insert Between",
              desc: "Choose where to place the content",
              icon: "M4 12h16M12 4v16",
            },
            {
              value: "replace" as const,
              label: "Replace All",
              desc: "Overwrite the entire page",
              icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === opt.value
                  ? "border-indigo-400 bg-indigo-50/50 shadow-sm"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-4 h-4 ${mode === opt.value ? "text-indigo-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                </svg>
                <span className={`text-sm font-semibold ${mode === opt.value ? "text-indigo-700" : "text-slate-700"}`}>
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* TOC notice */}
      <div className="mb-8 rounded-lg bg-amber-50/50 border border-amber-200/50 p-3 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700">
          A <strong>Table of Contents</strong> will be automatically generated at the top of the published document based on all section headings.
        </p>
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
              Publishing...
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
