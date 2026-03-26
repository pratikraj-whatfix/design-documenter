import fs from "fs";
import path from "path";

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TranscriptSummary {
  id: string;
  title: string;
  label: string;
  summary: string;
  messageCount: number;
  preview: string;
  modifiedAt: string;
  sizeKb: number;
}

export interface TranscriptDetail {
  id: string;
  messages: TranscriptMessage[];
}

function extractTitle(content: string): string {
  const userQueryMatch = content.match(
    /<user_query>\s*([\s\S]*?)\s*<\/user_query>/
  );
  if (userQueryMatch) {
    let text = userQueryMatch[1]
      .replace(/@[^\s]+/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (text.length > 120) text = text.slice(0, 120) + "...";
    return text || "Untitled conversation";
  }

  const firstLine = content.split("\n").find((l) => l.trim().length > 5);
  if (firstLine) {
    const text = firstLine.replace(/^(user:|assistant:)\s*/i, "").trim();
    return text.length > 120 ? text.slice(0, 120) + "..." : text;
  }

  return "Untitled conversation";
}

export function listTranscripts(
  transcriptsDir: string
): TranscriptSummary[] {
  if (!fs.existsSync(transcriptsDir)) return [];

  const files = fs.readdirSync(transcriptsDir).filter((f) => f.endsWith(".txt"));
  const summaries: TranscriptSummary[] = [];

  for (const file of files) {
    const filePath = path.join(transcriptsDir, file);
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf-8");

    const id = file.replace(".txt", "");
    const messages = parseTranscript(content);
    const userMessages = messages.filter((m) => m.role === "user");

    summaries.push({
      id,
      title: extractTitle(content),
      label: deriveChatLabel(messages),
      summary: deriveChatSummary(messages),
      messageCount: userMessages.length,
      preview:
        userMessages[0]?.content.slice(0, 200) || "No user messages found",
      modifiedAt: stat.mtime.toISOString(),
      sizeKb: Math.round(stat.size / 1024),
    });
  }

  return summaries.sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );
}

