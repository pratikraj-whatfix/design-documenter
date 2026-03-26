# Design Documenter

**Turn your Cursor AI chat sessions into structured design documentation on Confluence.**

A zero-config, wizard-based tool that reads Cursor conversation transcripts, extracts design decisions, generates structured documentation, and publishes directly to Confluence -- without ever touching a terminal.

---

## Quick Start

### For non-technical users

1. **Double-click** `start.command` in Finder
2. The app opens in your browser automatically
3. Follow the 4-step wizard

### For developers

```bash
cd design-documenter
npm install
npm run dev
# Open http://localhost:3847
```

---

## How It Works

| Step | What you do | What happens |
|------|-------------|-------------|
| **1. Connect** | Paste your Confluence page URL, email, and API token | Credentials are validated and stored locally |
| **2. Select** | Pick which Cursor chat sessions contain design decisions | Transcripts are auto-discovered from all Cursor workspaces |
| **3. Review** | Preview the generated documentation, edit if needed | Chat content is parsed and structured into sections |
| **4. Publish** | Click "Publish Now" | Documentation is pushed to your Confluence page |

---

## Documentation

- **[DESIGN.md](./DESIGN.md)** -- Full design rationale, architecture, visual system, and trade-offs
- **[CHANGELOG.md](./CHANGELOG.md)** -- Version history with design deltas in chronological order

---

## Privacy

- Credentials are stored locally in `.doc-config.json` (gitignored)
- No telemetry, analytics, or external data sharing
- API calls to Confluence happen server-side only
- Your Cursor chat transcripts are read locally and never uploaded

---

## Tech Stack

- **Next.js 15** (App Router) -- React frontend + API routes
- **TypeScript** -- Type-safe across the stack
- **Tailwind CSS v4** -- Utility-first styling
- **react-markdown** -- Documentation preview rendering

---

## Requirements

- **Node.js 18+** (the launcher checks for this automatically)
- **Confluence Cloud** account with API token
- **Cursor IDE** with at least one chat session in the workspace
