# Design Documentation -- Design Documenter

> A design-first record of every decision, trade-off, and rationale behind the Design Documenter tool.  
> This document is versioned alongside the code so future refinements are traceable.

---

## 1. Problem Statement

Design teams using Cursor AI accumulate rich decision-making context inside chat sessions -- architecture choices, component trade-offs, UX rationale, styling decisions. When it comes time to share this knowledge with a broader audience (PMs, leadership, other engineers), the only built-in option is a raw `.md` export which:

- Is not shareable to non-technical stakeholders without extra tooling.
- Loses the conversational context that explains *why* a decision was made.
- Requires manual copy-paste and reformatting into Confluence or similar wiki tools.
- Demands terminal literacy to even export.

**The core gap:** There is no bridge between *where decisions are made* (Cursor chats) and *where decisions are shared* (Confluence).

---

## 2. Design Principles

| # | Principle | What it means in practice |
|---|-----------|--------------------------|
| 1 | **Zero terminal knowledge** | The user should never see a terminal, `.env` file, or CLI command. A single double-click launches everything. |
| 2 | **Progressive disclosure** | Show only what's needed at each step. Complex configuration (API tokens) is hidden behind expandable help. |
| 3 | **Auto-detect everything possible** | Transcript paths, workspace mappings, Confluence page metadata -- detect automatically, confirm visually. |
| 4 | **Transparency about data** | Credentials stay local. Every screen reinforces this. No analytics, no telemetry. |
| 5 | **Editable output** | Generated documentation is a starting point, not a final product. Users must be able to edit before publishing. |
| 6 | **Reversible actions** | "Start over" is always available. Publish mode defaults to "append" so existing content is never destroyed accidentally. |

---

## 3. User Flow

```
[Double-click start.command]
         |
         v
  +-------------+     +--------------+     +------------+     +------------+
  |  1. CONNECT  | --> |  2. SELECT   | --> |  3. REVIEW  | --> | 4. PUBLISH  |
  |              |     |              |     |             |     |             |
  | Confluence   |     | Pick Cursor  |     | Preview &   |     | Append or   |
  | URL + creds  |     | chat sessions|     | edit docs   |     | replace page|
  +-------------+     +--------------+     +------------+     +------------+
                                                  |
                                                  v
                                           [Download .md]
                                           (offline fallback)
```

### Step 1: Connect

**Design decisions:**

- **Single URL input** rather than separate fields for domain/space/pageId. Users copy-paste URLs from their browser -- that's the natural mental model. We parse the URL server-side.
- **Inline help for API token** via expandable "How do I get this?" section. This avoids sending users to external docs and breaking their flow. The help panel includes a direct link to Atlassian's token management page.
- **Green confirmation banner** when Cursor transcripts are auto-detected. This immediately reduces anxiety ("Will it find my chats?") without requiring any action.
- **Validation happens on submit** -- we test the actual Confluence connection and page access, not just URL format. Errors are shown inline next to the relevant field.

### Step 2: Select Chats

**Design decisions:**

- **Card-based list with checkboxes** rather than a dropdown or file picker. Users need to see titles and previews to decide which conversations are relevant.
- **Expandable preview** per card (chevron toggle) to peek into the conversation without leaving the page.
- **Aggregate across all workspaces** -- we scan every `agent-transcripts` directory under `~/.cursor/projects/`, not just the current workspace. This was a deliberate choice because design decisions often span multiple project contexts.
- **Sorted by modification date** (newest first) because the most recent conversations are most likely to be relevant.
- **Selection counter** in the footer so users always know how many are picked.

### Step 3: Review

**Design decisions:**

- **Preview/Edit toggle** (pill switcher) rather than side-by-side. At the typical 800px content width, side-by-side would make both panes too narrow to be useful.
- **Rich markdown rendering** using `react-markdown` with GitHub Flavored Markdown. This shows users what the output will look like in a documentation context.
- **Download .md as fallback** -- not everyone will have Confluence access. The download button provides an escape hatch without requiring the publish step.
- **Full-height text editor** in edit mode with monospace font for markdown editing comfort.

### Step 4: Publish

**Design decisions:**

- **Explicit append vs. replace choice** via radio cards. "Append" is the default because it's non-destructive. The "replace" option includes a warning about content removal.
- **Success state with direct link** to the Confluence page. Users want immediate confirmation and the ability to verify.
- **"Document another session" reset link** for iterative workflows.

---

## 4. Architecture

