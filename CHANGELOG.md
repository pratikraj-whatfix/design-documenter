# Changelog -- Design Documenter

All notable design and implementation changes are documented here in chronological order.  
Each version is tagged in git for traceability.

The format follows: **what changed**, **why it changed**, and **what it looked like before vs. after**.

---

## [v0.1.0] -- 2026-03-26

### Initial Release

**Summary:** First functional build of the Design Documenter tool. Establishes the core 4-step wizard flow from Cursor chat transcripts to Confluence publishing.

### Design Decisions Made

#### 1. Wizard-based flow (not dashboard)

- **Decision:** Linear 4-step wizard instead of a dashboard with multiple entry points.
- **Rationale:** The target user is non-technical. A linear flow removes decision fatigue -- there is exactly one thing to do at each step.
- **Trade-off:** Power users can't jump directly to "Select Chats" without passing through "Connect" first. Accepted because the setup is a one-time cost.

#### 2. Step indicator with numbers (not icons/emoji)

- **Decision:** Use numbered circles (1, 2, 3, 4) in the step indicator.
- **Rationale:** Initial design used emoji icons but they rendered inconsistently across system fonts and failed encoding validation in the build pipeline. Numbers are universally readable and provide clear sequence.
- **Before:** Emoji icons (link, chat, pencil, rocket) -- broke on build.
- **After:** Clean numbered circles with checkmark SVG for completed steps.

#### 3. Auto-detection of Cursor transcripts

- **Decision:** Automatically scan all `~/.cursor/projects/*/agent-transcripts/` directories.
- **Rationale:** Asking users to manually locate transcript files defeats the "zero terminal knowledge" goal. Auto-detection with a green confirmation banner provides confidence without requiring action.
- **Scope expansion:** Initially scanned only the current workspace. Expanded to all workspaces because design conversations often span multiple project contexts.

#### 4. Inline API token help

- **Decision:** Expandable help panel directly below the token input field.
- **Rationale:** Sending users to Atlassian docs would break their flow. The 5-step guide with a direct link to the token management page keeps them in context.

#### 5. Confluence URL as single input

- **Decision:** One URL field instead of separate domain/space/pageId fields.
- **Rationale:** Users naturally copy-paste from the browser address bar. We parse the URL server-side to extract base URL, space key, and page ID. This reduces the form from 4 fields to 1 for the Confluence target.

#### 6. Append as default publish mode

- **Decision:** "Append to page" is the default, with "Replace" as an explicit opt-in.
- **Rationale:** Non-destructive by default. A user who accidentally publishes should not lose existing page content. The replace option is available but requires a deliberate selection.

#### 7. Local JSON config instead of `.env`

- **Decision:** Store configuration in `.doc-config.json` (gitignored) instead of environment variables.
- **Rationale:** `.env` files require terminal knowledge to create and edit. A JSON file written by the API on form submission is invisible to the user.

#### 8. macOS double-click launcher

- **Decision:** `start.command` shell script that installs deps, starts the server, and opens the browser.
- **Rationale:** The user should never need to open Terminal. On macOS, `.command` files are executable via Finder double-click. The script handles Node.js detection, `npm install` (first run only), `npm run dev`, and `open http://localhost:3847`.

#### 9. Markdown-to-Confluence Storage Format conversion

- **Decision:** Custom lightweight converter instead of a library.
- **Rationale:** Full-featured markdown-to-Confluence libraries (e.g., `md-to-adf`) add significant dependency weight. The generated documentation uses a limited subset of markdown (headings, lists, bold, code blocks, blockquotes) so a simple regex-based converter covers the need.
- **Trade-off:** No support for tables, images, or nested lists in Confluence output. Acceptable for v0.1.

#### 10. Download .md as escape hatch

- **Decision:** Include a "Download .md" button on the Review step.
- **Rationale:** Not every user will have Confluence access or want to publish immediately. The download provides an offline fallback and also serves as a backup before publishing.

### Technical Choices

| Component | Choice | Why |
|-----------|--------|-----|
| Next.js 15 | App Router + API routes | Single-project architecture, no separate backend |
| Tailwind v4 | PostCSS integration | Rapid iteration, consistent design tokens |
| TypeScript | Strict mode | Catch API/component contract mismatches at compile time |
| react-markdown | With remark-gfm | Lightweight preview, GFM support for lists/tables |
| Port 3847 | Custom port | Avoid conflicts with common dev ports (3000, 3001, 8080) |

### UI Component Inventory

