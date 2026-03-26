import fs from "fs";
import path from "path";
import os from "os";

export interface AppConfig {
  confluenceBaseUrl: string;
  confluenceEmail: string;
  confluenceApiToken: string;
  confluencePageUrl: string;
  transcriptsPath: string;
}

const CONFIG_PATH = path.join(process.cwd(), ".doc-config.json");

export function loadConfig(): Partial<AppConfig> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveConfig(config: Partial<AppConfig>): void {
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

export function detectTranscriptsPath(): string | null {
  const all = detectAllTranscriptsPaths();
  return all.length > 0 ? all[0] : null;
}

export function detectAllTranscriptsPaths(): string[] {
  const homeDir = os.homedir();
  const cursorProjectsDir = path.join(homeDir, ".cursor", "projects");

  if (!fs.existsSync(cursorProjectsDir)) return [];

  const paths: string[] = [];
  try {
    const entries = fs.readdirSync(cursorProjectsDir);
    for (const entry of entries) {
      const transcriptsDir = path.join(
        cursorProjectsDir,
        entry,
        "agent-transcripts"
      );
      if (fs.existsSync(transcriptsDir)) {
        paths.push(transcriptsDir);
      }
    }
  } catch {
    // ignore
  }
  return paths;
}

export function parseConfluenceUrl(url: string): {
  baseUrl: string;
  spaceKey: string;
  pageId: string;
} | null {
  try {
    const parsed = new URL(url);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;

    // Cloud format: /wiki/spaces/SPACE/pages/123456/Page+Title
    const pagesMatch = parsed.pathname.match(
      /\/wiki\/spaces\/([^/]+)\/pages\/(\d+)/
    );
    if (pagesMatch) {
      return { baseUrl, spaceKey: pagesMatch[1], pageId: pagesMatch[2] };
    }

    // Also try: /wiki/pages/viewpage.action?pageId=123456
    const pageIdParam = parsed.searchParams.get("pageId");
    if (pageIdParam) {
      return { baseUrl, spaceKey: "", pageId: pageIdParam };
    }

    return null;
  } catch {
    return null;
  }
}
