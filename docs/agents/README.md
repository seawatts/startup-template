# Agent guides

[CLAUDE.md](../../CLAUDE.md) states every rule in a line or two. Each file here holds the detail for one of them; read the one for the area a change touches. Keep a rule's one-liner in CLAUDE.md and its detail here in step: a new rule gets both.

| File | Read it when |
| --- | --- |
| [checks.md](checks.md) | Running tests or type checks while you work, pushing, merging |
| [imports.md](imports.md) | Adding modules, package entries or imports |
| [database.md](database.md) | Touching the schema, the database client, transactions or after-response work |
| [api.md](api.md) | Adding or calling an API procedure, touching the `/api/rpc` route or how the session is read |
| [interfaces.md](interfaces.md) | Adding or changing a procedure: the catalog that feeds REST, OpenAPI, the SDK, the CLI, MCP and the docs reference |
| [speed.md](speed.md) | Making a screen or a save faster, or adding reads to a hot path |
| [ui.md](ui.md) | Any visible change: themes, phone layout, loading states, saves |
| [buttons.md](buttons.md) | Adding an action, link or button anywhere, including email |
| [copy.md](copy.md) | Writing or editing marketing or docs copy |
| [secrets.md](secrets.md) | Anything that needs a key, token or database URL |
| [public-references.md](public-references.md) | Writing anything public: no issue numbers or repository links |
| [pull-requests.md](pull-requests.md) | Opening, merging and closing out a pull request and its issues |

A product built from this template adds its own files here (product direction, analytics, demo data) and removes the rules it does not want. Keep CLAUDE.md under about 10 KB: it loads into every session, and the detail files do not.
