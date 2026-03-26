import { TranscriptMessage } from "./transcripts";

interface GeneratedDoc {
  title: string;
  markdown: string;
}

// ── Noise filtering ──────────────────────────────────────────────────

const NOISE_STARTS = [
  "let me ", "now let me ", "good,", "good.", "i can see",
  "i'll ", "i will ", "looking at", "checking ", "let me check",
  "setting up", "now i need", "i need to", "i'm going to",
  "i'm thinking", "i'm organizing", "i'm redesigning", "i'm seeing",
  "i see ", "i see,", "i see --",
  "ok,", "ok.", "okay,", "alright,", "sure,", "sure.",
  "here's what", "here is what", "the file", "this file",
  "the output", "command completed", "exit code",
  "i also want", "i should", "time to",
  "now i'll ", "now update", "now let", "actually let",
  "continuing through", "moving into", "for the form",
  "deployed successfully", "the error at",
  "the dashboard is now", "the package info",
];

function isNoise(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 40) return true;
  if (NOISE_STARTS.some((n) => lower.startsWith(n))) return true;
  if (/^\[?(tool|thinking|setting|install|running|reading)\b/i.test(lower)) return true;
  if (/^(created|updated|wrote|deleted|moved|copied|installed)\b/i.test(lower)) return true;
  if (/^```/.test(lower)) return true;
  // Filter deployment/command narration
  if (/\b(now copy|now deploy|now update the|let me verify|vercel|npm run|git push)\b/i.test(lower) && lower.length < 150) return true;
  return false;
}

function cleanDecisionContent(text: string): string {
  return text
    // Strip first-person narration patterns
    .replace(/^(For this,?\s*)?I('m| am| need to| should| want to| see|'ll)\s+[^.]*?\.\s*/i, "")
    .replace(/\bI('m| am| need to| should)\b[^.]*?\.\s*/g, "")
    // Strip orphaned bold markers at the start
    .replace(/^\*\*[^*]*\*\*\s*[-—]\s*/, "")
    .replace(/^[-*]\s*\*\*/, "**")
    // Strip command/deployment lines
    .replace(/^[-*]\s*Now (?:copy|update|deploy|build)[^\n]*\n?/gm, "")
    .replace(/^[-*]\s*The (?:error|package info|warning)[^\n]*\n?/gm, "")
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/@[^\s]+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[Tool (?:call|result)\][^\n]*/g, "")
    .replace(/\[Thinking\][^\n]*/g, "")
    // Remove file references (leftover from @file paths, media files)
    .replace(/[^\s]*\.(mp4|png|jpg|jpeg|gif|svg|pdf|xlsx?|csv|json|wav|mp3)\b/gi, "")
    // Remove "PoC Trial (N)" and similar artifact fragments
    .replace(/\b(PoC|POC)\s+\w+\s*(\(\d+\))?\s*/g, "")
    // Remove structured prompt headers
    .replace(/^(CONTEXT|OUTPUT EXPECTED|EXAMPLE|CONSTRAINTS|PRACTICALS|NOTE|FILES TO GENERATE)[:\s]*$/gim, "")
    // Remove role prompts anywhere
    .replace(/You are (?:a|an) [^.]*?\.\s*/gi, "")
    // Remove follow-the-reference preambles anywhere
    .replace(/Follow the (?:attached|given|above)[^.]*?\.\s*/gi, "")
    // Remove "build the exact same thing" preambles
    .replace(/(?:help )?build the exact same[^.]*?\.\s*/gi, "")
    // Remove URLs entirely from objective/title source (keep original in decision content)
    .replace(/https?:\/\/\S+/g, "")
    // Remove partial URL fragments and domain names
    .replace(/\b\w+\.\w+\.(?:com|net|org|io|app|dev)\b[^\s]*/g, "")
    // Remove backtick-wrapped code references
    .replace(/`[^`]*`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Objective synthesis ──────────────────────────────────────────────

function synthesizeObjective(userMessages: string[]): string {
  if (userMessages.length === 0) return "";

  const primary = userMessages[0];

  const sentences = primary
    .split(/[.!?\n]+/)
    .map((s) => s.replace(/\[link\]\([^)]*\)/g, "").trim())
    .filter((s) => {
      if (s.length < 15 || s.length > 250) return false;
      const skip = [
        /^(Here is|http|Follow the|You are|CONTEXT|OUTPUT|EXAMPLE|CONSTRAINTS|NOTE|FILES)/i,
        /^\s*[-*]\s/,
        /^\w+\.\w{2,4}$/,
        /^\d+\.\s/,
        /^(Use|Keep|Provide|Include|Implement|Return|Limit|Save|Call|Expose)\s/i,
        /^(accept|persist|optionally|apply)\s/i,
        /below prompt|attached prototype|exact same thing/i,
        /^(PoC|POC|Trial)\b/i,
        /\b\w+\.js\b|\b\w+\.ts\b|\b\w+\.py\b/,  // file references
        /^\w+\s*[-—]+\s/,  // looks like a list/spec line
        /`[^`]+`/,  // contains inline code
      ];
      return !skip.some((r) => r.test(s));
    });

  // Prefer sentences that describe what's being built
  const intentSentences = sentences.filter((s) =>
    /\b(build|create|design|implement|need|want|goal|purpose|develop|establish|trying|intention)\b/i.test(s)
  );

  const best = intentSentences.length > 0 ? intentSentences : sentences;
  let objective = best.slice(0, 2).join(". ");
  if (objective && !objective.endsWith(".")) objective += ".";

  if (objective.length > 280) {
    const cutoff = objective.lastIndexOf(".", 280);
    objective = cutoff > 100 ? objective.slice(0, cutoff + 1) : objective.slice(0, 280) + "...";
  }

  return objective;
}

// ── Title derivation ─────────────────────────────────────────────────

function cleanTitle(raw: string): string {
  let t = raw
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/["""''`\u201C\u201D\u2018\u2019]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+including\b.*$/i, "")
    .replace(/\s+following\b.*$/i, "")
    .replace(/^(language|entire|full|complete|exploring)\s+(for\s+)?/i, "")
    .replace(/\.\s*$/, "")
    .trim();

  // If title is a single generic word + colon + rest, drop the word before colon
  if (/^\w+:\s/.test(t)) {
    const afterColon = t.replace(/^\w+:\s*/, "").trim();
    if (afterColon.length >= 5) t = afterColon;
  }

  return t;
}

function deriveTitle(userMessages: string[]): string {
  if (userMessages.length === 0) return "Design Documentation";

  const first = userMessages[0]
    .replace(/\[link\]\([^)]*\)/g, "")
    .replace(/@[^\s]+/g, "")
    .trim();

  // Try to extract an action-oriented phrase
  const topicPatterns = [
    /(?:build|create|design|implement|develop|set up|establish|revamp|redesign)\s+(?:a\s+|an\s+|the\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as|using|following)\b|[.,\n]|$)/i,
    /(?:working on|exploring|trying to|need to|want to)\s+(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
    /(?:refactor|migrate|update|upgrade|improve|optimize|audit)\s+(?:the\s+|our\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
  ];

  const GENERIC_TITLES = [
    "exact same thing", "same thing", "something", "the thing",
    "this", "it", "that", "everything",
  ];

  const BAD_TITLE_PATTERNS = [
    /^(js|ts|py|css|html)\b/i,
    /^\w{1,3}\s*\(/,        // "Js (>=18)"
    /^(reuse|use|copy) the/i,
    /^\d/,
  ];

  for (const pat of topicPatterns) {
    const match = first.match(pat);
    if (match) {
      let title = match[1].replace(/\s+/g, " ").trim();
      title = title.replace(/\s+(a|an|the|of|to|in|on|at|by)$/i, "");
      if (title.length > 50) title = title.slice(0, 50).replace(/\s+\S*$/, "");
      const wordCount = title.split(/\s+/).filter((w) => w.length > 1).length;
      if (
        title.length >= 5 &&
        wordCount >= 2 &&
        !GENERIC_TITLES.includes(title.toLowerCase()) &&
        !BAD_TITLE_PATTERNS.some((p) => p.test(title))
      ) {
        const ct = cleanTitle(title);
        if (ct.length >= 5) return ct.charAt(0).toUpperCase() + ct.slice(1);
      }
    }
  }

  // Fallback: look for a key noun phrase in ANY sentence
  const allSentences = first
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 200);

  for (const sentence of allSentences) {
    // Look for "X pipeline/system/platform/dashboard/tool/app"
    const nounMatch = sentence.match(
      /\b(\w+(?:\s+\w+){0,3}\s+(?:pipeline|system|platform|dashboard|tool|app|service|module|feature|project|revamp|redesign|audit))\b/i
    );
    if (nounMatch) {
      let t = nounMatch[1].trim();
      if (t.length >= 5 && t.split(/\s+/).length >= 2) {
        const ct = cleanTitle(t);
        if (ct.length >= 5) return ct.charAt(0).toUpperCase() + ct.slice(1);
      }
    }
  }

  // Final fallback: first clause, cleaned up
  const fragment = first.split(/[.,!?\n]/)[0]?.trim() || "Design Documentation";
  const cleaned = fragment
    .replace(/^(we are |I am |I want to |Firstly,?\s*)/i, "")
    .replace(/^(create|build|design|implement)\s+(a|an|the)\s+/i, "")
    .trim();
  const capped = cleaned.length > 50 ? cleaned.slice(0, 50).replace(/\s+\S*$/, "") + "..." : cleaned;
  const ct = cleanTitle(capped);
  return (ct.length >= 3 ? ct : "Design Documentation").charAt(0).toUpperCase() +
    (ct.length >= 3 ? ct : "Design Documentation").slice(1);
}

// ── Decision & insight extraction ────────────────────────────────────

interface ThemeGroup {
  theme: string;
  icon: string;
  items: string[];
}

const THEME_PATTERNS: { theme: string; icon: string; patterns: RegExp[] }[] = [
  {
    theme: "Architecture & Structure",
    icon: "**[Architecture]**",
    patterns: [
      /\b(architect|structure|pattern|module|layer|separation|monolith|micro|folder structure)\b/i,
      /\b(app router|page router|server component|client component)\b/i,
    ],
  },
  {
    theme: "UI & Visual Design",
    icon: "**[UI/UX]**",
    patterns: [
      /\b(ui|ux|visual|layout|design system|styling|css|tailwind|color|typography|spacing|responsive)\b/i,
      /\b(component|button|card|modal|form|input|navigation|header|footer|sidebar)\b/i,
    ],
  },
  {
    theme: "Data & API",
    icon: "**[Data]**",
    patterns: [
      /\b(api|rest|graphql|endpoint|database|schema|model|query|mutation|fetch|request)\b/i,
      /\b(firebase|firestore|postgres|mongo|redis|supabase)\b/i,
    ],
  },
  {
    theme: "Technical Approach",
    icon: "**[Technical]**",
    patterns: [
      /\b(approach|strategy|implementation|algorithm|optimization|performance|caching)\b/i,
      /\b(typescript|javascript|react|next|node|python|deploy|build|test)\b/i,
    ],
  },
  {
    theme: "Trade-offs & Rationale",
    icon: "**[Rationale]**",
    patterns: [
      /\b(trade-?off|instead of|rather than|chose|decision|rationale|reason|because|opted)\b/i,
      /\b(advantage|disadvantage|pro|con|limitation|constraint)\b/i,
    ],
  },
];

function extractSubstantiveContent(
  messages: TranscriptMessage[]
): { decisions: ThemeGroup[]; outcomes: string[] } {
  const themeMap = new Map<string, Set<string>>();
  const outcomes: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const paragraphs = msg.content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => !isNoise(p) && p.length > 60 && p.length < 1500);

    for (const para of paragraphs) {
      // Check if this paragraph describes an outcome
      if (
        /\b(created|built|generated|deployed|published|completed|implemented|configured|set up)\b/i.test(para) &&
        para.length < 300 &&
        !isNoise(para)
      ) {
        const cleaned = para.replace(/\*\*/g, "").trim();
        // Skip noise-like outcomes
        if (
          cleaned.length > 30 &&
          !/\b(error at the end|package info|version.?check|warning)\b/i.test(cleaned)
        ) {
          // Take only the first sentence of the outcome
          const firstSentence = cleaned.split(/[.!?]\s/)[0];
          if (firstSentence && firstSentence.length > 20) {
            const cleanOutcome = cleanDecisionContent(firstSentence);
            if (cleanOutcome.length > 20) {
              outcomes.push(
                cleanOutcome.endsWith(".") ? cleanOutcome : cleanOutcome + "."
              );
            }
          }
        }
        continue;
      }

      // Classify into themes
      let bestTheme: string | null = null;
      let bestScore = 0;

      for (const t of THEME_PATTERNS) {
        const score = t.patterns.filter((p) => p.test(para)).length;
        if (score > bestScore) {
          bestScore = score;
          bestTheme = t.theme;
        }
      }

      if (bestTheme && bestScore >= 1) {
        if (!themeMap.has(bestTheme)) themeMap.set(bestTheme, new Set());
        const condensed = cleanDecisionContent(condenseParagraph(para));
        if (condensed.length > 30) {
          themeMap.get(bestTheme)!.add(condensed);
        }
      }
    }
  }

  const decisions: ThemeGroup[] = [];
  for (const t of THEME_PATTERNS) {
    const items = themeMap.get(t.theme);
    if (items && items.size > 0) {
      // Merge very similar items and cap at 5 per theme
      const merged = mergeRelatedItems([...items]);
      decisions.push({
        theme: t.theme,
        icon: t.icon,
        items: merged.slice(0, 5),
      });
    }
  }

  return {
    decisions,
    outcomes: [...new Set(outcomes)].slice(0, 8),
  };
}

