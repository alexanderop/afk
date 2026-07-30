// Behavioral evals for afk:map-codebase (as-is maps into the brain vault).
import { task } from "../../lib/harness";

task("documents the as-is auth flow with no recommendations", async ({ run, expect }) => {
  const result = await run("Map how authentication works in this repo and save it to the brain.", {
    files: {
      "README.md": "# App\n\nA small service with token-based authentication.\n",
      "src/auth/login.ts":
        "// POST /login: verify password hash, then issue a JWT.\nexport function login(email: string, password: string) {\n  const user = findUser(email);\n  if (!user || !verifyHash(password, user.hash)) throw new Error('invalid');\n  return signJwt({ sub: user.id });\n}\n",
      "src/auth/middleware.ts":
        "// Reads the Authorization: Bearer header and verifies the JWT on every request.\nexport function requireAuth(req, res, next) {\n  const token = req.headers.authorization?.replace('Bearer ', '');\n  req.user = verifyJwt(token);\n  next();\n}\n",
      "brain/index.md": "# Brain\n\n## Codebase\n- [[codebase]]\n",
      "brain/codebase.md": "# Codebase\n\nDurable as-is maps of the project structure, authored by `afk:map-codebase`.\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["brain/codebase"]);
    expect.soft(trial.output).toContainNone(["## Recommendations"]);
  }
  await expect(result).toPassRubric([
    "Reads the actual auth source files before writing anything",
    "Writes a map to brain/codebase/ describing how authentication works as-is (login issues a JWT; middleware verifies the Bearer token per request)",
    "Describes only what exists — does not recommend changes, refactors, security hardening, or 'should' improvements",
    "Includes a commit pin (the sha the map was read at) and the paths it covers",
    "Updates the brain/codebase.md entrypoint to link the new map and does not hand-edit brain/index.md",
  ]);
});

task("asks which subsystem to map when told to map the whole repo", async ({ run, expect }) => {
  const result = await run("Map the whole codebase.", {
    files: {
      "README.md": "# Platform\n\nA larger app with auth, billing, and a background job queue.\n",
      "src/auth/index.ts": "export * from './login';\n",
      "src/billing/index.ts": "export * from './invoices';\n",
      "src/jobs/queue.ts": "export class JobQueue {}\n",
    },
  });

  await expect(result).toPassRubric([
    "Recognizes that mapping the entire repository in one note would be unscannable and go stale everywhere at once",
    "Asks the user which subsystem or boundary to map first (e.g. auth, billing, or the job queue), or proposes splitting into separate per-area maps",
    "Does not produce a single sprawling note that documents every part of the repo at once",
  ]);
});

task("extends the existing map instead of duplicating it", async ({ run, expect }) => {
  const result = await run("Map how the auth flow works in this repo.", {
    files: {
      "README.md": "# App\n\nToken-based auth.\n",
      "src/auth/login.ts": "export function login() { /* issues a JWT, now also records last_login */ }\n",
      "brain/index.md":
        "# Brain\n\n## Codebase\n- [[codebase]]\n- [[codebase/auth-flow]] — As-is map of how authentication is wired across the API.\n",
      "brain/codebase.md": "# Codebase\n\nDurable as-is maps of the project structure.\n\n- [[codebase/auth-flow]]\n",
      "brain/codebase/auth-flow.md":
        "# Auth flow\n\nAs-is map of how authentication is wired across the API.\n\n## Map\n- `src/auth/login.ts` issues a JWT on valid credentials\n\n---\n_Mapped at `abc1234` on `main`, 2026-01-01 · covers `src/auth/**`._\n",
    },
  });

  for (const trial of result.trials) {
    expect.soft(trial.output).toContainAll(["auth-flow"]);
  }
  await expect(result).toPassRubric([
    "Reads brain/index.md and discovers the existing brain/codebase/auth-flow.md note before writing",
    "Extends or corrects the existing auth-flow map in place rather than creating a duplicate note for the same area",
    "Does not create a second brain/codebase/ note covering the same auth area",
    "Refreshes the commit pin to reflect the state it just read",
  ]);
});
