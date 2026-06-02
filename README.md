# LinkedIn Poster

A Tauri desktop app for drafting LinkedIn and blog posts. Posts are plain
markdown files with YAML frontmatter, stored in a folder you choose. Dark-mode
first, snappy, keyboard-driven.

> Status: **phase 6 / 10** — templates. See
> [`plans/linkedin-poster-plan.md`](./plans/linkedin-poster-plan.md) for the
> full build plan.

## Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Shell    | Tauri 2 (Rust + macOS WebView)                      |
| Frontend | Vue 3 + Vite + TS + Pinia + Vue Router              |
| Storage  | Markdown files + YAML frontmatter                   |
| Frontmatter | [`yaml`](https://www.npmjs.com/package/yaml)     |
| IDs      | [`ulid`](https://www.npmjs.com/package/ulid)        |
| Tests    | Vitest (unit) + Playwright (e2e)                    |

## Features (current)

- **Folder picker** — choose where to store posts (Tauri native dialog on
  desktop, mock in browser dev)
- **Posts as markdown** — each post is a single `.md` file with YAML
  frontmatter, so you can edit them in any text editor
- **Frontmatter round-trip** — typed `Post` model with status, type, tags,
  LinkedIn metadata, version counter, and ULID
- **Post list** — three-pane (sidebar filters / list / hover preview) with
  status + tag chips, sort, quick filter, and ⌘K command palette (MiniSearch
  full-text across title, tags, body, hook, CTA)
- **TipTap editor** — block-based with slash shortcuts, bubble menu,
  markdown round-trip, drag-and-drop image paste into `posts/assets/`
- **Autosave** — debounced 800ms, deep-equal skip, flush on unmount
- **LinkedIn panel** — hook / CTA / audience / hashtags
- **LinkedIn export** — popover with char-count, progress bar, one-click
  clipboard copy
- **Templates** — five built-in templates (LinkedIn Story / Listicle / Hot
  Take, Blog How-To / Essay), `/templates` browser view, "From template…"
  popover in the home view
- **Create posts** — blank or from a template, file written as
  `YYYY-MM-DD-slug.md` in your `posts/` folder
- **Read / save / delete** — full CRUD over the Tauri bridge
- **Settings persistence** — last-used folder is remembered
- **Mock data first** — the app runs in any browser with seeded sample posts,
  so the UI is testable without launching Tauri

## Features (planned)

- Version history with diff
- PDF export via print stylesheet
- Theme toggle (dark / light / system)
- Keyboard shortcuts and polished empty states

## Requirements

- **Node** 20.19+ or 22.12+
- **pnpm** 10+
- **Rust** 1.77+ (for Tauri)
- **macOS** for `tauri:dev` / `tauri:build` (the project is macOS-first; the
  frontend itself runs anywhere)

## Run it

### Browser dev (frontend only, mock data)

```sh
pnpm install
pnpm dev
```

Open <http://localhost:1420>. The app loads 4 sample posts from `localStorage`
so you can iterate on the UI without launching Tauri.

### Tauri dev (real filesystem, native folder picker)

```sh
pnpm install
pnpm tauri:dev
```

First run will compile the Rust shell (a few minutes). After that, hot reload
works for both the Vue app and the Rust commands.

### Type-check, lint, test, build

```sh
pnpm type-check       # vue-tsc
pnpm lint             # oxlint + eslint
pnpm format           # oxfmt
pnpm test:unit        # vitest
pnpm test:e2e         # playwright (requires `npx playwright install` first)
pnpm build            # type-check + production vite build
```

### Build a release `.app`

```sh
pnpm tauri:build
```

The signed-notarized bundle lands in `src-tauri/target/release/bundle/`.

## Project layout

```
linkedin-poster/
├── src/                       # Vue app
│   ├── App.vue                # shell (TopBar + <RouterView/>)
│   ├── main.ts                # pinia + router + tokens.css
│   ├── router/index.ts        # /  → HomeView
│   ├── views/HomeView.vue     # folder picker + post list + new-post form
│   ├── components/shell/      # TopBar.vue
│   ├── stores/
│   │   ├── settings.ts        # folder, theme
│   │   └── posts.ts           # list, open, save, create, remove
│   ├── lib/
│   │   ├── tauri-bridge.ts    # typed wrappers, mock fallback
│   │   ├── frontmatter.ts     # parse / serialize YAML + body
│   │   ├── mock-data.ts       # 4 sample posts (story, listicle, hot take, blog)
│   │   └── id.ts              # ULID
│   ├── types/                 # post.ts, settings.ts
│   ├── styles/tokens.css      # dark-mode CSS vars
│   └── __tests__/             # vitest specs
├── src-tauri/                 # Rust shell
│   └── src/
│       ├── lib.rs             # registers dialog plugin + commands
│       ├── main.rs
│       └── commands/
│           ├── posts.rs       # list / read / write / delete / ensure_posts_dir
│           ├── settings.rs    # get / save (app_config_dir/app-config.json)
│           └── error.rs       # AppError, AppResult
├── e2e/                       # Playwright
└── plans/linkedin-poster-plan.md
```

## How storage works

- **Folder layout** — choose either a workspace root that contains
  `posts/<file>.md` or the `posts/` folder itself. The app creates the
  resolved posts folder on demand.
- **File naming** — `YYYY-MM-DD-slug.md`, slugified from the title (max 60
  chars). Internal `id` is a ULID stored in frontmatter, so renames are safe.
- **Frontmatter** — id, title, status, type, createdAt, updatedAt,
  scheduledFor, publishedAt, tags, template, linkedin (hook/cta/hashtags/audience),
  assets, versions, path.
- **Settings** — `app_config_dir/app-config.json` (Tauri) or `localStorage`
  (browser mock). Currently stores the posts folder and theme.

## Tauri commands (Rust ↔ JS bridge)

| Command                | Args                              | Returns        |
| ---------------------- | --------------------------------- | -------------- |
| `pick_folder`          | (none — native dialog)            | `string?`      |
| `list_posts`           | `folder: string`                  | `PostMeta[]`   |
| `read_post`            | `path: string`                    | `Post`         |
| `write_post`           | `path: string, content: string`   | `void`         |
| `delete_post`          | `path: string`                    | `void`         |
| `ensure_posts_dir`     | `folder: string`                  | `string`       |
| `list_templates`       | `folder: string`                  | `TemplateMeta[]` |
| `read_template`        | `path: string`                    | `Template`     |
| `write_template`       | `path: string, content: string`   | `void`         |
| `delete_template`      | `path: string`                    | `void`         |
| `ensure_templates_dir` | `folder: string`                  | `string`       |
| `get_settings`         | (none)                            | `AppSettings`  |
| `save_settings`        | `settings: AppSettings`           | `void`         |

The frontend never calls `invoke` directly — everything goes through
`src/lib/tauri-bridge.ts`, which falls back to `localStorage` when not running
inside Tauri.

## Out of scope (v1)

- AI rewrite / polish
- Sync / multi-device
- Image generation / hosting
- Direct publish to LinkedIn (export → manual paste)
- Real-time collaboration

## License

Private project.
