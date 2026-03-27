import { TranscriptMessage } from "./transcripts";

interface SectionInput {
  id: string;
  title: string;
  placeholders: string[];
}

interface GeneratedDoc {
  title: string;
  markdown: string;
}

const NOISE_STARTS = [
  "let me ", "now let me ", "good,", "good.", "i can see",
  "i'll ", "i will ", "looking at", "checking ", "let me check",
  "setting up", "now i need", "i need to", "i'm going to",
  "i'm thinking", "i'm organizing", "i'm redesigning", "i'm seeing",
  "i see ", "i see,", "ok,", "ok.", "okay,", "alright,", "sure,", "sure.",
  "here's what", "here is what", "the file", "this file",
  "the output", "command completed", "exit code",
  "now i'll ", "now update", "now let", "actually let",
  "deployed successfully", "the error at",
];

function isNoise(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 35) return true;
  if (NOISE_STARTS.some((n) => lower.startsWith(n))) return true;
  if (/^\[?(tool|thinking|setting|install|running|reading)\b/i.test(lower)) return true;
  if (/^(created|updated|wrote|deleted|moved|copied|installed)\b/i.test(lower)) return true;
  if (/^```/.test(lower)) return true;
  if (/\b(npm run|git push|vercel|now copy|now deploy)\b/i.test(lower) && lower.length < 150) return true;
  return false;
}

function cleanText(text: string): string {
  return text
    .replace(/@[^\s]+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[Tool (?:call|result)\][^\n]*/g, "")
    .replace(/\[Thinking\][^\n]*/g, "")
    .replace(/[^\s]*\.(mp4|png|jpg|jpeg|gif|svg|pdf|xlsx?|csv|json|wav|mp3)\b/gi, "")
    .replace(/^(CONTEXT|OUTPUT EXPECTED|EXAMPLE|CONSTRAINTS|NOTE|FILES TO GENERATE)[:\s]*$/gim, "")
    .replace(/You are (?:a|an) [^.]*?\.\s*/gi, "")
    .replace(/Follow the (?:attached|given|above)[^.]*?\.\s*/gi, "")
    .replace(/(?:help )?build the exact same[^.]*?\.\s*/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b\w+\.\w+\.(?:com|net|org|io|app|dev)\b[^\s]*/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanDecision(text: string): string {
  return text
    .replace(/^(For this,?\s*)?I('m| am| need to| should| want to| see|'ll)\s+[^.]*?\.\s*/i, "")
    .replace(/\bI('m| am| need to| should)\b[^.]*?\.\s*/g, "")
    .replace(/^\*\*[^*]*\*\*\s*[-—]\s*/, "")
    .replace(/^[-*]\s*\*\*/, "**")
    .replace(/^[-*]\s*Now (?:copy|update|deploy|build)[^\n]*\n?/gm, "")
    .replace(/^[-*]\s*The (?:error|package info|warning)[^\n]*\n?/gm, "")
    .trim();
}

function condense(para: string): string {
  const sentences = para.split(/(?<=[.!?])\s+/);
  return sentences
    .filter((s) => s.trim().length > 15 && !isNoise(s))
    .slice(0, 3)
    .join(" ")
    .trim();
}

function dedup(items: string[]): string[] {
  if (items.length <= 2) return items;
  const sorted = items.sort((a, b) => b.length - a.length);
  const result: string[] = [];
  for (const item of sorted) {
    const wordsItem = new Set(item.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const isDup = result.some((existing) => {
      const wordsEx = new Set(existing.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      let overlap = 0;
      for (const w of wordsItem) if (wordsEx.has(w)) overlap++;
      return overlap > wordsItem.size * 0.5;
    });
    if (!isDup) result.push(item);
  }
  return result;
}

// ── Section-specific extraction ─────────────────────────────────────

function extractOverview(
  userMsgs: string[],
  _assistantMsgs: string[]
): string {
  let md = "";

  // Objective
  const objective = synthesizeFromMessages(userMsgs, [
    /\b(build|create|design|implement|need|want|goal|purpose|develop|establish|trying|intention)\b/i,
  ]);
  if (objective) {
    md += `**Objective:** ${objective}\n\n`;
  }

  // Background
  const background = synthesizeFromMessages(userMsgs, [
    /\b(because|currently|existing|today|right now|at present|problem|issue|gap|feedback|data|drop|competitive)\b/i,
  ]);
  if (background) {
    md += `**Background:** ${background}\n\n`;
  }

  // User Problem
  const problemSentences = extractSentences(userMsgs, [
    /\b(user|pain point|frustrat|difficult|confus|struggle|can't|cannot|unable|but currently|however)\b/i,
  ]);
  if (problemSentences.length > 0) {
    md += `**User Problem:** ${problemSentences.slice(0, 2).join(" ")}\n\n`;
  }

  if (!md) {
    md += `*Content for this section will be informed by the conversation context.*\n\n`;
  }

  return md;
}

function extractResearch(
  userMsgs: string[],
  assistantMsgs: string[]
): string {
  let md = "";
  const allMsgs = [...userMsgs, ...assistantMsgs];

  const research = extractSentences(allMsgs, [
    /\b(research|interview|survey|user study|usability test|finding|insight|discovered)\b/i,
  ]);
  if (research.length > 0) {
    md += `**User Research:**\n`;
    for (const r of research.slice(0, 4)) md += `- ${r}\n`;
    md += "\n";
  }

  const competitive = extractSentences(allMsgs, [
    /\b(competitor|competitive|benchmark|compared to|alternative|similar product|market)\b/i,
  ]);
  if (competitive.length > 0) {
    md += `**Competitive Analysis:**\n`;
    for (const c of competitive.slice(0, 4)) md += `- ${c}\n`;
    md += "\n";
  }

  const data = extractSentences(allMsgs, [
    /\b(metric|analytics|conversion|bounce rate|engagement|retention|mixpanel|amplitude|google analytics|data shows|data point)\b/i,
  ]);
  if (data.length > 0) {
    md += `**Data Insights:**\n`;
    for (const d of data.slice(0, 4)) md += `- ${d}\n`;
    md += "\n";
  }

  if (!md) {
    md += `*No explicit research references were found in the conversation. Consider adding links to interview notes, competitive analysis, or analytics data.*\n\n`;
  }

  return md;
}

function extractUserFlow(
  userMsgs: string[],
  assistantMsgs: string[]
): string {
  let md = "";
  const allMsgs = [...userMsgs, ...assistantMsgs];

  const persona = extractSentences(allMsgs, [
    /\b(persona|user type|target user|audience|end user|customer segment|demographic)\b/i,
  ]);
  if (persona.length > 0) {
    md += `**User Persona:** ${persona[0]}\n\n`;
  }

  const flow = extractSentences(allMsgs, [
    /\b(step|flow|journey|process|navigate|click|tap|screen|page|then|next|after|before|first|finally|redirect)\b/i,
  ]);
  if (flow.length > 0) {
    md += `**Happy Path:**\n`;
    for (const f of flow.slice(0, 6)) md += `- ${f}\n`;
    md += "\n";
  }

  const edgeCases = extractSentences(allMsgs, [
    /\b(edge case|error|empty|offline|fallback|loading|timeout|no result|invalid|missing|fail|boundary)\b/i,
  ]);
  if (edgeCases.length > 0) {
    md += `**Edge Cases:**\n`;
    for (const e of edgeCases.slice(0, 5)) md += `- ${e}\n`;
    md += "\n";
  }

  md += `**Flow Diagram:**\n`;
  md += `> *[Embed a flow diagram from LucidChart, FigJam, or Mermaid here]*\n\n`;

  return md;
}

function extractIterations(
  _userMsgs: string[],
  assistantMsgs: string[]
): string {
  let md = "";

  const iterations = extractDecisionEvolution(assistantMsgs);

  if (iterations.length === 0) {
    md += `*No clear iteration history detected. Document design iterations manually as the project evolves.*\n\n`;
    return md;
  }

  for (let i = 0; i < iterations.length; i++) {
    const iter = iterations[i];
    md += `### Iteration ${i + 1}: ${iter.label}\n\n`;

    if (iter.approach) {
      md += `**Approach:** ${iter.approach}\n\n`;
    }

    if (iter.decisions.length > 0) {
      md += `**Design Decisions:**\n`;
      for (const d of iter.decisions) md += `- ${d}\n`;
      md += "\n";
    }

    if (iter.feedback) {
      md += `**Feedback / Change:** ${iter.feedback}\n\n`;
    }
  }

  return md;
}

