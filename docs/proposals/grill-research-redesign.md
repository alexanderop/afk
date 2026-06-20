# Grill Research-Phase Redesign

> Proposal — output of a multi-agent design pass (4 lensed designs, adversarially
> scored: minimal-surgical 22 / gap-driven 21 / proactive-auto 19 / intent-routed-fleet 17).
> Synthesizes the gap-driven completeness engine onto a minimal-surgical base.
> Inspired by compound-engineering's research orchestration.

## Problem

Grill's *shape* is already correct (research-first → background → one-question interview → plan), but all three goals leak through discretionary words in the current files. **Goal 1 (auto-good docs):** `research.md` has no positive write-trigger and three soft off-ramps ("worth keeping" SKILL.md:76, "skip… trivial" :82-83, "Write it once, lazily" RESEARCH-FORMAT.md:89), so the doc gets skipped under interview pressure; plan back-citation is optional ("cite the finding it rests on, **when one does**" :192/195). **Goal 2 (completeness):** the interview ends when "the decision tree is resolved enough" (:121) — a metaphor that closes when the lead runs out of questions it happens to think of, not when coverage is provably complete. **Goal 3 (proactive research):** research fires only "for broad or unfamiliar work" (:62), an undefined opt-out, with no wiring from risk/blast-radius to depth, and the Research scout is told to report "recommendations" (:70) — contradicting RESEARCH-FORMAT.md:11-15's descriptive-only rule.

## Design principles

1. **Replace soft words with hard gates.** Every goal-failure is a discretionary phrase, not a structural defect. Fix triggers and gates, keep the shape.
2. **One taxonomy does double duty.** A fixed surface set both *scopes proactive research* (what scouts resolve) and *enumerates the question set* (what the interview must close). Resolved surfaces are silent; only the residue is asked. This is the dual guarantee that makes Goal 2 mechanical.
3. **The interview ends when the coverage ledger closes, not when you stop thinking of questions.** Completeness becomes an inspectable, enumerable check.
4. **Research is a function of a decision, not a judgment call.** A three-stage cascade decides *whether* and *what* to research; if any scout ran, the doc is written — deterministically.
5. **Stay interactive; stay minimal.** No `context: fork` in grill. Zero new agents (the ≥2-callers rule is unmet for any grill-specific agent and the external angle is owned by `afk:research`). Pointers over copies; SKILL.md stays well under 500.
6. **Honest grounding.** Every external fact carries URL + version + deprecation status; every evidence-grounded decision back-cites its finding; brain notes that conflict with live code are flagged with their date; requested-but-unavailable research is recorded as a gap, never faked.

## Redesigned flow

The Process list stays numbered 1→16; only the marked steps change. Order from invocation to plan-written:

1. **Ground** *(unchanged).* Read the ticket/issue/idea fully — seed, not substitute. Read code/tests/configs/schemas/manifests. Read `brain/codebase/<area>` map first if present, scope to its gaps, honor the commit-pin (treat as history if HEAD moved past mapped paths). Derive `<slug>`.
2. **Read brain** *(one guard added).* `brain/context.md`, relevant `brain/decisions/`, `brain/principles.md` + linked files. **New:** when a brain note conflicts with present code, flag it and cite the note's date — never let stale memory override current evidence. Anything the brain answers is pre-resolved, not asked.
3. **Decide whether external research adds value, and what kind** *(rewritten — three-stage cascade, compressed; detail lives in `RESEARCH-GATE.md`).*
   - **Explicit request wins.** If the ticket/user asks for prior art / "what should we borrow" / best practices / alternatives / official docs / names a specific external tech → external research is **required**; the skip signals below don't apply. Only an explicit opt-out overrides (honor and note it). Improvement verbs ("improve", "make it better") carry no external signal alone.
   - **Implicit signals** (only if no explicit request): lean research on high-risk topics (security, payments, privacy, migrations, compliance, external APIs), **fewer than 3 direct local examples**, or an **adjacent-domain match** (patterns exist for a near neighbor, not the exact case — frame the query at the domain gap). Lean skip when a strong, recently-touched local pattern with multiple direct examples exists. **ADR-worthiness (hard-to-reverse / surprising / trade-off) forces the deeper path.**
   - **Classify intent** when research runs: *implementation-guidance* (approach settled → docs + version + pitfalls) vs *landscape* (what options exist → delegate to **`afk:research`**) vs *mixed* (landscape first to shortlist, **then** doc-verify the chosen option — sequential).
   - **Doc-verification is a hard prerequisite** for any library/API/SDK/CLI/cloud contact: never use training data for signatures/config keys/versions; fetch via Context7 or official docs, record URL + version. **Run the deprecation/sunset check before any external API enters a contract** (see Proactive research).
   - **Announce the decision in one line.**
