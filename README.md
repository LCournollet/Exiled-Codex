# Exile Codex

> A local-first, dark-fantasy **knowledge vault** for ARPG players — save, organize, write and
> version your **league starters, builds, guides, leveling routes, bossing/farming/crafting
> strategies, skill-tree captures, images and notes**. Everything lives as plain Markdown + JSON on
> your disk, with **optional GitHub sync**.

Exile Codex is a Windows desktop app (Electron + React + TypeScript). It is intentionally
**original** in its visual identity (an ancient codex / archive / vault aesthetic) and is **not
affiliated with, nor does it reuse any assets from, any game publisher**.

> **Working name.** "Exile Codex" is a placeholder. Change it in one place
> (`src/shared/appInfo.ts`) and the whole UI updates.

---

## Highlights

- 📚 **Content library** — builds, starters, guides, notes, leveling, farming, bossing, crafting,
  atlas, classes, skill trees and more, each with rich metadata (class, ascendancy, patch, league,
  tags, status, confidence, favorites).
- ✍️ **Markdown editor** — live preview, toolbar, tables, checklists, code blocks, image insertion
  and **codex callouts** (`important`, `tip`, `warning`, `danger`), with auto-save and local history
  via Git.
- ⚔️ **Structured build sheets** — summary, pros/cons, leveling, gems, gear, uniques, priority
  stats, defenses, damage, passive tree, variants, budget (low/mid/high), early/mid/endgame
  progression and test notes.
- 🌳 **Skill trees & images** — import captures, caption them, zoom and view fullscreen, organized by
  category and stored inside the vault.
- 🔄 **Import / export** — share strategies as portable JSON, and **import build exports** in the
  poe.ninja / in-game format (passives + skills), preserved for re-export.
- 🌌 **Passive tree** — imported builds resolve their passive ids against a bundled PoE2 tree dataset
  (`resources/poe2-tree.json`) into **named keystones, notables and stats**. The **Trees** page
  renders the **full passive tree on a canvas** (5150 nodes with official sprite icons, zoom/pan,
  hover tooltips) and can **overlay any imported build** to light up its allocated passives; build
  detail pages show the allocated subgraph on its own.
- 🐙 **Optional GitHub sync** — init a repo, set a remote, see status, commit, push, pull and a sync
  log — all from the UI, with human-readable error handling. **The app works fully offline.**
- 🎨 **Dark codex theme** — obsidian backgrounds, stone panels, aged-bronze borders and ember/crimson
  accents.
- 🔒 **Local-first & safe** — path traversal is blocked, deletes go to a recoverable trash folder,
  and nothing leaves your machine unless you push it.

---

## Tech stack & why

| Choice | Reason |
| --- | --- |
| **Electron** | Native Windows desktop app with full filesystem + local Git access. |
| **electron-vite** | Fast, modern bundling for main/preload/renderer with TypeScript and HMR. |
| **React + TypeScript (strict)** | Component-driven UI with a typed IPC contract end-to-end. |
| **TailwindCSS** | A small, themeable design system via color tokens — no heavy UI framework. |
| **Zustand** | Minimal, predictable global state without boilerplate. |
| **gray-matter** | Stores entries as human-readable Markdown with YAML frontmatter. |
| **simple-git** | Drives the user's local Git binary; GitHub stays optional. |
| **react-markdown + remark-gfm** | Safe Markdown rendering (no raw HTML) with GFM tables/checklists. |
| **electron-builder** | Produces a Windows `.exe` installer (NSIS). |

The codebase keeps **business logic separate from UI**:

- **Main process services** (`src/main/services`): `VaultService`, `ContentService`, `GitService`,
  `ImageService`, `SettingsService` + `DemoSeeder`.
- **Typed IPC bridge** (`src/preload`): the renderer only ever talks to `window.api`.
- **Renderer** (`src/renderer`): pure UI + a thin Zustand store.
- **Shared types** (`src/shared`): the single source of truth for both sides.

---

## Project structure

```
exile-codex/
├─ assets/logo/            # logo.png (+ how to replace it)
├─ build/                  # icons for electron-builder (icon.png; add icon.ico for installer)
├─ resources/              # runtime resources (app icon)
├─ electron.vite.config.ts
├─ electron-builder.yml
├─ tailwind.config.js
├─ src/
│  ├─ shared/              # types.ts, ipc.ts, appInfo.ts  (used by main + renderer)
│  ├─ main/
│  │  ├─ index.ts          # Electron entry + window
│  │  ├─ ipc/handlers.ts   # all ipcMain handlers (Result<T> wrapped)
│  │  ├─ services/         # Vault / Content / Git / Image / Settings / DemoSeeder
│  │  └─ utils/            # path-safety, ids
│  ├─ preload/index.ts     # typed window.api bridge
│  └─ renderer/
│     ├─ index.html
│     └─ src/
│        ├─ App.tsx        # router + shortcuts
│        ├─ config/        # app.config.ts (name, logo, version)
│        ├─ store/         # useStore.ts (zustand)
│        ├─ lib/           # api wrapper, utils
│        ├─ components/     # design system (ui/) + feature components
│        └─ pages/         # Dashboard, Library, Builds, Guides, Trees, Images, Tags, GitHub, Settings, Editor, Detail
```

### The vault folder (your data)

When you create a vault, Exile Codex scaffolds:

```
<your vault>/
├─ content/
│  ├─ builds/  starters/  guides/  notes/  leveling/
│  ├─ farming/ bossing/   crafting/ atlas/  classes/  misc/
├─ assets/
│  ├─ images/  trees/  icons/  files/
├─ metadata/
│  ├─ tags.json  settings.json  sync-log.json
│  └─ .trash/            # recoverable deletes (git-ignored)
└─ README.md
```

