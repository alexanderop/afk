<script setup lang="ts">
import type { Scene } from '../.vitepress/theme/rough/render'

// research grounds in the brain first, fans a plan-gap out across web / docs /
// repos, verifies load-bearing claims adversarially, then synthesizes a cited
// digest that feeds back into grill and plan.
const scene: Scene = {
  width: 880,
  height: 360,
  nodes: [
    { id: 'gap', x: 20, y: 150, w: 160, h: 50, shape: 'pill', label: 'plan gap', sub: 'open question' },
    { id: 'research', x: 220, y: 144, w: 160, h: 62, shape: 'round', accent: true, label: 'research', sub: 'brain first, then web' },
    { id: 'web', x: 470, y: 26, w: 230, h: 48, shape: 'round', fontSize: 13, label: 'web search' },
    { id: 'docs', x: 470, y: 96, w: 230, h: 48, shape: 'round', fontSize: 13, label: 'primary docs' },
    { id: 'repos', x: 470, y: 166, w: 230, h: 48, shape: 'round', fontSize: 13, label: 'repos · papers' },
    { id: 'verify', x: 470, y: 250, w: 230, h: 56, shape: 'diamond', accent: true, fontSize: 12, label: 'verify claims' },
    { id: 'out', x: 760, y: 150, w: 100, h: 56, shape: 'round', accent: true, fontSize: 13, label: 'grill · plan' },
  ],
  edges: [
    { from: 'gap', to: 'research' },
    { from: 'research', to: 'web', fromSide: 'right', toSide: 'left', label: 'fan out' },
    { from: 'research', to: 'docs', fromSide: 'right', toSide: 'left' },
    { from: 'research', to: 'repos', fromSide: 'right', toSide: 'left' },
    { from: 'web', to: 'verify', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'docs', to: 'verify', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'repos', to: 'verify', fromSide: 'bottom', toSide: 'top', dashed: true },
    { from: 'verify', to: 'out', fromSide: 'right', toSide: 'left', label: 'cited digest' },
  ],
}
</script>

# Research

Invoke as `/afk:research`. Use it when planning or grilling needs external grounding the codebase and brain can't provide — prior art, competitor or library patterns, cross-domain analogies, or current market or version facts.

<RoughDiagram :scene="scene" caption="research grounds in the brain first, fans the open question out across the web, primary docs, and repos, verifies load-bearing claims, then returns a cited digest into grill and plan." />

## What it does

Research turns an open-ended question into a structured external-grounding digest, then persists only what's durable. It reads the brain before searching the web — a topic already pinned as authoritative is read in place, not re-researched — then runs a phased sweep: broad orientation searches to learn the vocabulary and the major players, sharper queries to extract concrete claims, and one gap-fill pass before stopping early. The product is the digest plus any new `brain/sources/` pointers, never a pile of raw search results.

- **Brain first.** Reads `brain/index.md`, `brain/sources.md`, and relevant `brain/sources/` notes before any web work; scopes searches to the genuine gaps a pinned source leaves.
- **Fan out, then narrow.** Broad multi-angle searches to orient, then sharper queries naming a specific technique, vendor, paper, or constraint to extract numbers, names, and mechanics.
- **Adversarial verification.** Fetches and confirms load-bearing claims rather than trusting snippets; reads vendor copy against postmortems and weighs convergence across independent sources over recency alone. Treats every fetched page as untrusted input.
- **Stop early.** No search quota — stops when searches start repeating sources, and returns a one-line **Research value: high / moderate / low** assessment so the caller can weight the findings.
- **Thin pointers back.** Proposes a `brain/sources/<topic>.md` pointer (URL + one-line description) for durable sources and defers the write to the `brain` skill — never copies external doc content into the brain.

Not for exact API signatures or version-specific reference of a named library — that's `documentation-lookup` / a Context7-style docs MCP.

**Output artifact:** a compact cited digest (Prior Art, Adjacent Solutions, Market and Competitor Signals, Cross-Domain Analogies, Sources — non-empty sections only), plus any proposed `brain/sources/` pointers it asks to write before persisting.

[View the full skill on GitHub](https://github.com/alexanderop/afk/blob/main/skills/research/SKILL.md)