function condenseParagraph(para: string): string {
  const sentences = para.split(/(?<=[.!?])\s+/);
  const meaningful = sentences.filter(
    (s) => s.trim().length > 15 && !isNoise(s)
  );
  return meaningful.slice(0, 3).join(" ").trim();
}

function mergeRelatedItems(items: string[]): string[] {
  if (items.length <= 3) return items;

  // Simple deduplication: remove items that are substrings of others
  const sorted = items.sort((a, b) => b.length - a.length);
  const result: string[] = [];

  for (const item of sorted) {
    const isDuplicate = result.some((existing) => {
      const overlap = longestCommonSubstring(
        existing.toLowerCase(),
        item.toLowerCase()
      );
      return overlap > item.length * 0.5;
    });
    if (!isDuplicate) result.push(item);
  }

  return result;
}

function longestCommonSubstring(a: string, b: string): number {
  // Simplified: check word-level overlap ratio
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap;
}

// ── Context extraction ───────────────────────────────────────────────

function extractContext(userMessages: string[]): string {
  const contextParts: string[] = [];

  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    // Look for explicit context markers
    if (
      lower.includes("context") ||
      lower.includes("background") ||
      lower.includes("currently") ||
      lower.includes("existing") ||
      lower.includes("our current")
    ) {
      const sentences = msg
        .split(/[.!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && s.length < 300);
      for (const s of sentences.slice(0, 3)) {
        if (
          /\b(current|existing|today|right now|at present|we have|our)\b/i.test(s)
        ) {
          contextParts.push(s);
        }
      }
    }
  }

  return [...new Set(contextParts)].slice(0, 4).join(". ").trim();
}

