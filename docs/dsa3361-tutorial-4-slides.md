# DSA3361 Tutorial 4 HTML slides

Source: `static/slides/dsa3361-tutorial-4/`.

Preview with Hugo at `/slides/dsa3361-tutorial-4/`. Hugo copies the directory
unchanged. No homepage, Teaching listing, menu or sitemap entry is added.
The HTML includes a `noindex, nofollow` request to search engines. This is an
unlisted public page, not access control. The existing GitHub Pages workflow
publishes it with the next deployment.

## Presenting

- Left/right arrows or Page Up/Page Down: previous/next slide.
- Space: next slide, except when a button or disclosure has keyboard focus.
- C: contents. The four contents items are clickable.
- F: browser full screen. Home/End: first/last slide.
- N: show/hide speaker notes. Escape closes notes.
- Code with a green triangle opens an explanation on the right.
- The red outlined plotting code advances the plotting animation.
- Navigating between slides preserves animation state. Use the animation's
  own Restart/Reset button to start over.

Notes appear in an overlay in the same window, so they are visible on the
projector if that window is shared. They are not a separate presenter view.

The canvas scales as a single 1600 × 900 slide. The controls sit outside the
slide. All required JavaScript, CSS, fonts and logo assets are local; no CDN
connection is needed for the slides. The final companion link opens the
separate Tutorial 4 article.

## Editing

- `index.html`: all 16 slides, equations (`data-math`), and speaker notes.
- `deck.css`: slide layouts and projection sizing.
- `deck.js`: navigation, math rendering, and code explanations.
- `components.js` / `components.css`: snapshots of the three interactive
  demonstrations from `content/teaching/dsa3361-tutorial-4/index.md`, with
  slide-specific CSS overrides in `deck.css`.
- `assets/nus-crest.svg`: existing repository NUS asset with its SVG viewBox
  restricted to the crest; artwork paths are unchanged.
- `vendor/katex/`: the site's existing KaTeX runtime, local WOFF2 fonts, and
  upstream MIT license. No package installation is required.

The article and slide deck deliberately have separate layouts and prose.
Edits to an article animation do not automatically change the slide version.
If updating a demonstration, carry over its HTML, CSS and JavaScript together,
then check both its initial state and every interaction. Keep the plotting
code's `.line` wrappers: they provide its click targets and copy boundaries.

## Data and scope

The fixed examples use the article's seed-123 sample and fitted coefficients.
The plotting animation displays its first eight observations, but predictions
use the fit to all 100. The variance experiment holds x fixed, draws fresh
errors and refits the quadratic model. Reset restores the original sample.
The summary table is a selected output, not a live Python execution.

The cover and contents follow the two user-provided screenshots. Course and
topic text are replaced with DSA3361 Tutorial 4; the deck covers the individual
task rather than the mini-lecture. The cover uses AY 2026/27 Semester 1 and
does not invent a tutorial date.
