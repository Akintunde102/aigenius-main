# Public page design

Use this when a page shows an existing product surface to guests. Published conversations are the reference. Match the product. Do not invent a new visual system.

## Reference

- Use the signed-in conversation page as the visual source of truth.
- Reuse its theme tokens, user bubbles, and flat assistant transcript.
- Light and dark must both be readable. Never force a dark plate in light mode.
- Keep the site header. Fix its spacing if a global reset is wiping padding. Do not restyle it into a new header.

The site header lives in `PublicPageShell` / `home.css`. `home.css` is unlayered. A reset written as `.home-root *:not(#main-content *)` counts as an ID and beats `.nav` padding, so the header sits flush to the edges. Keep that reset inside `:where()` so `.nav` and `.footer` padding win. Tailwind spacing inside `#main-content` must stay stronger than the reset.

## Access

- The page and its read API must work with no login. Guests and crawlers get the content.
- Publish, unpublish, edit, replay, and delete stay owner-only, or are omitted.
- Guests can sign in, share, copy, download, switch light/dark, and jump to questions.

Next middleware already treats public prefixes such as `/published-conversations` as public. The gateway read routes must actually skip auth. Nest `path-to-regexp` does not treat `*` as a segment wildcard, so an exclude like `gateway/*/public/...` still demands a token. Use `gateway/:slug/public/...`. Do not depend on a logged-in render cache.

## First screen

- The conversation chrome is one line: title, author, date, count, and icon actions.
- The first message is visible immediately. Do not stack a breadcrumb, a large title, a description, and an outline above the transcript.
- Keep the outline as a menu on that line, not a card that pushes the conversation down.
- Breadcrumb and description can stay for screen readers and metadata. They must not take vertical space.

## SEO

- Server-render the title, description, canonical URL, Open Graph, Twitter card, and JSON-LD.
- JSON-LD: Article, BreadcrumbList, and FAQPage from the real turns.
- Add the page to the sitemap. Allow it in robots.txt.
- Do not depend on a logged-in cache. An unauthenticated request must return the content.

## Check

- Open the page with no cookies. Confirm it does not redirect to login and the transcript is in the HTML.
- Check light and dark, and a narrow width. The one-line bar must not wrap into a second header, and the site header must keep its inset.
- Confirm owner actions still require a signed-in owner.