// ── Main generator ───────────────────────────────────────────────────

export function generateDocumentation(
  transcriptMessages: { id: string; messages: TranscriptMessage[] }[]
): GeneratedDoc {
  const allMessages = transcriptMessages.flatMap((t) => t.messages);

  const userMessages = allMessages
    .filter((m) => m.role === "user")
    .map((m) => cleanText(m.content))
    .filter((t) => t.length > 10);

  const title = deriveTitle(userMessages);
  const objective = synthesizeObjective(userMessages);
  const context = extractContext(userMessages);
  const { decisions, outcomes } = extractSubstantiveContent(allMessages);

  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = "";

  // ── Title ──
  md += `# ${title}\n\n`;

  // ── Objective as a blockquote ──
  if (objective) {
    md += `> ${objective}\n\n`;
  }

  md += `---\n\n`;

  // ── Context & Background (only if meaningful context found) ──
  if (context && context.length > 30) {
    md += `## Background\n\n`;
    md += `${context}.\n\n`;
  }

  // ── Approach & Decisions (grouped by theme) ──
  if (decisions.length > 0) {
    md += `## Approach & Key Decisions\n\n`;

    for (const group of decisions) {
      md += `### ${group.theme}\n\n`;
      if (group.items.length === 1) {
        md += `${group.items[0]}\n\n`;
      } else {
        for (const item of group.items) {
          // If item is short enough, render as bullet; otherwise as paragraph
          if (item.length < 200) {
            md += `- ${item}\n`;
          } else {
            md += `${item}\n\n`;
          }
        }
        md += "\n";
      }
    }
  }

  // ── Outcomes (what was actually produced) ──
  if (outcomes.length > 0) {
    md += `## Outcomes\n\n`;
    for (const outcome of outcomes) {
      md += `- ${outcome}\n`;
    }
    md += "\n";
  }

  // ── Separator before metadata ──
  md += `---\n\n`;

  // ── Session metadata (visually de-emphasized) ──
  const totalUserMsgs = allMessages.filter((m) => m.role === "user").length;
  const totalAssistantMsgs = allMessages.filter((m) => m.role === "assistant").length;

  md += `<sub>\n\n`;
  md += `**Session info** | `;
  md += `Generated ${now} | `;
  md += `${transcriptMessages.length} session(s) | `;
  md += `${totalUserMsgs} prompts, ${totalAssistantMsgs} responses`;

  if (transcriptMessages.length > 0) {
    md += ` | Sessions: `;
    md += transcriptMessages
      .map((t) => `\`${t.id.slice(0, 8)}\``)
      .join(", ");
  }

  md += `\n\n</sub>\n`;

  return { title, markdown: md };
}
