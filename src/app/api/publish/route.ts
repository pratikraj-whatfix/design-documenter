import { NextResponse } from "next/server";
import { loadConfig, parseConfluenceUrl } from "@/lib/config";
import { publishToPage } from "@/lib/confluence";

export async function POST(request: Request) {
  const { markdown, mode } = await request.json();

  if (!markdown) {
    return NextResponse.json({ error: "No content to publish" }, { status: 400 });
  }

  const config = loadConfig();

  if (
    !config.confluenceBaseUrl ||
    !config.confluenceEmail ||
    !config.confluenceApiToken
  ) {
    return NextResponse.json(
      { error: "Confluence is not configured. Go back to Step 1." },
      { status: 400 }
    );
  }

  const parsed = parseConfluenceUrl(config.confluencePageUrl || "");
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid Confluence page URL in configuration." },
      { status: 400 }
    );
  }

  const result = await publishToPage(
    {
      baseUrl: config.confluenceBaseUrl,
      email: config.confluenceEmail,
      apiToken: config.confluenceApiToken,
    },
    parsed.pageId,
    markdown,
    mode || "append"
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: result.url });
}
