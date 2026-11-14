# Checks

Run the smallest check that covers the change while you work, and the full set once before a push. A push that fails in the hook costs minutes; a targeted run costs seconds.

| What changed | Run |
| --- | --- |
| One package's types | `bun run --filter @seawatts/<package> typecheck` |
| One test file | `bun test <path>` from that package |
| Formatting and lint | `bunx biome check --write <paths>` |
| Everything, before a push | `bun format:ci && bun typecheck:ci && bun test` |

- `bun typecheck` needs the generated Stripe billing ids. `bun typecheck:ci` builds them first; locally run `bun run build --filter @seawatts/stripe` once.
- The pre-commit hook runs Biome on staged files, the commit-msg hook runs commitlint, and the pre-push hook runs the typecheck and the Infisical secret scan. Never bypass a hook with `--no-verify` or `LEFTHOOK=0`; fix the cause.
- Never run two heavy commands at once (a push and a full typecheck, two suites). Each one can take most of a small machine's memory, and a suite that dies with no failing test named was usually killed for memory: check before chasing a code cause.
- One push when the change is done. Don't push per fix.
- Pull requests run the Typecheck & Format workflow in GitHub Actions. Don't add Actions jobs without measuring their minutes.
- Report what actually ran. A documentation-only change does not need the application suites.
