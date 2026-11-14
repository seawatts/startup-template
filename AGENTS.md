# Working agreements

The rules every agent and person follows in this repository are in [CLAUDE.md](CLAUDE.md), one or two lines per rule. The detail behind each rule is one file per topic in [docs/agents/](docs/agents/README.md); read the file for the area a change touches, not all of them.

Never put secrets in environment variables, setup scripts, hooks or committed `.env` files. They live only in Infisical. Detail: [docs/agents/secrets.md](docs/agents/secrets.md).
