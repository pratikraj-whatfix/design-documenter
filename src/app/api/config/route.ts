import { NextResponse } from "next/server";
import {
  loadConfig,
  saveConfig,
  detectTranscriptsPath,
  parseConfluenceUrl,
} from "@/lib/config";
import { testConnection, getPageInfo } from "@/lib/confluence";

export async function GET() {
  const config = loadConfig();
  const detected = detectTranscriptsPath();
  return NextResponse.json({
    ...config,
    detectedTranscriptsPath: detected,
    hasTranscriptsPath: !!(config.transcriptsPath || detected),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    confluencePageUrl,
    confluenceEmail,
    confluenceApiToken,
    transcriptsPath,
  } = body;

  const errors: Record<string, string> = {};

  // Parse the Confluence URL
  let baseUrl = "";
  let pageId = "";
  if (confluencePageUrl) {
    const parsed = parseConfluenceUrl(confluencePageUrl);
    if (!parsed) {
      errors.confluencePageUrl =
        "Could not parse this URL. Paste a full Confluence page link.";
    } else {
      baseUrl = parsed.baseUrl;
      pageId = parsed.pageId;
    }
  }

  // Validate Confluence credentials
  if (baseUrl && confluenceEmail && confluenceApiToken) {
    const connResult = await testConnection({
      baseUrl,
      email: confluenceEmail,
      apiToken: confluenceApiToken,
    });
    if (!connResult.ok) {
      errors.confluenceApiToken = connResult.error || "Connection failed";
    } else if (pageId) {
      const pageInfo = await getPageInfo(
        { baseUrl, email: confluenceEmail, apiToken: confluenceApiToken },
        pageId
      );
      if (!pageInfo) {
        errors.confluencePageUrl =
          "Connected to Confluence but could not find this page. Check the URL.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  saveConfig({
    confluenceBaseUrl: baseUrl,
    confluenceEmail,
    confluenceApiToken,
    confluencePageUrl,
    transcriptsPath: transcriptsPath || detectTranscriptsPath() || "",
  });

  return NextResponse.json({ ok: true });
}