### Technology choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 (App Router) | Server-side API routes + React UI in one project. No separate backend needed. |
| Styling | Tailwind CSS v4 | Rapid UI iteration, consistent spacing/color system, zero CSS files to manage. |
| Language | TypeScript | Type safety across API routes and components reduces runtime errors. |
| Markdown rendering | react-markdown + remark-gfm | Lightweight, supports GFM tables/lists, no heavy editor dependency. |
| Config storage | Local JSON file (`.doc-config.json`) | Eliminates `.env` files entirely. Users configure through the UI. |
| Launcher | macOS `.command` file | Double-clickable in Finder. Handles Node.js check, dependency install, server start, and browser open. |

### System architecture

```
+---------------------+       +---------------------+
|   Browser (React)   | <---> | Next.js API Routes  |
|                     |       |                     |
| - StepIndicator     |       | GET  /api/config    |
| - SetupStep         |       | POST /api/config    |
| - SelectChatsStep   |       | GET  /api/transcripts|
| - ReviewStep        |       | GET  /api/transcripts/[id] |
| - PublishStep        |       | POST /api/generate  |
+---------------------+       | POST /api/publish   |
                              +----------+----------+
                                         |
                      +------------------+------------------+
                      |                  |                  |
              +-------v------+  +--------v-------+  +------v-------+
              |  Transcript  |  |  Doc Generator |  |  Confluence  |
              |  Parser      |  |                |  |  Client      |
              |  (lib/)      |  |  (lib/)        |  |  (lib/)      |
              +--------------+  +----------------+  +--------------+
                      |                                     |
              +-------v------+                    +---------v--------+
              | ~/.cursor/   |                    | Confluence REST  |
              | projects/    |                    | API v1           |
              | */agent-     |                    | (Cloud)          |
              | transcripts/ |                    +------------------+
              +--------------+
```

### File structure

```
design-documenter/
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- config/route.ts      # Save/load Confluence credentials
|   |   |   |-- transcripts/route.ts  # List all transcripts (aggregated)
|   |   |   |-- transcripts/[id]/route.ts  # Single transcript detail
|   |   |   |-- generate/route.ts     # Parse transcripts -> markdown
|   |   |   |-- publish/route.ts      # Push to Confluence
|   |   |-- globals.css               # Tailwind imports + custom scrollbar
|   |   |-- layout.tsx                # Root layout with metadata
|   |   |-- page.tsx                  # Main wizard orchestrator
|   |-- components/
|   |   |-- StepIndicator.tsx         # 4-step progress bar
|   |   |-- SetupStep.tsx             # Confluence connection form
|   |   |-- SelectChatsStep.tsx       # Transcript picker
|   |   |-- ReviewStep.tsx            # Preview/edit documentation
|   |   |-- PublishStep.tsx           # Publish options + success state
|   |-- lib/
|       |-- config.ts                 # Config read/write + path detection
|       |-- transcripts.ts           # Transcript file parsing
|       |-- confluence.ts            # Confluence API wrapper
|       |-- doc-generator.ts         # Content extraction + markdown generation
|-- start.command                     # macOS one-click launcher
|-- DESIGN.md                         # This file
|-- CHANGELOG.md                      # Version history with design deltas
|-- package.json
```

---

## 5. Visual Design

### Color system

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Indigo-600 (`#4F46E5`) | Buttons, active step, links |
| Primary hover | Indigo-700 (`#4338CA`) | Button hover states |
| Primary light | Indigo-50/100 | Active step ring, help panel background |
| Surface | White | Cards, form inputs |
| Background | Slate-50 to Indigo-50/30 gradient | Page background |
| Text primary | Slate-800 | Headings |
| Text secondary | Slate-500 | Body copy, descriptions |
| Text muted | Slate-400 | Timestamps, help text |
| Success | Emerald-500 | Auto-detection banner, publish success |
| Error | Rose-500 | Validation errors, failure states |

### Typography

- **Font stack:** Inter, system-ui, -apple-system (no external font load)
- **Headings:** Bold, Slate-800
- **Body:** Regular, Slate-500/600
- **Monospace:** System mono for code previews and editor

### Spacing and layout

- **Max content width:** 800px (`max-w-4xl`)
- **Card padding:** 16px (`p-4`)
- **Section spacing:** 32px (`mb-8`)
- **Border radius:** 12px for cards (`rounded-xl`), 8px for inputs (`rounded-lg`)

### Interactive states

