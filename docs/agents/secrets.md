# Secrets

Every key, token, password and remote database URL lives in Infisical (`.infisical.json` names the project). None of them goes into an environment variable that every shell inherits: with a production key in every shell, a test run, seed or dev server can write to production by accident, and any command's output or log can leak it.

## Where they never go

- A cloud agent environment's variables. They reach every command of every session.
- Setup scripts, session hooks or any file a shell sources at start.
- A long-lived shell: never `eval "$(infisical export ...)"` or `source` a dotenv of them. Wrap the one command that needs the keys (`bun with-env <command>`).
- `.env` files committed to the repository, agent memory, chat, PR bodies or issue comments.

## Rules

- Never print a value. Name the key instead.
- Production writes, sends, DNS and billing changes wait for the owner's explicit go, each time.
- A session that finds secret-looking variables in its environment does not use them, and tells the owner which keys are exposed so they can be rotated at the provider and removed from the environment.
- The pre-push hook runs `infisical scan` on the changes being pushed.
