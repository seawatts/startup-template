# Every interface

A capability is not finished when its page works. One list, the operation catalog in `packages/api/src/operations.ts`, decides what an API key can do, and every public interface is generated from it. Nothing is written per interface.

| Interface | Where | Built from the catalog by |
| --- | --- | --- |
| REST | `POST /api/v1/<id>` (a read with no input also answers GET) | `apps/web-app/src/app/api/v1/[[...operation]]/route.ts` |
| OpenAPI 3.1 | `GET /api/v1/openapi.json` | `packages/api/src/openapi.ts` |
| SDK | `createSdk()` in `packages/sdk` | types only: `sdk.<area>.<name>(input)` |
| CLI | `<cli> api <id> --field value` | `apps/cli/src/lib/api-command/run.ts`, reading `GET /api/v1` |
| MCP server | `/api/mcp`, one tool per operation | `packages/api/src/mcp.ts` |
| Docs | `/docs/reference` | `apps/web-app/src/app/(marketing)/docs/reference/page.tsx` |

## Adding or changing a procedure

Every procedure in the app router is in exactly one of two places; `packages/api/tests/operations.test.ts` fails until it is.

- `operations`: an API key may call it. Give it a `title` (a few words) and a `description` of one or two sentences that a person or a model could choose by: what it returns or changes, and any limit. Set `access` to `read` for a GET procedure and `write` otherwise, and `destructive: true` for a write that removes something or cannot be undone.
- `sessionOnly`: it stays in the signed-in app. Give the reason in a sentence. Typical reasons: it manages credentials, it opens a browser page, it is a form helper, it is a billing decision.

Then call it once for real, not only from the page: `curl` it, or `<cli> api <id>`, against the running app. Say in the pull request which interfaces you called.

## Rules the catalog relies on

- An operation's input is a zod object (or nothing). The MCP tool schema, the CLI's flags and the reference page's field list all come from it, so describe limits in the schema (`.min`, `.max`, `.default`) and not only in code.
- An API key acts as the person who created it, inside the key's organization (`packages/api/src/api-key-context.ts`). A procedure must scope by `context.auth.orgId` or `context.auth.userId`, never by an id from the input alone. Nothing the caller sends chooses the actor.
- Only catalog ids are callable through a key. A procedure left out cannot be reached by guessing its name.
- The public API accepts only an API key. A browser session is not a credential there, so another site's page cannot use someone's cookie against it.
- Errors: throw `ORPCError` with a message that is safe to show. REST returns it as `{ error: { code, message } }`, the SDK throws `SdkError`, the CLI prints it and exits 1, and MCP returns it as a tool error the model can act on. Anything else is a plain 500 with no detail.
- Public copy (titles, descriptions, the docs guides in `_lib/docs.ts`) follows `copy.md` and `public-references.md`.

## Not included yet

Per-key permissions (every key can call the whole catalog), rate limits, and a published npm package for the SDK (it is a workspace package typed from the router). Add them when a product needs them; the catalog entry is where a permission or a limit would be declared.
