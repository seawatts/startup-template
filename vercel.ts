import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  ignoreCommand:
    "git log -1 --pretty=format:%s | grep -E '^chore: version packages' && exit 0 || exit 1",
};
