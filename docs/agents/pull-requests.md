# Pull requests and issues

- Each PR description lists the issues it finishes as `Closes #N`, one keyword per issue on its own line, so GitHub closes them on merge. "Closes #1, #2 and #3" only closes #1; `Refs #N` never closes. After merging, close any finished issue still open, naming the PR. Partially finished work says `Refs #N` and leaves a comment on the issue saying what remains.
- The description says which checks ran, and attaches screenshots of every changed screen at desktop and 390px in light and dark.
- A change that plainly has nothing to show for a companion part (docs, analytics, marketing) says so in the description instead of leaving it unmentioned.
- Merge only when the checks pass. Don't skip, disable or quarantine a test to get there.
