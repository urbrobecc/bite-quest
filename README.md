# Bite Quest NYC

A food discovery game that helps people find independent NYC restaurants through their food, people, and stories.

Explore a stylized 3D New York map with a rat chef companion, discover restaurants, collect illustrated cuisine stamps, and share a food passport with friends.

## Features

- Interactive Three.js map with NYC building geometry and restaurant markers.
- Restaurant stories, signature dishes, directions, and a want-to-try list.
- Cuisine badges, trails, XP, and downloadable passport cards.
- Lunchboxes progressed by foreground GPS walking.
- Progress saved locally in the browser.

## Run locally

With Python 3 installed, run from this folder:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173 in your browser. No build step or npm install is required. The app includes its Three.js dependencies in `dist/vendor`.

## Project structure

- `dist/world.js`: 3D map and character rendering.
- `dist/app.js`: screens, interactions, and local progress.
- `dist/businesses.js`: restaurant content.
- `dist/story-content.js`: cuisine artwork mappings and progression content.
- `dist/passport.js`: passport cards and sharing.
- `dist/walking.js`: GPS walking progress.
- `docs/STORY.md`: project mission.

## Prototype status

This is a hackathon prototype. Logged bites are self-reported; they do not verify purchases. Sample offers and demo rarity information are not verified merchant promotions or a citywide census. Progress stays on the current browser/device; there is no shared social backend. GPS features require browser permission and a secure context (HTTPS or localhost).

## Credits

Map sources include NYC Open Data and OpenStreetMap. Existing in-app source references are retained. Third-party Three.js licensing is included in `dist/vendor/THREE-LICENSE.txt`.