| Component | Responsibility | Key props |
|-----------|---------------|-----------|
| `StepIndicator` | 4-step progress bar with click-to-navigate | `currentStep`, `onStepClick` |
| `SetupStep` | Confluence connection form with validation | `onComplete` |
| `SelectChatsStep` | Transcript list with multi-select | `selectedIds`, `onSelectionChange`, `onNext`, `onBack` |
| `ReviewStep` | Markdown preview/edit with generation trigger | `selectedIds`, `markdown`, `onMarkdownChange`, `onNext`, `onBack` |
| `PublishStep` | Publish mode selection + success/error states | `markdown`, `onBack`, `onReset` |

### Screenshots

Screenshots of each step are captured in the repository's initial exploration and are referenced from the originating Cursor chat session.

---

## [v0.2.0] -- 2026-03-26

### Summary
Complete rewrite of document generation quality: synthesized objectives, themed decision grouping, visual hierarchy, and de-emphasized metadata.

### What Changed

#### 1. Objective synthesis replaces raw message dump
- **Before:** The "Objective" section was the first user message copy-pasted verbatim, often 500+ characters of unedited chat text including file references, role prompts, and iteration noise like "still not working".
- **After:** Synthesized 1-2 sentence summary extracted from intent-bearing sentences (those containing "build", "create", "design", etc.) with noise like file extensions, `@file` references, role prompts ("You are a backend engineer"), and structured prompt headers (`CONTEXT:`, `OUTPUT:`) automatically stripped.
- **Why:** The documentation should describe what the user intended, not reproduce the chat verbatim.

#### 2. Themed decision grouping replaces numbered list
- **Before:** Every paragraph matching a keyword pattern was listed as "Decision 1", "Decision 2", etc. Model narration ("Let me check...", "Good, I can see...") appeared as "decisions."
- **After:** Decisions are grouped under five themes: Architecture & Structure, UI & Visual Design, Data & API, Technical Approach, and Trade-offs & Rationale. Content is condensed to the first 2-3 sentences per paragraph, with first-person narration patterns stripped. Related items within a theme are de-duplicated.
- **Why:** A numbered list of raw fragments is unreadable. Themed grouping lets the reader navigate to what matters.

#### 3. Derived titles replace raw message truncation
- **Before:** Title was the first 80 characters of the first user message, often starting with "We are trying to..." or "Follow the attached prototype...".
- **After:** Title is extracted from action-oriented phrases ("build a design system", "AI Voiceover job pipeline") with fallback to noun-phrase detection ("History dashboard"). Generic words, file extensions, version numbers, and articles are cleaned.
- **Why:** The document title should describe the topic, not quote the user.

#### 4. Session metadata moved to bottom with low visual weight
- **Before:** "Conversation Overview" section near the top showed raw message counts and user message previews in blockquotes. Session IDs, dates, and token counts were given equal visual weight as design content.
- **After:** A single `<sub>` line at the very bottom after a dashed separator shows date, session count, prompt/response counts, and session IDs in 11px light gray text. No "Key Topics" keyword list.
- **Why:** Metadata should be available for reference but not compete with the actual design decisions for attention.

#### 5. Improved prose rendering in ReviewStep
- **Before:** Standard `prose-sm` Tailwind typography with minimal customization. Blockquotes looked like regular text.
- **After:** H2 headings are uppercase with letter-spacing and bottom borders. H3 headings are slate-gray for visual hierarchy. Blockquotes have indigo background tint, indigo left border, and medium-weight indigo text. Tables, lists, and code have refined spacing. The `<sub>` metadata renders as a visually distinct footer via `rehype-raw` + custom component override.
- **Why:** The preview should feel like a designed document, not a raw markdown dump.

### Files Modified
- `src/lib/doc-generator.ts` -- Complete rewrite: new `synthesizeObjective`, `deriveTitle`, `cleanTitle`, `extractSubstantiveContent`, `cleanDecisionContent` functions; themed `THEME_PATTERNS` classification; `mergeRelatedItems` de-duplication; metadata in `<sub>` tags
- `src/components/ReviewStep.tsx` -- Added `rehype-raw` plugin, custom `sub` component for metadata, expanded prose classes for blockquotes/headings/code
- `src/app/globals.css` -- Replaced `.prose` overrides with `.doc-preview` scoped styles for h1/h2/h3, blockquotes, lists, and horizontal rules
- `package.json` -- Added `rehype-raw` dependency

---

<!-- TEMPLATE FOR FUTURE VERSIONS

## [vX.Y.Z] -- YYYY-MM-DD

### Summary
One-line description of what changed.

### What Changed

#### Change title
- **Before:** Description of previous state
- **After:** Description of new state
- **Why:** Rationale for the change
- **Impact:** What this affects (UI, API, data flow, etc.)

### Screenshots
- Before: [description]
- After: [description]

### Files Modified
- `path/to/file` -- description of change

-->

---

*Each future refinement will be appended as a new version entry above the template, with before/after comparisons and clear rationale.*
