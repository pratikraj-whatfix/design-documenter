"use client";

const steps = [
  { label: "Connect", description: "Link Confluence" },
  { label: "Select", description: "Pick a chat" },
  { label: "Template", description: "Configure sections" },
  { label: "Review", description: "Preview & edit" },
  { label: "Publish", description: "Send to Confluence" },
];

export default function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <nav className="w-full max-w-3xl mx-auto mb-10">
      <ol className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const isClickable = idx < currentStep;

          return (
            <li key={step.label} className="flex-1 flex flex-col items-center relative">
              {idx > 0 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-0.5 transition-colors duration-300 ${
                    idx <= currentStep ? "bg-indigo-500" : "bg-slate-200"
                  }`}
                />
              )}
              <button
                onClick={() => isClickable && onStepClick(idx)}
                disabled={!isClickable}
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "bg-indigo-500 text-white shadow-md cursor-pointer hover:bg-indigo-600"
                    : isActive
                    ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100"
                    : "bg-slate-100 text-slate-400 cursor-default"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </button>
              <span
                className={`mt-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? "text-indigo-600" : isCompleted ? "text-indigo-500" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
              <span
                className={`text-[9px] transition-colors ${
                  isActive ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {step.description}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
