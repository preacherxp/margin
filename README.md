# Margin

Margin is a Tauri desktop app for drafting LinkedIn and blog posts. It stores every post as a plain Markdown file with YAML frontmatter in a folder you choose, so the content stays portable and editable outside the app.

The app also runs in browser dev mode with localStorage-backed mock data, which keeps the Vue UI easy to work on without launching the native shell.

## Stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2, Rust, macOS WebView |
| Frontend | Vue 3, Vite, TypeScript, Pinia, Vue Router |
| Editor | TipTap 3 with Markdown round-trip |
| Storage | Markdown files plus YAML frontmatter |
| Search | MiniSearch |
| IDs | ULID |
| Tests | Vitest and Playwright |

## Features

- Folder picker for choosing a workspace or `posts/` directory.
- Markdown-on-disk posts with typed YAML frontmatter.
- Three-pane home view with filters, sorting, hover preview, and full-text search.
- Command palette and global keyboard shortcuts.
- TipTap editor with slash shortcuts, bubble menu, Markdown serialization, and autosave.
- Drag-and-drop or pasted images copied into `posts/assets/`.
- LinkedIn metadata panel for hook, CTA, audience, and hashtags.
- LinkedIn export popover with character count and clipboard copy.
- Built-in and user templates with a dedicated templates browser.
- Version snapshots stored per post, capped at 50 versions.
- Print/PDF export through the native macOS print sheet in Tauri or `window.print()` in browser dev.
- Settings view with persisted posts folder and dark, light, or system theme.
- Browser mock mode with seeded sample posts, templates, settings, and versions.

## Requirements

- Node `20.19+` or `22.12+`
- pnpm `10+`
- Rust `1.77+` for Tauri commands and desktop builds
- macOS for the current Tauri desktop target

## Development

Install dependencies:

```sh
pnpm install
```

Run the frontend only:

```sh
pnpm dev
```

Open <http://localhost:1420>. Browser mode uses mock data in `localStorage` and does not touch your filesystem.

Run the desktop app with real filesystem access:

```sh
pnpm tauri:dev
```

Build a production frontend bundle:

```sh
pnpm build
```

Build the Tauri app:

```sh
pnpm tauri:build
```

The generated app bundle is written under `src-tauri/target/release/bundle/`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Vite on port 1420. |
| `pnpm tauri:dev` | Start the Tauri desktop app with Vite hot reload. |
| `pnpm build` | Run type-checking and build the frontend. |
| `pnpm build-only` | Build only the Vite frontend. |
| `pnpm preview` | Preview the production frontend build. |
| `pnpm type-check` | Run `vue-tsc --build`. |
| `pnpm lint` | Run oxlint and eslint with fixes enabled. |
| `pnpm format` | Format `src/` with oxfmt. |
| `pnpm test:unit` | Run Vitest. |
| `pnpm test:e2e` | Run Playwright tests. |
| `pnpm tauri:build` | Build the desktop app. |

Playwright requires browser binaries before the first e2e run:

```sh
pnpm exec playwright install
```

## Project Layout

```text
linkedin-poster/
├── src/                         # Vue app
│   ├── App.vue                  # App shell, global overlays, router outlet
│   ├── main.ts                  # Vue, Pinia, router, global CSS
│   ├── router/                  # Home, editor, templates, settings routes
│   ├── views/                   # Top-level screens
│   ├── components/              # Shell, post, editor, template, search, UI components
│   ├── stores/                  # Pinia stores for posts, settings, UI, toasts
│   ├── lib/                     # Bridge, Markdown/frontmatter, templates, search, editor helpers
│   ├── templates/               # Built-in Markdown templates
│   ├── styles/                  # Design tokens and print stylesheet
│   ├── types/                   # Shared TypeScript models
│   └── __tests__/               # Vitest specs
├── src-tauri/                   # Rust shell and filesystem commands
│   └── src/commands/            # posts, templates, assets, versions, settings, print
├── e2e/                         # Playwright tests
├── public/                      # Static assets
└── package.json
```

## Storage Model

Pick either a workspace root or the `posts/` folder itself. If you pick a workspace root, the app writes posts under `posts/` and templates under `templates/`.

```text
workspace/
├── posts/
│   ├── 2026-06-02-example-post.md
│   ├── assets/
│   │   └── pasted-image.png
│   └── .versions/
│       └── 01J...POSTID/
│           └── 2026-06-02T12-30-00.000Z.md
└── templates/
    └── custom-template.md
```

Post filenames use `YYYY-MM-DD-slug.md`. The durable post identity is the ULID stored in frontmatter, so filenames can be changed without changing the post ID.

A post file looks like this:

```md
---
id: 01KT3VK9P7CCMT85JCXGMEQPV4
title: Example post
status: draft
type: linkedin
createdAt: 2026-06-02T09:45:51.559Z
updatedAt: 2026-06-02T09:45:51.559Z
scheduledFor: null
publishedAt: null
tags: [writing]
template: linkedin-story
path: /workspace/posts/2026-06-02-example-post.md
linkedin:
  hook: "A strong first line."
  cta: "What would you add?"
  hashtags: [LinkedIn, Writing]
  audience: "founders and operators"
assets: []
versions: 0
---
Markdown body goes here.
```

Settings are stored in Tauri app config as `app-config.json`. Browser dev mode stores settings, posts, templates, and version snapshots in `localStorage` under `margin:*` keys.

## Tauri Bridge

The frontend does not call `invoke` directly. Use `src/lib/tauri-bridge.ts`, which routes to Tauri commands in desktop mode and to mock localStorage implementations in browser mode.

| Command | Args | Returns |
| --- | --- | --- |
| `list_posts` | `folder` | `PostMeta[]` |
| `read_post` | `path` | `Post` |
| `write_post` | `path`, `content` | `void` |
| `delete_post` | `path` | `void` |
| `ensure_posts_dir` | `folder` | `string` |
| `copy_asset` | `src`, `destDir` | `CopiedAsset` |
| `ensure_assets_dir` | `postsDir` | `string` |
| `list_templates` | `folder` | `TemplateMeta[]` |
| `read_template` | `path` | `Template` |
| `write_template` | `path`, `content` | `void` |
| `delete_template` | `path` | `void` |
| `ensure_templates_dir` | `folder` | `string` |
| `save_version` | `folder`, `postId`, `content` | `VersionMeta` |
| `list_versions` | `folder`, `postId` | `VersionMeta[]` |
| `read_version` | `folder`, `postId`, `ts` | `VersionContent` |
| `delete_versions_for_post` | `folder`, `postId` | `void` |
| `print_active_window` | none | `void` |
| `get_settings` | none | `AppSettings` |
| `save_settings` | `settings` | `void` |

`pickFolder()` uses `@tauri-apps/plugin-dialog` directly from the bridge instead of a Rust command.

## Out of Scope

- Direct publishing to LinkedIn.
- AI rewrite, polish, or content generation.
- Sync, collaboration, or multi-device storage.
- Image generation or hosted media management.

## License

Private project.
