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
