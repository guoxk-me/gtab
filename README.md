# gtab

[简体中文](./README.zh-CN.md)

`gtab` is a personal new tab page built with Vue 3, TypeScript, and Vite+.

It replaces the browser new tab page with a local-first dashboard focused on three things:

- Search
- Quick links
- A clean animated background

## Features

- Meteor shower canvas background with star field
- Search bar with multiple search engines
- Quick links with local persistence
- Built-in clock widget
- Settings panel stored in `localStorage`
- Chrome extension new tab override via Manifest V3

## Tech Stack

- Vue 3
- TypeScript
- Vite+
- Chrome Extension Manifest V3

## Project Structure

```text
.
├── public/manifest.json
├── src/App.vue
├── src/canvas/MeteorShower.ts
├── src/components/
├── src/composables/useStorage.ts
└── vite.config.ts
```

## Development

Install dependencies:

```bash
vp install
```

Start the dev server:

```bash
vp dev
```

Build the extension:

```bash
vp build
```

Run checks:

```bash
vp check
```

## Load In Chrome

1. Run `vp build`.
2. Open `chrome://extensions/`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select the `dist/` directory.

## Data Storage

Settings are stored locally in browser storage through `localStorage` using the key `gtab_settings`.

There is no backend, sync, or account system.

## Notes

- This project is designed for personal use.
- The extension currently does not include packaged icon assets.
- `public/manifest.json` is copied to `dist/` during build.

## License

Private / personal project.
