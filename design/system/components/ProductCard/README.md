# ProductCard

The card for one game box in listings and collections; hovering lifts the card, tilts the lid open and a question card peeks out.

- **Consumer provides:** product art (a square image; the placeholder box art is used until the client's photos arrive), age chip, audience chip, name (display-3), a one-line "what's in the box", price, and the action.
- **Out of season** (Ramadan box outside its window): keep it visible, replace the price row with a `dc-product__note` in `red-text` and an outline "notify me" button — never hide the product.
- Art grounds alternate `pink` / `sky`; don't use photos on a blue ground.
- The lid and peek motion only runs on hover-capable pointers; reduced-motion cuts it.
