# QuestionCard

The brand's signature interaction: a square game card that deals in and flips to reveal a question or challenge — the website's version of drawing a card at the table.

- **Front:** `sky` or `pink` square with the red disc naming the card type («سؤال», «تحدّي», «مين فينا؟»), like the physical cards.
- **Back:** `surface` with the kicker in blue and the question in body-lg semibold, written in warm Levantine Arabic.
- Flip on click/Enter (it is a `button` with `aria-pressed`), never on hover alone. Deal-in: wrap a set in `dc-deal` (staggered 90ms).
- Use on the home page ("draw a card"), product pages (sample questions), the Journey and empty states. Max three on screen.
- Sample questions shown here are illustrative, not the client's card text.
