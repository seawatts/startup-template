# Buttons for actions, links for words

A text link doesn't call anyone in, so an action or a card's next step is a button. Decide by what the click does and where it sits, and keep at most two visible buttons per card; any more go in a "…" menu.

- Primary button (default variant): the one thing a page, card, empty state, dialog or notice asks for, such as create, start, send, connect, approve or continue. One per card.
- Secondary button (`outline`, size `sm`): the second action beside the primary, or a "go do it" link that ends a card, tile, notice, banner or empty state.
- Ghost button (`ghost`, size `sm`, with an arrow icon when it navigates): "View all" in card and section headers, show more/fewer toggles, toolbars, repeated row actions, and quiet actions such as Try again and Clear filters.
- Text link: words inside a sentence, citations and sources, docs cross-references and "Learn more" after explanatory copy, names and titles that open their row's page, breadcrumbs, back links, nav, footer and legal.
- Two buttons side by side never look the same: one is primary, the other outline or ghost.
- Opt-outs stay quiet: a choice we don't want to steer people towards (Skip, Not now, Maybe later) is a muted text link or ghost button after the real actions, never a button that competes with them.
- Never a text link otherwise: anything that changes data (Undo, Retry, Remove, Copy) or opens a dialog is a button. When such an action sits in a sentence, end the sentence and put a button after it. No `variant="link"` or underlined `<button>` for these.
- Empty states: the description is prose; the action is a button.
- Marketing: a hero or closing panel pairs the primary call to action with a secondary button, never a text link.
- Email: the main next step is a button, at most two per section. Help, privacy and settings stay small links in the footer.
