import fs from "fs";
import path from "path";

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TranscriptSummary {
  id: string;
  title: string;
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
