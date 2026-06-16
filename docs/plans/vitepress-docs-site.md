# Public Docs Site for afk (VitePress + GitHub Pages)

## Context

- Goal: a public documentation website for the afk plugin that reads like the
  Superpowers Mintlify site (sidebar-grouped, searchable, content-first, with a
  hero landing), but built with **VitePress** and auto-published via **GitHub
  Actions** to **GitHub Pages**. The site lives in its own new `site/` folder,
  separate from the existing internal `docs/`.
- Reference inspected live (agent-browser) — https://obra-superpowers.mintlify.app/introduction:
  left sidebar grouped into sections (Get Started · Installation · Core Concepts ·
  Skills Library, one page per skill), top search, dark-mode toggle, GitHub link,
  right-hand "On this page" rail. VitePress's default theme provides all of these
  out of the box (nav, grouped sidebar, local search, dark mode, outline rail).
- Repo facts:
  - afk is a Claude Code **plugin** (markdown skills + Bun test runners, "no build
    step"). Repo `github.com/alexanderop/afk`. Toolchain is **Bun** throughout.
  - Root `package.json` is intentionally dependency-free (scripts only).
  - `docs/` already holds **internal** contributor docs (plans, templates,
    guides) — it must NOT be published.
  - No `brain/` vault, so this plan lives in `docs/plans/`.
  - Existing CI `.github/workflows/checks.yml` is hardened: SHA-pinned actions,
    `persist-credentials: false`, top-level `permissions: {}`, per-job minimal
    permissions. Already-pinned SHAs to reuse verbatim:
    `actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5.0.1` and
    `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2`.
  - Real install commands (from README:95) the docs must use:
    `/plugin marketplace add alexanderop/afk` then `/plugin install afk@afk`.
- Sources (doc-verified, VitePress `/vuejs/vitepress`, deploy guide
  https://vitepress.dev/guide/deploy#github-pages, checked June 2026):
  - GH Pages workflow needs `permissions: pages: write` + `id-token: write`,
    `actions/configure-pages` → build → `actions/upload-pages-artifact@v3` →
    `actions/deploy-pages@v4`; Pages source must be set to "GitHub Actions".
  - `base` **must** match the repo sub-path for a project site, start+end with
    `/` → `base: '/afk/'`.
  - Local search: `themeConfig.search = { provider: 'local' }` (no account/keys).

## Decisions

1. **Canonical home, hand-authored.** The site becomes the public face. Content
   is migrated/authored from README + each `SKILL.md`; README then shrinks to a
   concise overview that points at the site (kept rich enough for the GitHub
   landing). Drift management is accepted as our cost.
2. **Deploy target: GitHub Pages project site** → `https://alexanderop.github.io/afk/`.
   `base: '/afk/'`. No CNAME / DNS. Pages source = "GitHub Actions" (manual
   one-time repo setting — see Open Notes; cannot be automated without admin
   access).
3. **Folder: new top-level `site/`.** VitePress root is `site/`; config in
   `site/.vitepress/`, build output `site/.vitepress/dist`. Workflow path-filters
   on `site/**` so internal `docs/` is never published.
4. **Toolchain: isolated `site/package.json` + Bun.** VitePress is a devDep with
   `docs:dev` / `docs:build` scripts in `site/package.json` (own `bun.lock`). Root
   `package.json` stays dependency-free. CI runs `bun install` + build inside
   `site/`.
5. **Scope: full per-skill pages now (~17).** Reference section gets one page per
   skill — flow skills (help, ship, grill, prototype, implement, batch, simplify,
   qa, write-good-goal, write-evals) + brain skills (init-brain, brain, reflect,
   ruminate, meditate, plan, review).
6. **Home: hero with value prop + visualized flow + install CTA.** Custom flow
   strip rendered as a Vue component in the theme (CSS, no extra deps — avoids a
   Mermaid plugin and a fragile build) used on the home page below the default
   hero/features.
7. **Search: VitePress built-in local search** (no Algolia account needed).
8. **CI: one workflow `docs.yml`.** Build job runs on PRs touching `site/**` (gate
   — catches broken docs before merge) and on push to `main`; deploy job runs only
   on `main`. Hardened to match `checks.yml`.

## Contracts

- **VitePress config** (`site/.vitepress/config.ts`):
  - `base: '/afk/'`, `title: 'afk'`, `description`, `lang: 'en-US'`.
  - `themeConfig.nav`: Guide, Reference, GitHub repo link.
  - `themeConfig.sidebar` grouped: **Get Started** (Introduction, Quickstart) ·
    **Core Concepts** (The AFK Flow, The Brain Vault, Eval-first) · **Reference**
    (Flow skills group + Brain skills group, links below).
  - `themeConfig.search = { provider: 'local' }`.
  - `themeConfig.socialLinks` GitHub → `https://github.com/alexanderop/afk`.
  - `lastUpdated: true` (requires `fetch-depth: 0` in checkout).
- **Page file map** (under `site/`):
  - `index.md` (layout: home) — hero + features + `<Flow />` strip + install block.
  - `guide/introduction.md`, `guide/quickstart.md`.
  - `concepts/the-afk-flow.md`, `concepts/the-brain-vault.md`, `concepts/eval-first.md`.
  - `reference/<skill>.md` — one per skill (slug = skill name).
- **Install command shown everywhere** must be exactly:
  `/plugin marketplace add alexanderop/afk` + `/plugin install afk@afk`.
- **Workflow** `.github/workflows/docs.yml`:
  - `on`: `push` (branches `[main]`, paths `site/**`, `.github/workflows/docs.yml`),
    `pull_request` (same paths), `workflow_dispatch`.
  - Top-level `permissions: {}`. `concurrency: { group: pages, cancel-in-progress: false }`.
  - `build` job — `permissions: { contents: read }`; checkout (`fetch-depth: 0`,
    `persist-credentials: false`), setup-bun, `actions/configure-pages`,
    `bun install` + `bun run docs:build` in `site/`, `actions/upload-pages-artifact@v3`
    with `path: site/.vitepress/dist`.
  - `deploy` job — `needs: build`, `if: github.ref == 'refs/heads/main' &&
    github.event_name != 'pull_request'`, `environment: github-pages`,
    `permissions: { pages: write, id-token: write }`, `actions/deploy-pages@v4`.
  - All actions SHA-pinned (reuse the two SHAs above; resolve current SHAs for
    `configure-pages`, `upload-pages-artifact@v3`, `deploy-pages@v4`).
- **`.gitignore`**: add `site/node_modules/`, `site/.vitepress/dist/`,
  `site/.vitepress/cache/`.

## Acceptance

Experience-bearing work — the bar QA verifies:

- **Home page, no scroll/click:** (a) one-line value prop of what afk is is
  legible; (b) the `grill → implement → simplify → qa` flow is *visualized* (the
  flow strip), not just listed in prose; (c) a copy-paste install command is
  visible and is exactly the marketplace commands above.
- **Built site works under the sub-path:** every internal link, the sidebar, and
  assets resolve correctly at `https://alexanderop.github.io/afk/` (i.e. `base`
  is right — no 404s from missing `/afk/` prefix). Verified on the built output,
  not just `dev`.
- **Navigation parity with the reference:** grouped sidebar, working local
  search, dark-mode toggle, and the "On this page" outline all present and
  functional.
- **Every skill is reachable:** the Reference section lists all ~17 skills, each
  page loads, and each links back to its source on GitHub.
- **Mobile:** sidebar collapses to a working menu; hero + flow + install remain
  legible on a narrow viewport.
- **Pipeline:** a push to `main` touching `site/**` builds and deploys green; a
  PR touching `site/**` runs the build gate; `zizmor --persona pedantic` reports
  no findings on `docs.yml`.

## Open Non-Blocking Notes

- **Manual one-time step (you):** GitHub repo → Settings → Pages → Build and
  deployment → Source = **GitHub Actions**. The deploy job cannot publish until
  this is set; it needs repo-admin access I can't perform.
- README trim to a pointer can land in the same PR or a follow-up — not a blocker
  for the site building.
- Mermaid-rendered flow diagram and Algolia search are deferred enhancements.
- Per-skill pages start as authored summaries sourced from each `SKILL.md`; a
  generator to reduce drift is a future option (explicitly out of scope now).

## Tasks

- **Wave 1 — parallel (scaffold + infra, disjoint files):**
  - VitePress scaffold · owns `site/package.json`, `site/bun.lock`,
    `site/.vitepress/config.ts`, `.gitignore` · depends: none. Config carries
    `base`, nav, grouped sidebar (with all page paths stubbed), local search,
    social link, `lastUpdated`. `bun run docs:build` must succeed with placeholder
    pages.
  - Deploy workflow · owns `.github/workflows/docs.yml` · depends: none (consumes
    the `site/` build contract, not its files). SHA-pinned, hardened, build-on-PR
    + deploy-on-main per Contracts.
- **Wave 2 — parallel (content authoring, disjoint files, all depend on Wave 1
  config/sidebar paths):**
  - Home + flow component · owns `site/index.md`, `site/.vitepress/theme/index.ts`,
    `site/.vitepress/theme/Flow.vue` · depends: scaffold. Meets the home-page
    Acceptance bar.
  - Get Started + Concepts · owns `site/guide/*.md`, `site/concepts/*.md` ·
    depends: scaffold. Sourced from README + flow/brain skills.
  - Skill reference pages · owns `site/reference/*.md` (all ~17) · depends:
    scaffold. Each summarized from its `SKILL.md`, links back to GitHub source.
- **Wave 3 — sequential (depends on all content):**
  - README trim to overview + prominent link to the published site · owns
    `README.md` · depends: Wave 2 (so links point at real pages).

**Verification**
1. `cd site && bun install && bun run docs:build` — clean build, no broken-link
   or dead-link warnings.
2. `cd site && bun run docs:preview` (or serve `dist`) — open with agent-browser
   at the `/afk/` base; confirm home Acceptance bar (value prop + flow strip +
   install command), sidebar groups, local search, dark mode, outline rail, and a
   sample skill page; screenshot each.
3. `uvx zizmor --persona pedantic .github/workflows/docs.yml` — zero findings.
4. After merge + manual Pages-source setting: confirm the live
   `https://alexanderop.github.io/afk/` loads with assets/links resolving under
   the sub-path.
