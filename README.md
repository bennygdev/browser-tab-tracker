# Tab Tracker

A personal browser extension that records your open tabs, normal and private, so you can get them back after a crash, a blackout, or an accidental close.

> Status: early development. Not everything below is built yet.

## What it does

- Saves a snapshot of every window and tab whenever your tabs change (open, close, move, navigate)
- Keeps normal and private tabs apart, so you always know which is which
- Never overwrites history. A crash or a closed window just adds a new snapshot, and the earlier ones stay
- Shows your history by day (dd/mm/yyyy) in an overlay on top of the page you are on
- Restores a whole snapshot, one window, or only the tabs you pick, into a normal or private window
- Offers to bring back lost tabs when the browser starts after a crash
- Writes a silent daily backup to `Downloads/TabTracker/`

Everything stays on your machine. The extension makes no network requests.

## Tech stack

| Tool | Role |
| --- | --- |
| [WXT](https://wxt.dev) | Extension framework. Builds Chrome and Firefox (both Manifest V3) from one codebase |
| TypeScript | Language |
| React 19 | Dashboard UI |
| Tailwind CSS 4 | Styling |
| IndexedDB via Dexie | Local snapshot database |

## Project structure

```
entrypoints/
  background.ts   Background script: tracks tabs, opens the dashboard
  overlay.ts      Injected into the current page to show the dashboard as a modal
  dashboard/      Dashboard UI
lib/              Code shared between entrypoints
assets/icon.svg   Toolbar icon source, PNG sizes are generated at build time
```

### How the overlay works

Clicking the toolbar icon injects `overlay.ts` into the current tab. It adds a full-page iframe of `dashboard.html` inside a shadow root, which keeps the page's CSS and scripts away from the dashboard. Clicking the icon again, pressing Esc, or clicking outside the panel closes it.

Browser pages that block injection (the new tab page, `chrome://` and `about:` pages, extension stores) open the dashboard in a small window instead.

## Development

Requires Node 22 or newer.

```bash
npm install
npm run dev            # Chrome with live reload
npm run dev:firefox    # Firefox with live reload
npm run build          # outputs .output/chrome-mv3
npm run build:firefox  # outputs .output/firefox-mv3
npm run compile        # type check
```

## Loading the extension

**Chrome**

1. Run `npm run build`
2. Open `chrome://extensions` and turn on Developer mode
3. Click Load unpacked and pick `.output/chrome-mv3`
4. Open the extension's Details and turn on Allow in Incognito

**Firefox**

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click Load Temporary Add-on and pick `.output/firefox-mv3/manifest.json`
4. In `about:addons`, open the extension and set Run in Private Windows to Allow

Temporary add-ons are removed when Firefox restarts. A permanent install comes later.

## Permissions

| Permission | Why |
| --- | --- |
| `tabs` | Read tab URLs and titles |
| `storage`, `unlimitedStorage` | Keep the full history without the default size cap |
| `activeTab`, `scripting` | Show the overlay on the current page when you click the icon |
| `alarms` | Daily backup and a periodic consistency check |
| `notifications` | Offer to restore tabs after a crash |
| `downloads` | Write backups to `Downloads/TabTracker/` |

No host permissions, and nothing runs on a page until you click the icon.
