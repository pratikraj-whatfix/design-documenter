export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  placeholders: string[];
  enabled: boolean;
}

export const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: "overview",
    title: "Project Overview",
    description: "What this feature is and why we are building it now.",
    placeholders: [
      "Objective: What is the primary goal?",
      "Background: What sparked this?",
      "User Problem: As a [user], I want to [action] so that [benefit], but currently [pain point].",
    ],
    enabled: true,
  },
  {
    id: "research",
    title: "Research & Discovery",
    description: "Data that informed the design direction.",
    placeholders: [
      "User Research: Links to interview notes or survey results.",
      "Competitive Analysis: How competitors handle this flow.",
      "Data Insights: Key metrics from analytics.",
    ],
    enabled: true,
  },
  {
    id: "userflow",
    title: "User Flow & Requirements",
    description: "The logic before the visuals.",
    placeholders: [
      "User Persona: Who is this for?",
      "Happy Path: The ideal step-by-step journey.",
      "Edge Cases: Offline, empty states, no results, etc.",
      "Flow Diagram: Embed LucidChart, FigJam, or Mermaid diagram.",
    ],
    enabled: true,
  },
  {
    id: "iterations",
    title: "Design Iterations & Evolution",
    description: "Tracks design debt and prevents 'Did we try X?' questions.",
    placeholders: [
      "Iteration 1: Initial Concept  approach, feedback, why we moved on.",
      "Iteration 2+: Refined directions  decisions with rationale.",
    ],
    enabled: true,
  },
  {
    id: "final",
    title: "Final Design & Prototyping",
    description: "The source of truth for the current build.",
    placeholders: [
      "High-Fidelity Mocks: Embed Figma/Adobe XD previews.",
      "Interactive Prototype: Link to clickable prototype.",
      "Key UI Components: New components added to the Design System.",
    ],
    enabled: true,
  },
  {
    id: "appendix",
    title: "Appendix & Resources",
    description: "Reference links and supporting material.",
    placeholders: [
      "Link to Jira Ticket",
      "Link to Figma",
      "Other supporting documents",
    ],
    enabled: true,
  },
];

export const PROMPT_SUGGESTIONS = [
  "Focus on the technical architecture decisions",
  "Emphasize the user experience rationale",
  "Include all competitive analysis references",
  "Keep it concise  executive summary style",
  "Highlight the iteration journey and what changed",
  "Focus on accessibility and WCAG compliance",
];