function extractFinalDesign(
  userMsgs: string[],
  assistantMsgs: string[]
): string {
  let md = "";
  const allMsgs = [...userMsgs, ...assistantMsgs];

  md += `**High-Fidelity Mocks:**\n`;
  md += `> *[Embed Figma / Adobe XD live preview here]*\n\n`;

  md += `**Interactive Prototype:**\n`;
  md += `> *[Link to clickable prototype]*\n\n`;

  const components = extractSentences(allMsgs, [
    /\b(component|widget|element|design system|reusable|shared|library|kit|token|variable)\b/i,
  ]);
  if (components.length > 0) {
    md += `**Key UI Components:**\n`;
    for (const c of components.slice(0, 6)) md += `- ${c}\n`;
    md += "\n";
  } else {
    md += `**Key UI Components:**\n`;
    md += `*List any new components added to the Design System.*\n\n`;
  }

  return md;
}

function extractAppendix(
  userMsgs: string[],
  assistantMsgs: string[]
): string {
  let md = "";

  const allRaw = [...userMsgs, ...assistantMsgs].join("\n");

  // Extract any URLs from raw content
  const urls = allRaw.match(/https?:\/\/\S+/g) || [];
  const uniqueUrls = [...new Set(urls)]
    .filter((u) => !u.includes("localhost") && u.length < 200)
    .slice(0, 10);

  if (uniqueUrls.length > 0) {
    md += `**Referenced Links:**\n`;
    for (const u of uniqueUrls) md += `- ${u}\n`;
    md += "\n";
  }

  md += `**Additional Resources:**\n`;
  md += `- [Link to Jira Ticket]\n`;
  md += `- [Link to Figma]\n`;
  md += `- [Link to Confluence Space]\n\n`;

  return md;
}