4. **Fan out read-only scouts — whenever step 3 said research adds value** *(de-gated; "broad or unfamiliar" deleted).* Codebase scout (paths, current behavior, contradictions, untested surfaces, the `<3-examples`/adjacent-domain verdict) + the external slice **delegated to `afk:research`** for landscape/mixed (grill the lead calls it; it is `context: fork` — grill never nests it inside a scout) + Domain scout when glossary/ADRs are in play. **Scouts report findings only — never recommendations** (recommendations are the plan's job; this removes the SKILL.md:70 ↔ RESEARCH-FORMAT contradiction). Depth scales with the step-3 signals: a throwaway gets the codebase scout only; a payments/migration decision gets the full set + landscape delegation.
5. **Synthesize + write research.md — mandatory once any scout ran or any external fact was fetched** *(the research gate; triple soft-gate deleted).* Verify important claims against files/sources (a subagent report ≠ truth; verify absence claims against the repo before recording them), then persist `brain/plans/<slug>.research.md` per RESEARCH-FORMAT, **closing with the Coverage ledger** (see The completeness engine). Mark a one-line **research-value rating** (high/moderate/low) at the top. Skip the doc *only* when no scout ran and no external fact was fetched (a genuinely trivial plan).
6. **Background** *(unchanged + ledger preview).* Product-owner framing (problem/who/outcome/scope from evidence). Then list what research already resolved (the ledger's `resolved-by-evidence` rows — so the user sees what won't be asked) and how many open rows remain ("3 decisions need you; here's the first").
7. **Interview the open ledger rows** *(rewritten).* Walk `open-needs-user` rows in priority order (blast-radius/irreversibility first, then experience bar, then edges, then cosmetics), one at a time, waiting for each answer, each presented as **(question, why it matters / what breaks, default-if-silent)**. Silence or "your call" resolves to the stated default — except high-blast-radius rows (the Stop-and-Ask list), which must be asked as real questions even when a default exists.
8–13. **Topical passes** *(unchanged in content; now ledger rows, not a remembered grab-bag).* Glossary conflicts, term-sharpening, contradiction surfacing, `brain/context.md` updates on resolution, ADR offered only when hard-to-reverse/surprising/trade-off.
9 (within 7–13). **Reconcile within-session.** When an answer surfaces a new *what-is* fact, append it to research.md before the plan cites it — research is ground truth, not a write-once snapshot. New facts that open a row re-enter the priority order.
14. **Coverage gate** *(rewritten — replaces "resolved enough by feel").* The interview ends only when every ledger surface is `resolved-by-evidence`, `resolved-by-user`, `default-accepted`, or `n/a-derived` (with a one-line reason) — no surface left `open`. This is an enumerable check, not a vibe.
15. **Reference repo** *(unchanged).* Record any user-pointed reference repo (origin + local path) in the plan.
16. **Write the plan** *(traceability hardened).* `brain/plans/<slug>.md` + wikilink in `plans/index.md`. **Every decision/contract that rests on a finding must back-cite it** `[[<slug>.research#<finding>]]`; a decision with no citation carries an explicit `(no research — chosen in interview)` tag. Every external contract cites URL + version. `## Acceptance` bar for experience-bearing work. Wave-grouped tasks with `owns`/`depends`. The plan's consumed shape (`## Decisions / ## Contracts / ## Acceptance / ## Open Non-Blocking Notes / ## Tasks`) is unchanged, so the orchestrator's Worker Brief Contract and qa's acceptance bar don't ripple.

## The completeness engine

The mechanism is **a fixed surface taxonomy × a Coverage ledger** — a descriptive table written into `research.md` and walked at the gate. Seven surfaces, derived from grill's own existing stress-test categories (SKILL.md:104-110) plus a contract surface:

1. Contracts (interface / data / API shapes)
2. Lifecycle & state transitions
3. Failure modes & error/retry behavior
4. Permission & ownership boundaries
5. Source-of-truth / conflict resolution
6. Experience quality bar (mandatory row — for experience-bearing work)
7. External / version facts & deprecation

Each surface gets a status: **`resolved-by-evidence`** (cite the finding — produces **zero** questions), **`open-needs-user`** (becomes a question carrying its default), or **`n/a-derived`** (a one-line reason it doesn't apply — a CLI feature gets no screen-reader row; "derive, don't checklist").

**The dual guarantee.** The *same* taxonomy that scopes the step-3/4 scouts also enumerates the question set:
- **Completeness (ask everything needed):** every surface must reach a non-`open` status before step 14 passes. The lead cannot "stop thinking of questions" — an `open` row is a visible, enumerable blocker. This replaces the metaphorical decision tree with a literal table.
- **Nothing over-asked:** a surface the scouts resolved against files/docs/brain is `resolved-by-evidence` and is **silent**. The minimize-questions principle (SKILL.md:11-13) is preserved but *mechanized* — questions are suppressed by evidence, not by the lead's judgment to under-ask. Ask the user only when a surface "materially affects architecture, scope, sequencing, or risk and cannot be responsibly inferred."

**The experience-bar trap is closed structurally.** Surface #6 is a mandatory ledger row: for non-experience work it's `n/a-derived` with a reason; for experience-bearing work left unmarked it stays `open` and blocks the gate. Misclassification is a visible empty cell, not a silent skip — this gives the SKILL.md:170 Red Flag teeth.

**Defaults keep it non-blocking.** Each `open-needs-user` row ships a default; on silence, non-blocking rows resolve to their default (recorded in `## Open Non-Blocking Notes`). Only the Stop-and-Ask surfaces (intent / trade-off / owner-required / source-of-truth conflict) truly block.

**Honest limit (not oversold):** the zero-token lint cannot read runtime `brain/plans/*.research.md`, so the gate is lead-honesty against an *enumerable, user-previewed* artifact — strictly better than a metaphor (the ledger is a visible object the user sees in the Background), but not mechanically proven. A lazy lead could rubber-stamp `n/a-derived`; the `Red Flag` row and the required reason are the only guards there. We adopt the ledger as a **format rule + Red-Flags entry**, not as a non-existent lint.

## Proactive research

Proactivity = deleting the "broad or unfamiliar" opt-out and wiring depth to risk signals already implicit in the skill.

**What fires automatically, when:**
- **Step-3 cascade fires on every run.** It is a decision, not an opt-out.
- **Doc-verification fires the moment work touches any library/API/SDK/CLI/cloud** — before asking, before any technical contract. Already a "hard prerequisite," now with the deprecation gate as a precondition.
- **Codebase scout fires whenever step 3 found research adds value** — no scope-judgment opt-out.
- **Landscape delegates to `afk:research`** on explicit-request or `<3-examples`/adjacent-domain. Grill never rebuilds web-sweep logic — the clean seam: grill owns codebase + doc-verified contracts + brain; `afk:research` owns external landscape and self-rates high/moderate/low.

**Deprecation/version discipline (the sharp portable bit).** Before any external API/SDK enters a plan Contract, the doc check runs a **mandatory deprecation gate**: search `"<X> deprecated sunset"` + `"<X> breaking changes migration"`, check the docs banner, record `version` + `deprecated: no | <date, migration-url>`. An API that fails the gate cannot enter a contract — its replacement is researched instead.

**Risk-scaled depth.** `<3 direct local examples` and adjacent-domain scale effort to grounding-thinness; the high-risk-topic list scales it to blast radius; ADR-worthiness forces the deeper path. A throwaway and an event-sourcing decision no longer get identical treatment — the missing risk→depth link the current skill lacks.

**Self-policing cost.** Delegating the external slice to `afk:research` inherits its token budget + research-value rating, so speculative fan-out is cheap and a `low` digest is discardable. **Honesty when unavailable:** if explicitly-requested external research can't run, the plan records it as an assumption/open gap — never presented as externally grounded.

## Auto-generated artifacts

**Terminology (AFK).** Grill produces **the plan** (`brain/plans/<slug>.md`, prescriptive — "what we will build") and **the research doc** (`brain/plans/<slug>.research.md`, descriptive — "what is there"). AFK's separate **`design-spec`** concept (`specs/pending/<slug>.md`) is a different, upstream artifact owned by the `design-spec` skill; grill does not write a spec. Grill's plan *is* its implementation-ready output. This redesign touches only grill's two docs.

**research.md — trigger.** One positive rule replaces three soft off-ramps: **if any scout ran or any external fact was fetched, you write the doc.** Skip only when neither happened. The doc is the first artifact (step 5), before any user-facing question.

**research.md — shape & quality bar (additions to RESEARCH-FORMAT):**
- A **`## Coverage ledger`** section at the end (the 7-surface table above) — descriptive (records what's known vs unknown, not what to do), so it respects the descriptive-only prime directive.
- A **research-value rating line** under the title (`**Research value: high** — externally-grounded decisions rest on findings 2,4`).
- Each `## External sources` line carries **URL + version + `deprecated:` status**.
- **Recommendations from scouts/`afk:research` feed plan decisions and ledger defaults, never research.md** — resolving the descriptive-only contradiction at its source.
- **Load-bearing rule:** every finding must surface in a plan Decision/Contract/Acceptance/Risk or be dropped — no orphan findings, no appendix padding.
- **Within-session freshness:** append a new what-is fact as a finding before the plan cites it.

**The plan — auto-generation.** Because the scouts settle the evidence-decidable surfaces and the ledger enumerates the open ones, the plan is largely a *transcription of the closed ledger*: each `resolved`/`default-accepted` row → a Decision or Contract (with its grounding citation or `(no research…)` tag); each defer-row → an Open Non-Blocking Note; each experience-bar row → an Acceptance criterion. Back-citation is mandatory (the "when one does" escape hatch is removed for evidence-grounded rows). The lead transcribes a closed ledger rather than free-composing and hoping it's complete.

## Agents: ship or stay inline

**Ship zero new agents.** This is deliberate and correct for AFK:
- **≥2-callers rule unmet.** A grill-specific `flow-analyzer` / `codebase-scout` / `docs-researcher` has exactly one caller (grill). The "qa and the implement-orchestrator also call it" claim was **verified false** against the repo: qa runs as a single `context: fork` task and dispatches no read-only scouts; the implement-orchestrator reads source itself rather than calling a scout agent. So those agents would be single-caller files violating AFK's own rule.
- **Lint cost.** Each new agent costs the 250-line cap, the `description` "Use when" rule, model-tier pinning, `disallowedTools` for read-only, plus entries in `agentModelRequirements`/`agentsRequiringTools` — for no reuse.
- **Collision.** The external/landscape axis is owned by `afk:research`; a landscape agent would duplicate it.
- **Interactivity.** Grill must stay interactive (never `context: fork`). The scout fan-out + ledger build are grill's own reasoning and stay inline `Task` dispatch (what grill does today, zero new files). Only the external slice forks — and that's already `afk:research`.

If `plan`/`ship` later need a flow-analyzer, promote it then. Until two real callers exist, it stays inline.

## Concrete changes

**`skills/grill/SKILL.md`** (currently 233 lines → ~250, well under 500):
- **Intro (8-13):** tighten to "research to the taxonomy, then interview the open rows; the coverage ledger drives the question list."
- **Step 2:** add the stale-brain guard sentence (flag + date brain↔code conflicts).
- **Step 3:** rewrite to the three-stage cascade + intent routing + deprecation-gate sentence; point to new `RESEARCH-GATE.md` for the cascade/taxonomy detail (pointer, not copy). Net ~+6.
- **Step 4:** delete "For broad or unfamiliar work" → "Whenever step 3 found research adds value." Strike **"recommendations"** from the scout report list (:70). Delegate the landscape slice to `afk:research` (grill the lead calls it, not a nested scout). Make step 3 the *decision*, step 4 the *dispatch* (de-dupe). Net ~−1.
- **Step 5:** replace the triple soft-gate with the positive trigger + "close with the Coverage ledger" + research-value rating line. Net ~0.
- **Step 6:** add the ledger preview ("what research resolved / N open rows"). Net +1.
- **Step 7:** add "and a default-if-silent"; walk `open` ledger rows in priority order; point at `RESEARCH-GATE.md`. Net +2.
- **Step 14:** replace "resolved enough … decision tree" with "ends only when every ledger surface is non-`open` with a recorded status." Net 0.
- **Step 16 + Output template:** delete "(cite the finding it rests on, when one does)" (:192/195) → mandatory back-citation + `(no research — chosen in interview)` tag; add the within-session reconciliation sentence. Net +2.
- **Red Flags:** add *"The interview feels done." → It's done when every COVERAGE surface is non-`open`, not when you run out of questions.* Net +1.

**`skills/grill/RESEARCH-FORMAT.md`:**
- Replace **"Write it once, lazily"** (:89) with the positive trigger.
- Add the **`## Coverage ledger`** section to the structure + a worked example row.
- Add the **research-value rating** line and the **`deprecated:` field** to each `## External sources` line.
- Add the **recommendations-feed-defaults-not-research**, **load-bearing-drop**, and **within-session-freshness** rules. Net ~+12.

**New file `skills/grill/RESEARCH-GATE.md`** (pure reference, ~70 lines, no frontmatter/line-cap rules — like RESEARCH/CONTEXT/ADR-FORMAT): the three-stage cascade, the 7-surface taxonomy + status values, the question shape `(question, what breaks, default)`, and the priority order. Keeps SKILL.md lean.

**Lint:** zero new agents → no `agentModelRequirements`/`agentsRequiringTools` changes. The new `RESEARCH-GATE.md` is a reference sibling (the lint globs SKILL.md and `agents/*.md` only, so it carries zero lint cost). `name:` still matches dir, description untouched, SKILL.md < 500. The zero-token lint passes unchanged. (We deliberately do **not** add a research-doc lint — the design that proposed one was architecturally impossible, since `brain/plans/*.research.md` is runtime output in the user's repo, never in the AFK plugin repo.)

## Phased implementation plan

Ordered smallest-shippable-first; each slice ships independently and passes `bun run test` (zero-token) untouched.

1. **Cheap wins, no new files.** Strike "recommendations" from step 4 (fix the contradiction); delete the "when one does" back-citation escape in step 16/Output + add the `(no research…)` tag; add the within-session reconciliation sentence. *Delivers:* clean descriptive/prescriptive split + enforced-in-review traceability at near-zero line cost.
2. **The research gate (Goal 1).** Replace the triple soft-gate in step 5 and RESEARCH-FORMAT:89 with the one positive trigger; add the research-value rating line to both. *Delivers:* `research.md` becomes a deterministic function of the research decision — no skip-by-default.
3. **Proactive cascade (Goal 3).** Rewrite step 3 to the three-stage cascade + deprecation gate; de-gate step 4; add the stale-brain guard to step 2; create `RESEARCH-GATE.md` with the cascade + deprecation discipline. *Delivers:* automatic, risk-scaled, deprecation-disciplined research with the `afk:research` seam.
4. **The completeness engine (Goal 2).** Add the 7-surface taxonomy + Coverage ledger to `RESEARCH-GATE.md` and a `## Coverage ledger` section to RESEARCH-FORMAT; rewire step 5 (write the ledger), step 6 (preview it), step 7 (walk open rows with defaults), step 14 (gate on it); add the Red Flag row. *Delivers:* enumerable completeness + nothing-over-asked, with the experience-bar trap closed.

Slices 1–2 are independent and could land together; 4 depends on 3 (both edit `RESEARCH-GATE.md`).

## Risks and trade-offs

- **The completeness gate is honor-system within a run.** The zero-token lint cannot read runtime `research.md`, so "every surface non-`open`" is lead-honesty against an enumerable, user-previewed table. This is strictly better than today's metaphor (the ledger is a visible object the user sees in the Background and the plan renders from) but is **not** mechanically proven — a determined lazy lead can rubber-stamp `n/a-derived`. The required reason + the Red Flag row are the only guards. We do not oversell this as "mechanical."
- **Checklist ossification.** A fixed 7-surface taxonomy risks becoming a generic concern-list. Mitigation: every surface is `n/a-derived`-able *with a reason* and closeable by evidence without a question — but this is prose discipline, not enforcement.
- **Front-loaded cost on simple work.** De-gating research + mandatory `research.md` risks over-researching a small change. Mitigation: the step-3 "lean skip" (strong recent local patterns, `≥3` examples) keeps depth low, and the skip in step 5 (no scout ran → no doc) preserves the escape. Grill stays interactive — the cascade is the lead's own cheap reasoning, not a silent multi-agent prelude; only landscape forks to `afk:research`.
- **Defaults can be rubber-stamped.** "Silence → default" keeps the interview short but lets a trusting user inherit the lead's blind spots. Mitigation: high-blast-radius rows (the Stop-and-Ask list) must be asked as real questions even when a default exists — fenced off from the default-everything ergonomics.
- **Instruction budget.** Net addition: ~+17 lines to SKILL.md (→ ~250, the 500 cap is nowhere near binding), ~+12 to RESEARCH-FORMAT, one new ~70-line reference file. The conceptual load the lead carries every run does go up (a cascade + a taxonomy), but the taxonomy is dual-use (it replaces, not adds to, the old steps-8-11 grab-bag and the "resolved enough" step), and the cascade/taxonomy detail lives in `RESEARCH-GATE.md` so the most-read steps stay tight.
- **`afk:research` dependency.** Hard-delegating the external angle means if its digest contract drifts, grill's landscape coverage degrades. Mitigation: grill records `requested-but-unavailable` honestly and the plan never claims external grounding it didn't get.
- **Deliberately not taken:** CE's stable-ID units and write-then-deepen confidence scoring — they're a structural rewrite of the plan doc that ripples into the orchestrator's Worker Brief Contract and qa's acceptance bar. Left on the table to keep this shippable and ripple-free.
