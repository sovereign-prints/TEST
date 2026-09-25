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

- `assets/css/studio.css`: the Sketchbook Coast palette (light only) lives in `:root` tokens, and every drawing uses those tokens.
- The hero is a "pop-up book" of seven SVG layers at different 3D depths (`--z`). They tilt with the mouse, sway on their own on touch screens, and a southern right whale breaches in 3D.
- Flip cards, pointer-tilt cards, scroll-unfolding sections and a browser mock-up that swings flat as you scroll to it are all done in CSS 3D plus `assets/js/studio.js`.
- All motion switches off for visitors who have "reduce motion" turned on.