// ── Helpers ──────────────────────────────────────────────────────────

function synthesizeFromMessages(
  messages: string[],
  patterns: RegExp[]
): string {
  const candidates: string[] = [];

  for (const msg of messages) {
    const sentences = msg
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && s.length < 300);

    for (const s of sentences) {
      if (patterns.some((p) => p.test(s))) {
        const cleaned = s
          .replace(/^\s*[-*]\s+/, "")
          .replace(/^(I want to |I need to |We want to |We need to )/i, "")
          .trim();
        if (cleaned.length > 15 && !isNoise(cleaned)) {
          candidates.push(cleaned);
        }
      }
    }
  }

  const unique = dedup(candidates);
  let result = unique.slice(0, 2).join(". ");
  if (result && !result.endsWith(".")) result += ".";
  if (result.length > 350) {
    const cut = result.lastIndexOf(".", 350);
    result = cut > 50 ? result.slice(0, cut + 1) : result.slice(0, 350) + "...";
  }
  return result;
}

function extractSentences(
  messages: string[],
  patterns: RegExp[]
): string[] {
  const results: string[] = [];
  for (const msg of messages) {
    const sentences = msg
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 400);

    for (const s of sentences) {
      if (patterns.some((p) => p.test(s)) && !isNoise(s)) {
        const cleaned = cleanDecision(s.replace(/^\s*[-*]\s+/, ""));
        if (cleaned.length > 20) {
          results.push(cleaned.endsWith(".") ? cleaned : cleaned + ".");
        }
      }
    }
  }
  return dedup(results);
}

interface DesignIteration {
  label: string;
  approach: string;
  decisions: string[];
  feedback: string;
}

function extractDecisionEvolution(assistantMsgs: string[]): DesignIteration[] {
  const iterations: DesignIteration[] = [];

  const decisionPatterns = [
    /\b(chose|decided|opted|went with|selected|picked|using|switched to|moved to)\b/i,
    /\b(instead of|rather than|over|versus|vs)\b/i,
    /\b(because|since|reason|rationale|trade-?off|advantage|benefit)\b/i,
  ];

  const feedbackPatterns = [
    /\b(changed|revised|updated|refactored|pivoted|reconsidered|moved away|didn't work|wasn't working)\b/i,
    /\b(feedback|issue|problem|limitation|concern|blocker)\b/i,
  ];

  const allDecisions: string[] = [];
  const allFeedback: string[] = [];

  for (const msg of assistantMsgs) {
    const paragraphs = msg
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 50 && p.length < 1500 && !isNoise(p));

    for (const para of paragraphs) {
      const isDecision = decisionPatterns.some((p) => p.test(para));
      const isFeedback = feedbackPatterns.some((p) => p.test(para));

      if (isDecision) {
        const condensed = cleanDecision(condense(para));
        if (condensed.length > 30) allDecisions.push(condensed);
      }
      if (isFeedback) {
        const condensed = cleanDecision(condense(para));
        if (condensed.length > 30) allFeedback.push(condensed);
      }
    }
  }

  const uniqueDecisions = dedup(allDecisions);
  const uniqueFeedback = dedup(allFeedback);

  if (uniqueDecisions.length === 0 && uniqueFeedback.length === 0) {
    return [];
  }

  // Group decisions into iteration chunks
  const chunkSize = Math.max(2, Math.ceil(uniqueDecisions.length / 3));
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueDecisions.length; i += chunkSize) {
    chunks.push(uniqueDecisions.slice(i, i + chunkSize));
  }

  const labels = [
    "Initial Concept",
    "Refined Direction",
    "Final Approach",
  ];

  for (let i = 0; i < Math.min(chunks.length, 3); i++) {
    iterations.push({
      label: labels[i] || `Direction ${i + 1}`,
      approach: chunks[i][0] || "",
      decisions: chunks[i].slice(1, 5),
      feedback: i < uniqueFeedback.length ? uniqueFeedback[i] : "",
    });
  }

  return iterations;
}