**Storage format (hybrid, documented):** each entry is **one Markdown file** whose **YAML
frontmatter** holds all metadata (title, type, class, tags, status, gallery, links, and the full
structured `build` object), while the Markdown body holds the main written content. This keeps files
readable, diff-friendly and editable by hand.

---

## Getting started (development)

Requirements: **Node.js 18+** and **Git** (for the sync features).

```bash
npm install
npm run dev
```

The app opens to a welcome screen — **create a new vault** (any folder) and a few demo entries are
added so you can explore immediately.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the app in development with hot reload. |
| `npm run typecheck` | Strict TypeScript check (node + web projects). |
| `npm run lint` | ESLint over `src`. |
| `npm run build` | Typecheck + bundle main/preload/renderer. |
| `npm run build:win` | Build and package a **Windows `.exe` installer** (NSIS) into `release/`. |
| `npm run build:unpack` | Build an unpacked app folder (quick local test). |

---

## Building the Windows .exe

```bash
npm run build:win
```

The installer is produced by **electron-builder** (config in `electron-builder.yml`) under
`release/`. By default it uses `build/icon.png`. For a crisp installer/taskbar icon, add a
**`build/icon.ico`** (256×256) and point `win.icon` at it.

---

## Connecting GitHub (optional)

The app **never stores secrets in plain text** and shells out to your local Git, so it reuses
whatever Git authentication you already have. Pick one:

1. **Git Credential Manager (easiest on Windows).** Installed with Git for Windows. The first push
   opens a browser/login prompt and your credentials are stored securely by Windows.
2. **GitHub CLI.** `gh auth login` once; Git then uses those credentials.
3. **SSH key.** Add an SSH key to GitHub and use the `git@github.com:...` remote URL.
4. **Personal Access Token (PAT).** Create a token on GitHub and use it as the password when Git
   prompts (or let the credential manager store it). Never commit it to the repo.

### Workflow inside the app (GitHub page)

1. **Initialize Git repository** (one click) — sets the default branch to `main`.
2. Create an **empty** repository on GitHub (button links to `github.com/new`).
3. Paste its URL into **Remote URL** and **Save remote**.
4. Use **Save to GitHub** (add + commit + push), or the individual **Commit / Push / Pull** buttons.
5. The **Sync log** and **History** panels record what happened. Conflicts and auth errors are shown
   in plain language with what to do next.

> **Which repo should I create for my data?** Create a **separate, private** GitHub repository just
> for your **vault** (e.g. `my-poe-vault`) — *not* this app's source repo. Your vault folder is
> independent from the application code, so back it up on its own. (See the note at the bottom.)

---

## Importing & exporting strategies

- **Export an entry:** open it → **Export** → choose where to save the `.json`. It contains the full
  entry (metadata + content + build sheet) and can be shared with other players.
- **Import an entry:** *Settings → Import entry (JSON)* (or the build export below). A fresh id is
  always assigned so imports never overwrite your work.
- **Import a build export (poe.ninja / in-game):** *Import build* in the top bar, or
  *Settings → Import build export*. The app parses `passives` + `skills`, generates a readable
  skill/support summary, and **preserves the raw JSON** inside the build for later re-export. A
  sample file, `BuildExemple.Json`, is included at the repo root for testing.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ + K` | Focus global search |
| `Ctrl/⌘ + N` | New entry |
| `Ctrl/⌘ + G` | Go to GitHub sync |
| `Esc` | Close modal / image viewer / reading mode |

---

## Security & robustness

- **Path confinement** — all file access is resolved through a single guard that blocks `..`
  traversal and absolute escapes, so writes stay inside the vault.
- **No raw HTML in Markdown** — rendering uses `react-markdown` without `rehype-raw`; a strict CSP is
  set on the renderer.
- **Context isolation** — the renderer has no Node access; it only sees the typed `window.api`.
- **Recoverable deletes** — entries/images move to `metadata/.trash/` (with confirmation) instead of
  being destroyed.
- **Graceful Git** — every Git error is translated into an actionable message; missing Git/remote is
  handled, not crashed on.

---

## Customizing the brand

- **Name:** edit `APP_NAME` in `src/shared/appInfo.ts` (and optionally `productName` in
  `electron-builder.yml` / `package.json`).
- **Logo & icons:** see `assets/logo/README.md`.
- **Colors:** edit the token palette in `tailwind.config.js` (`obsidian`, `stone`, `bronze`,
  `ember`, `crimson`, `ivory`, …).

---

## TODO / things to finish manually

These are intentional, clearly-scoped follow-ups (the V1 is fully functional without them):

- [ ] **`build/icon.ico`** — add a 256×256 `.ico` for a crisp Windows installer icon, then set
      `win.icon: build/icon.ico` in `electron-builder.yml`.
- [x] **Full passive-tree rendering** — done: the Trees page renders all 5150 nodes with official
      sprite icons (from `resources/tree-atlas.webp`) on a zoom/pan canvas, with optional build
      overlay; build detail pages render the allocated subgraph.
- [~] **Gem id → display-name** — improved heuristic + curated overrides in
      `src/main/utils/gemNames.ts` (strips internal tier suffixes, lowercases joining words). Add
      entries to `OVERRIDES` for any gem the heuristic gets wrong; a full official gem dataset would
      make it exhaustive.
- [ ] **Conflict-resolution UI** — conflicts are detected and explained; resolving them is done in an
      external editor for now.
- [ ] **Code signing** — the Windows build is unsigned by default.

---

## License

MIT. Original artwork/identity; not affiliated with any game publisher.
