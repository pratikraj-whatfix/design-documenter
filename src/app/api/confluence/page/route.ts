import { NextResponse } from "next/server";
import { loadConfig, parseConfluenceUrl } from "@/lib/config";

export async function GET() {
  const config = loadConfig();

  if (
    !config.confluenceBaseUrl ||
    !config.confluenceEmail ||
    !config.confluenceApiToken ||
    !config.confluencePageUrl
  ) {
    return NextResponse.json({
      ok: false,
      error: "Confluence is not configured",
    });
  }

  const parsed = parseConfluenceUrl(config.confluencePageUrl);
  if (!parsed) {
    return NextResponse.json({
      ok: false,
      error: "Invalid Confluence page URL",
    });
  }

  const auth =
    "Basic " +
    Buffer.from(
      `${config.confluenceEmail}:${config.confluenceApiToken}`
    ).toString("base64");

  try {
    const res = await fetch(
      `${config.confluenceBaseUrl}/wiki/rest/api/content/${parsed.pageId}?expand=body.storage,version`,
      { headers: { Authorization: auth } }
    );

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `Confluence returned status ${res.status}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      title: data.title,
      body: data.body?.storage?.value || "",
      version: data.version?.number || 1,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: `Could not reach Confluence: ${(e as Error).message}`,
    });
  }
}
