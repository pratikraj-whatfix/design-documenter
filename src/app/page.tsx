"use client";

import { useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import SetupStep from "@/components/SetupStep";
import SelectChatsStep from "@/components/SelectChatsStep";
import TemplateStep from "@/components/TemplateStep";
import ReviewStep from "@/components/ReviewStep";
import PublishStep from "@/components/PublishStep";
import { TemplateSection, DEFAULT_SECTIONS } from "@/lib/template";

export default function Home() {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>(
    DEFAULT_SECTIONS.map((s) => ({ ...s }))
  );
  const [userPrompt, setUserPrompt] = useState("");
  const [markdown, setMarkdown] = useState("");

  const reset = () => {
    setStep(0);
    setSelectedId(null);
    setSections(DEFAULT_SECTIONS.map((s) => ({ ...s })));
    setUserPrompt("");
    setMarkdown("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Design Documenter
              </h1>
              <p className="text-xs text-slate-400">
                Cursor Chats &rarr; Confluence
              </p>
            </div>
          </div>
          {step > 0 && (
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <StepIndicator currentStep={step} onStepClick={setStep} />

        <div className="mt-2">
          {step === 0 && <SetupStep onComplete={() => setStep(1)} />}

          {step === 1 && (
            <SelectChatsStep
              selectedId={selectedId}
              onSelectionChange={setSelectedId}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TemplateStep
              sections={sections}
              onSectionsChange={setSections}
              userPrompt={userPrompt}
              onPromptChange={setUserPrompt}
              onNext={() => {
                setMarkdown("");
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && selectedId && (
            <ReviewStep
              selectedId={selectedId}
              sections={sections}
              userPrompt={userPrompt}
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <PublishStep
              markdown={markdown}
              onBack={() => setStep(3)}
              onReset={reset}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-slate-100 py-4">
        <p className="text-center text-xs text-slate-300">
          Design Documenter &mdash; Your credentials stay local and are never shared.
        </p>
      </footer>
    </div>
  );
}
