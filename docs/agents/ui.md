# UI development

Use a shadcn component from `packages/ui` before custom markup (`bun ui-add` adds one).

## Themes

- Every visible feature supports light and dark as it is built: the app, authentication, marketing, and portaled dialogs, menus and toasts.
- Use the semantic color tokens in `packages/ui/src/styles/theme.css`. A new color role gets a paired light and dark value. No fixed page, text, field, chart or status colors in components.
- Default to the device setting and keep the person's Light / Dark / device override. One root theme provider; no page-specific theme storage.
- Check the changed flow at desktop and 390px in both themes, including focus, disabled, error, loading and empty states and any portals. Keep readable contrast and honor reduced motion. Color alone never carries status or chart meaning.

## Phones

Design the phone screen, not the desktop made narrow. Below `md`:

- Page tabs are at most three segments, with the rest in a More sheet.
- Rows of tiles become sideways strips.
- Several header actions become one primary button plus a "…" sheet.
- Every side column gets a deliberate phone placement.

## Loading

- Push loading states down to the lowest component that actually waits on data. The page frame, heading, description, tabs, actions, static copy and every section that needs no read render at once.
- Only the part waiting on a read shows a skeleton, and the skeleton has that part's own shape (`Skeleton` from `packages/ui`) so nothing jumps when the data lands.
- Never gate a whole page or a heading on `query.isPending`, and don't wait on two unrelated reads before drawing either.
- A route's `loading.tsx` draws the same frame the page will, with skeletons only where data goes. Sign-in and access checks stay in the shell, not in each page.

## Saves

- Never navigate or reload after a save. Refresh in place by invalidating only the queries the save changed, never `invalidateQueries()` with no key.
- One-click controls (switches, choices, row toggles) show their new value at once with an optimistic update and are never disabled for the round trip.
- Forms keep their Save button, stay put, say "Saved" beside it, and reset their unsaved-changes state to what was saved.
- A failed save toasts its reason. One `Toaster` in the root layout. A routine success doesn't toast; a result the person can't see from where they clicked does.
