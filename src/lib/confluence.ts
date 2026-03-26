interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface PageInfo {
  id: string;
  title: string;
  version: number;
  spaceKey: string;
}

function authHeader(email: string, token: string): string {
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

export async function testConnection(
  config: ConfluenceConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${config.baseUrl}/wiki/rest/api/user/current`, {
      headers: { Authorization: authHeader(config.email, config.apiToken) },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: "Invalid credentials. Check your email and API token." };
    return { ok: false, error: `Confluence returned status ${res.status}` };
  } catch (e) {
    return { ok: false, error: `Could not reach Confluence: ${(e as Error).message}` };
  }
}

export async function getPageInfo(
  config: ConfluenceConfig,
  pageId: string
): Promise<PageInfo | null> {
  try {
    const res = await fetch(
      `${config.baseUrl}/wiki/rest/api/content/${pageId}?expand=version,space`,
      { headers: { Authorization: authHeader(config.email, config.apiToken) } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      title: data.title,
      version: data.version.number,
      spaceKey: data.space?.key || "",
    };
  } catch {
    return null;
  }
}

function markdownToConfluenceStorage(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">$1</ac:parameter><ac:plain-text-body><![CDATA[$2]]></ac:plain-text-body></ac:structured-macro>'
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr/>");

  // Paragraphs: wrap remaining text blocks
  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ac:") ||
      trimmed.startsWith("<hr") ||
      trimmed === ""
    ) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      if (trimmed) result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push("<p>");
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }
  if (inParagraph) result.push("</p>");

  return result.join("\n");
}

export async function publishToPage(
  config: ConfluenceConfig,
  pageId: string,
  markdownContent: string,
  mode: "append" | "replace" = "append"
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const pageInfo = await getPageInfo(config, pageId);
    if (!pageInfo) {
      return { ok: false, error: "Could not find the Confluence page. Check the page URL." };
    }

    const newContent = markdownToConfluenceStorage(markdownContent);

    let body: string;
    if (mode === "append") {
      const existingRes = await fetch(
        `${config.baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage`,
        { headers: { Authorization: authHeader(config.email, config.apiToken) } }
      );
      const existingData = await existingRes.json();
      const existingBody = existingData.body?.storage?.value || "";
      body = existingBody + "\n<hr/>\n" + newContent;
    } else {
      body = newContent;
    }

    const res = await fetch(
      `${config.baseUrl}/wiki/rest/api/content/${pageId}`,
      {
        method: "PUT",
        headers: {
          Authorization: authHeader(config.email, config.apiToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: pageId,
          type: "page",
          title: pageInfo.title,
          space: { key: pageInfo.spaceKey },
          body: {
            storage: { value: body, representation: "storage" },
          },
          version: { number: pageInfo.version + 1 },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        ok: false,
        error: errData?.message || `Confluence returned status ${res.status}`,
      };
    }

    const data = await res.json();
    const pageUrl = `${config.baseUrl}/wiki${data._links?.webui || `/spaces/${pageInfo.spaceKey}/pages/${pageId}`}`;
    return { ok: true, url: pageUrl };
  } catch (e) {
    return { ok: false, error: `Publish failed: ${(e as Error).message}` };
  }
}