export function getTranscript(
  transcriptsDir: string,
  id: string
): TranscriptDetail | null {
  const filePath = path.join(transcriptsDir, `${id}.txt`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  return { id, messages: parseTranscript(content) };
}

// ── Chat label & summary derivation ──────────────────────────────────

function cleanUserText(text: string): string {
  return text
    .replace(/@[^\s]+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[^\s]*\.(mp4|png|jpg|jpeg|gif|svg|pdf|xlsx?|csv|json|wav|mp3)\b/gi, "")
    .replace(/\b(PoC|POC)\s+\w+\s*(\(\d+\))?\s*/g, "")
    .replace(/^(CONTEXT|OUTPUT|EXAMPLE|CONSTRAINTS|NOTE|FILES)[:\s]*$/gim, "")
    .replace(/You are (?:a|an) [^.]*?\.\s*/gi, "")
    .replace(/Follow the (?:attached|given|above)[^.]*?\.\s*/gi, "")
    .replace(/(?:help )?build the exact same[^.]*?\.\s*/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b\w+\.\w+\.(?:com|net|org|io|app|dev)\b[^\s]*/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveChatLabel(messages: TranscriptMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length === 0) return "Untitled conversation";

  const first = cleanUserText(userMsgs[0].content);
  if (!first || first.length < 5) return "Untitled conversation";

  const GENERIC = [
    "exact same thing", "same thing", "something", "the thing",
    "this", "it", "that", "everything",
  ];
  const BAD_PATTERNS = [
    /^(js|ts|py|css|html)\b/i,
    /^\w{1,3}\s*\(/,
    /^(reuse|use|copy) the/i,
    /^\d/,
  ];

  const topicPatterns = [
    /(?:build|create|design|implement|develop|set up|establish|revamp|redesign)\s+(?:a\s+|an\s+|the\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as|using|following)\b|[.,\n]|$)/i,
    /(?:working on|exploring|trying to|need to|want to)\s+(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
    /(?:refactor|migrate|update|upgrade|improve|optimize|audit)\s+(?:the\s+|our\s+)?(.{5,50}?)(?:\s+(?:where|which|from|with|for|so|as)\b|[.,\n]|$)/i,
  ];

  for (const pat of topicPatterns) {
    const match = first.match(pat);
    if (match) {
      let title = match[1].replace(/\s+/g, " ").trim()
        .replace(/\s+(a|an|the|of|to|in|on|at|by)$/i, "");
      if (title.length > 50) title = title.slice(0, 50).replace(/\s+\S*$/, "");
      const wordCount = title.split(/\s+/).filter((w) => w.length > 1).length;
      if (
        title.length >= 5 && wordCount >= 2 &&
        !GENERIC.includes(title.toLowerCase()) &&
        !BAD_PATTERNS.some((p) => p.test(title))
      ) {
        const cleaned = title
          .replace(/^(a|an|the)\s+/i, "")
          .replace(/["""''`\u201C\u201D\u2018\u2019]/g, "")
          .replace(/\s*\([^)]*\)\s*/g, " ")
          .replace(/\s+including\b.*$/i, "")
          .replace(/\s+following\b.*$/i, "")
          .replace(/^(language|entire|full|complete|exploring)\s+(for\s+)?(exploring\s+)?/i, "")
          .replace(/\.\s*$/, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (/^\w+:\s/.test(cleaned)) {
          const afterColon = cleaned.replace(/^\w+:\s*/, "").trim();
          if (afterColon.length >= 5)
            return afterColon.charAt(0).toUpperCase() + afterColon.slice(1);
        }
        if (cleaned.length >= 5)
          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  // Noun phrase fallback
  const allSentences = first.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200);
  for (const sentence of allSentences) {
    const nounMatch = sentence.match(
      /\b(\w+(?:\s+\w+){0,3}\s+(?:pipeline|system|platform|dashboard|tool|app|service|module|feature|project|revamp|redesign|audit|website|page|component|library|portfolio|documentation))\b/i
    );
    if (nounMatch) {
      let t = nounMatch[1].replace(/^(a|an|the)\s+/i, "").trim();
      if (t.length >= 5 && t.split(/\s+/).length >= 2)
        return t.charAt(0).toUpperCase() + t.slice(1);
    }
  }

  // Final fallback: first clause
  const fragment = first.split(/[.,!?\n]/)[0]?.trim() || "Untitled conversation";
  const cleaned = fragment.replace(/^(we are |I am |I want to |Firstly,?\s*)/i, "").trim();
  const capped = cleaned.length > 50 ? cleaned.slice(0, 50).replace(/\s+\S*$/, "") + "..." : cleaned;
  return capped.length >= 3 ? capped.charAt(0).toUpperCase() + capped.slice(1) : "Untitled conversation";
}

function deriveChatSummary(messages: TranscriptMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length === 0) return "";

  const first = cleanUserText(userMsgs[0].content);
  const sentences = first
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 15 || s.length > 300) return false;
      const skip = [
        /^(Here is|http|Follow the|You are|CONTEXT|OUTPUT|EXAMPLE|CONSTRAINTS|NOTE|FILES)/i,
        /^\s*[-*]\s/, /^\d+\.\s/,
        /^(Use|Keep|Provide|Include|Implement|Return|Limit|Save|Call|Expose)\s/i,
        /^(accept|persist|optionally|apply)\s/i,
        /below prompt|attached prototype|exact same thing/i,
        /^(PoC|POC|Trial)\b/i,
      ];
      return !skip.some((r) => r.test(s));
    });

  // Take up to 2 sentences for summary
  let summary = sentences.slice(0, 2).join(". ");
  if (summary && !summary.endsWith(".")) summary += ".";
  if (summary.length > 220) {
    const cutoff = summary.lastIndexOf(".", 220);
    summary = cutoff > 50 ? summary.slice(0, cutoff + 1) : summary.slice(0, 220) + "...";
  }

  // Add scope context from later messages if the first message is short
  if (summary.length < 80 && userMsgs.length > 1) {
    const laterTopics: string[] = [];
    for (let i = 1; i < Math.min(userMsgs.length, 4); i++) {
      const cleaned = cleanUserText(userMsgs[i].content);
      if (cleaned.length < 20) continue;
      const firstSentence = cleaned.split(/[.!?\n]+/)[0]?.trim();
      if (firstSentence && firstSentence.length > 15 && firstSentence.length < 150) {
        laterTopics.push(firstSentence);
      }
    }
    if (laterTopics.length > 0) {
      summary += " Also covered: " + laterTopics.slice(0, 2).join("; ") + ".";
    }
  }

  return summary;
}

function parseTranscript(content: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  const sections = content.split(/^(user|assistant):\s*$/m);

  let currentRole: "user" | "assistant" | null = null;

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed === "user") {
      currentRole = "user";
      continue;
    }
    if (trimmed === "assistant") {
      currentRole = "assistant";
      continue;
    }

    if (currentRole && trimmed.length > 0) {
      let cleanContent = trimmed;

      if (currentRole === "user") {
        const queryMatch = cleanContent.match(
          /<user_query>\s*([\s\S]*?)\s*<\/user_query>/
        );
        if (queryMatch) {
          cleanContent = queryMatch[1].trim();
        }
      }

      if (currentRole === "assistant") {
        cleanContent = cleanContent
          .replace(/\[Thinking\][\s\S]*?(?=\n[A-Z]|\n\[|\n$)/g, "")
          .replace(/\[Tool call\][\s\S]*?(?=\[Tool result\])/g, "")
          .replace(/\[Tool result\].*$/gm, "")
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim();
      }

      if (cleanContent.length > 0) {
        messages.push({ role: currentRole, content: cleanContent });
      }
    }
  }

  return messages;
}
