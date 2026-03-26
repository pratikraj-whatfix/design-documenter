import { TranscriptMessage } from "./transcripts";

interface GeneratedDoc {
  title: string;
  markdown: string;
}

function extractDesignDecisions(messages: TranscriptMessage[]): string[] {
  const decisions: string[] = [];
  const decisionPatterns = [
    /(?:decided|decision|chose|chosen|approach|strategy|going with|opted for|trade-?off|rationale|reason(?:ing)?)\b/i,
    /(?:architecture|component|layout|pattern|structure|schema|api|endpoint|database|model)\b/i,
    /(?:instead of|rather than|better than|prefer|recommendation)\b/i,
  ];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const paragraphs = msg.content.split(/\n{2,}/);
    for (const para of paragraphs) {
      const matches = decisionPatterns.filter((p) => p.test(para));
      if (matches.length >= 1 && para.length > 50 && para.length < 2000) {
        decisions.push(para.trim());
      }
    }
  }

  return [...new Set(decisions)].slice(0, 20);
}

function extractUserRequirements(messages: TranscriptMessage[]): string[] {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => {
      let text = m.content
        .replace(/@[^\s]+/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (text.length > 500) text = text.slice(0, 500) + "...";
      return text;
    })
    .filter((t) => t.length > 10);
}

function extractKeyTopics(messages: TranscriptMessage[]): string[] {
  const topicKeywords = new Map<string, number>();
  const importantTerms =
    /\b(component|api|database|schema|layout|style|route|endpoint|auth|config|deploy|test|migration|hook|context|provider|service|model|controller|view|util|helper|module|package|library|framework)\b/gi;

  for (const msg of messages) {
    const matches = msg.content.matchAll(importantTerms);
    for (const match of matches) {
      const term = match[0].toLowerCase();
      topicKeywords.set(term, (topicKeywords.get(term) || 0) + 1);
    }
  }

  return [...topicKeywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
}

function extractImplementationSummary(
  messages: TranscriptMessage[]
): string[] {
  const summaries: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    const lines = msg.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) &&
        trimmed.length > 20 &&
        trimmed.length < 300
      ) {
        summaries.push(trimmed);
      }
    }
  }

  return [...new Set(summaries)].slice(0, 30);
}

export function generateDocumentation(
  transcriptMessages: { id: string; messages: TranscriptMessage[] }[]
): GeneratedDoc {
  const allMessages = transcriptMessages.flatMap((t) => t.messages);
  const requirements = extractUserRequirements(allMessages);
  const decisions = extractDesignDecisions(allMessages);
  const topics = extractKeyTopics(allMessages);
  const implementations = extractImplementationSummary(allMessages);

  const firstReq = requirements[0] || "Design Documentation";
  const title =
    firstReq.length > 80 ? firstReq.slice(0, 80) + "..." : firstReq;

  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = `# Design Documentation\n\n`;
  md += `**Generated:** ${now}  \n`;
  md += `**Source:** ${transcriptMessages.length} Cursor chat session(s)\n\n`;
  md += `---\n\n`;

  // Objective
  md += `## Objective\n\n`;
  if (requirements.length > 0) {
    md += requirements[0] + "\n\n";
  }

  // Key Topics
  if (topics.length > 0) {
    md += `## Key Topics\n\n`;
    md += topics.map((t) => `- ${t}`).join("\n") + "\n\n";
  }

  // Requirements
  if (requirements.length > 1) {
    md += `## Requirements & Context\n\n`;
    for (let i = 0; i < Math.min(requirements.length, 8); i++) {
      md += `### Request ${i + 1}\n\n`;
      md += requirements[i] + "\n\n";
    }
  }

  // Design Decisions
  if (decisions.length > 0) {
    md += `## Design Decisions\n\n`;
    for (let i = 0; i < decisions.length; i++) {
      md += `### Decision ${i + 1}\n\n`;
      md += decisions[i] + "\n\n";
    }
  }

  // Implementation Summary
  if (implementations.length > 0) {
    md += `## Implementation Details\n\n`;
    md += implementations.join("\n") + "\n\n";
  }

  // Conversation Overview
  md += `## Conversation Overview\n\n`;
  for (const transcript of transcriptMessages) {
    md += `### Session: \`${transcript.id.slice(0, 8)}\`\n\n`;
    const userMsgs = transcript.messages.filter((m) => m.role === "user");
    const assistantMsgs = transcript.messages.filter(
      (m) => m.role === "assistant"
    );
    md += `- **User messages:** ${userMsgs.length}\n`;
    md += `- **Assistant responses:** ${assistantMsgs.length}\n\n`;

    for (const msg of userMsgs.slice(0, 5)) {
      const preview =
        msg.content.length > 200
          ? msg.content.slice(0, 200) + "..."
          : msg.content;
      md += `> ${preview.replace(/\n/g, "\n> ")}\n\n`;
    }
  }

  md += `---\n\n`;
  md += `*This documentation was auto-generated from Cursor AI chat sessions using Design Documenter.*\n`;

  return { title, markdown: md };
}