- **Buttons:** Solid fill with hover darkening, focus ring (2px offset)
- **Cards (Select step):** Border color change on selection (Slate-100 -> Indigo-400), subtle background tint
- **Checkboxes:** Custom styled with Indigo-600 fill and white check SVG
- **Loading:** Spinning border animation (`animate-spin`) with contextual label
- **Step indicator:** Completed steps show checkmark SVG, active step has ring glow

---

## 6. Data Flow

### Transcript parsing strategy

The Cursor agent transcript format is plain text with role markers:

```
user:
<user_query>
...user message...
</user_query>

assistant:
[Thinking] ...internal reasoning...
[Tool call] ToolName
  param: value
[Tool result] ToolName
...visible response to user...
```

**Parsing decisions:**

1. Split on `^(user|assistant):\s*$` regex to isolate message blocks.
2. For user messages: extract content from `<user_query>` tags, strip `@file` references.
3. For assistant messages: strip `[Thinking]` blocks, `[Tool call]`/`[Tool result]` pairs, and `<think>` tags. Only keep the visible response content.
4. This ensures the documentation captures *what was discussed*, not internal model reasoning or tool invocations.

### Documentation generation

The generator extracts four categories of content:

1. **User requirements** -- direct user messages (cleaned of markup)
2. **Design decisions** -- assistant paragraphs matching decision-related patterns (`decided`, `approach`, `trade-off`, `instead of`, `architecture`, etc.)
3. **Key topics** -- frequency analysis of domain terms (`component`, `api`, `database`, `schema`, `layout`, etc.)
4. **Implementation details** -- bullet points and numbered lists from assistant responses

These are assembled into a structured markdown document with sections: Objective, Key Topics, Requirements, Design Decisions, Implementation Details, and Conversation Overview.

### Confluence publishing

- **Authentication:** Basic auth with email + API token (base64 encoded)
- **Page update:** REST API v1 `PUT /wiki/rest/api/content/{pageId}` with version increment
- **Content format:** Markdown is converted to Confluence Storage Format (XHTML) with:
  - Headings mapped to `<h1>`-`<h3>`
  - Code blocks wrapped in `<ac:structured-macro ac:name="code">`
  - Lists, bold, italic, and horizontal rules converted
- **Append mode:** Fetches existing page body, concatenates new content after `<hr/>`
- **Replace mode:** Overwrites entire page body

---

## 7. Trade-offs and Known Limitations

| Area | Current state | Known limitation | Future consideration |
|------|--------------|------------------|---------------------|
| Transcript parsing | Regex-based extraction | May miss nuanced decisions or include noise | LLM-powered summarization for smarter extraction |
| Multi-workspace | Scans all `~/.cursor/projects/*/agent-transcripts/` | No way to filter by workspace in UI | Add workspace grouping/filtering |
| Confluence format | Basic XHTML conversion | No image support, limited table formatting | Use Atlassian Document Format (ADF) for richer output |
| Auth storage | Plain JSON file on disk | Token stored in cleartext locally | Encrypt with OS keychain integration |
| Platform | macOS only for launcher | `start.command` is macOS-specific | Add `start.bat` for Windows, `start.sh` for Linux |
| Editing | Plain textarea for markdown | No syntax highlighting or toolbar | Integrate a lightweight markdown editor (e.g., Milkdown) |
| Real-time | Full page reload between steps | No optimistic updates | Add SWR/React Query for cache + optimistic UI |

---

## 8. Accessibility Considerations

- All interactive elements are `<button>` or `<a>` with proper semantics
- Form inputs use `<label>` associations
- Color contrast meets WCAG AA for all text/background combinations
- Loading states include text labels (not just spinners)
- Step indicator uses aria-disabled for non-clickable steps
- Error messages are associated with their form fields

---

## 9. Security Model

- **No server-side persistence of credentials** beyond the local `.doc-config.json` file
- **API token never logged** or included in error messages
- **No telemetry or analytics** -- the app is entirely local
- **Confluence API calls are server-side** (Next.js API routes) so the token is never exposed to the browser
- **`.doc-config.json` is gitignored** so credentials are never committed

---

## 10. Version History

See [CHANGELOG.md](./CHANGELOG.md) for a chronological record of design versions with deltas highlighted.

| Version | Date | Summary |
|---------|------|---------|
| v0.1.0 | 2026-03-26 | Initial build -- 4-step wizard, transcript parsing, Confluence publishing |

---

*This document evolves with each design iteration. Each version is tagged in git and its delta is recorded in the changelog.*