function deriveTitle(userMsgs: string[]): string {
  if (userMsgs.length === 0) return "Design Documentation";

  const first = userMsgs[0];

  const topicPatterns = [
    /(?:build|create|design|implement|develop|set up|establish|revamp|redesign)\s+(?:a\s+|an\s+|the\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as|using|following)\b|[.,\n]|$)/i,
    /(?:working on|exploring|trying to|need to|want to)\s+(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
    /(?:refactor|migrate|update|upgrade|improve|optimize|audit)\s+(?:the\s+|our\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
  ];

  for (const pat of topicPatterns) {
    const match = first.match(pat);
    if (match) {
      let title = match[1].replace(/\s+/g, " ").trim();
      title = title.replace(/\s+(a|an|the|of|to|in|on|at|by)$/i, "");
      if (title.length > 50) title = title.slice(0, 50).replace(/\s+\S*$/, "");
      if (title.split(/\s+/).filter((w) => w.length > 1).length >= 2 && title.length >= 5) {
        const cleaned = title
          .replace(/^(a|an|the)\s+/i, "")
          .replace(/["""''`]/g, "")
          .replace(/\s*\([^)]*\)\s*/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (cleaned.length >= 5) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  const fragment = first.split(/[.,!?\n]/)[0]?.trim() || "Design Documentation";
  const cleaned = fragment
    .replace(/^(we are |I am |I want to |Firstly,?\s*)/i, "")
    .replace(/^(create|build|design)\s+(a|an|the)\s+/i, "")
    .trim();
  const capped = cleaned.length > 50 ? cleaned.slice(0, 50).replace(/\s+\S*$/, "") : cleaned;
  return capped.length >= 3 ? capped.charAt(0).toUpperCase() + capped.slice(1) : "Design Documentation";
}

// ── Section-to-generator mapping ────────────────────────────────────

const SECTION_GENERATORS: Record<
  string,
  (userMsgs: string[], assistantMsgs: string[]) => string
> = {
  overview: extractOverview,
  research: extractResearch,
  userflow: extractUserFlow,
  iterations: extractIterations,
  final: extractFinalDesign,
  appendix: extractAppendix,
};

const SECTION_TITLES: Record<string, string> = {
  overview: "Project Overview",
  research: "Research & Discovery",
  userflow: "User Flow & Requirements",
  iterations: "Design Iterations & Evolution",
  final: "Final Design & Prototyping",
  appendix: "Appendix & Resources",
};

// ── Main generator ──────────────────────────────────────────────────

export function generateDocumentation(
  transcript: { id: string; messages: TranscriptMessage[] },
  enabledSections: SectionInput[],
  userPrompt: string
): GeneratedDoc {
  const allMessages = transcript.messages;

  const userMessages = allMessages
    .filter((m) => m.role === "user")
    .map((m) => cleanText(m.content))
    .filter((t) => t.length > 10);

  const assistantMessages = allMessages
    .filter((m) => m.role === "assistant")
    .map((m) => cleanText(m.content))
    .filter((t) => t.length > 10);

  const title = deriveTitle(userMessages);

  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = "";

  // Table of Contents
  md += `# ${title}\n\n`;
  md += `> **Design Documentation** | Generated ${now}\n\n`;

  if (userPrompt) {
    md += `> *Documentation focus: ${userPrompt.split("\n").join("; ")}*\n\n`;
  }

  md += `---\n\n`;
  md += `## Table of Contents\n\n`;
  for (let i = 0; i < enabledSections.length; i++) {
    const sTitle = enabledSections[i].title || SECTION_TITLES[enabledSections[i].id] || "Section";
    const anchor = sTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    md += `${i + 1}. [${sTitle}](#${anchor})\n`;
  }
  md += "\n---\n\n";

  // Generate each section
  for (const section of enabledSections) {
    const sTitle = section.title || SECTION_TITLES[section.id] || "Section";
    md += `## ${sTitle}\n\n`;

    const generator = SECTION_GENERATORS[section.id];
    if (generator) {
      const content = generator(userMessages, assistantMessages);
      md += content;
    } else {
      md += `*Content for this section should be filled in based on the project context.*\n\n`;
    }

    md += `---\n\n`;
  }

  // Session metadata
  const totalUser = allMessages.filter((m) => m.role === "user").length;
  const totalAssistant = allMessages.filter((m) => m.role === "assistant").length;

  md += `<sub>\n\n`;
  md += `**Session info** | Generated ${now} | `;
  md += `${totalUser} prompts, ${totalAssistant} responses | `;
  md += `Session: \`${transcript.id.slice(0, 8)}\``;
  md += `\n\n</sub>\n`;

  return { title, markdown: md };
}
