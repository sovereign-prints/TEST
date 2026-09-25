# Fynbos Studio (placeholder name)

A one-page website for a custom web design business. It's written in plain HTML, CSS and JavaScript, with no frameworks, page builders or build step.

## Preview

From the repo root:

```sh
python3 -m http.server 8000
# open http://localhost:8000/agency/
```

Serve from the repo root, not from inside `agency/`, because the portfolio section embeds `../public/index.html` (the Overberg Wool Co. site) as a live preview.

## Before going live

- **Name:** search and replace `Fynbos Studio` / `Fynbos` in `index.html`.
- **Email:** replace `hello@example.com` in `index.html` and `assets/js/studio.js`.
- **Prices:** the figures in the Pricing section are starting points. Adjust them to your own rates.
- **Portfolio link:** once the wool shop has its own domain, point the iframe `src` and the "View the live site" link at it.

## How it's built

- `assets/css/studio.css`: the palette lives in `:root` tokens and every drawing uses them. It's light only: off-white paper, near-black ink, sea-blue and sage washes, one deep sea-blue highlight, and no orange.
- **Phones:** one swipe moves exactly one full-screen section (CSS scroll-snap). Rows of cards become sideways carousels with dots, so every section fits one screen from 360×740 up. A compact tier handles short phones like the iPhone SE.
- The hero is a "pop-up book" of seven SVG layers at different 3D depths (`--z`). They tilt with the mouse, sway on their own on touch screens, and a southern right whale, drawn as a black ink line drawing, breaches in 3D.
- **4D section:** a tesseract (a four-dimensional cube) rotates live through the fourth dimension and is projected to the page as ink lines. Visitors can drag to spin it. It's plain SVG plus about 100 lines in `studio.js`, it pauses when off-screen, and it shows a still frame under reduced motion.
- Flip cards, pointer-tilt cards, scroll-unfolding sections and a browser mock-up that swings flat as you scroll to it are all done in CSS 3D plus `assets/js/studio.js`.
- All motion switches off for visitors who have "reduce motion" turned on.
