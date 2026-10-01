# Tab Tracker

A personal browser extension that records your open tabs, normal and private, so you can get them back after a crash, a blackout, or an accidental close.

> Status: early development.

## What it does

- Saves a snapshot of every window and tab whenever your tabs change (open, close, move, navigate)
- Keeps normal and private tabs apart, so you always know which is which
- Never overwrites history. A crash or a closed window just adds a new snapshot, and the earlier ones stay
- Shows your history by day (dd/mm/yyyy) in an overlay on top of the page you are on, opened from the toolbar icon or `Alt+Shift+H`
- Searches every tab you have had open by title or URL, and lists the tabs you closed
- Restores a whole snapshot, one window, a single tab, or only the tabs you pick, with private tabs going back into private windows
- Keeps a list of recently closed windows, private ones included, with one-click restore
- Offers to bring back lost tabs when the browser starts after a crash
- Writes a silent daily backup to `Downloads/TabTracker/`, and exports or imports your whole history as a file
- Thins out old history once a day so the database stays small, without ever touching recovery points

Everything stays on your machine. The extension makes no network requests.

## Tech stack

| Tool | Role |
| --- | --- |
| [WXT](https://wxt.dev) | Extension framework. Builds Chrome and Firefox (both Manifest V3) from one codebase |
| TypeScript | Language |
| React 19 | Dashboard UI |
| TanStack Query | Dashboard data fetching and paging |
| Tailwind CSS 4 | Styling |
| IndexedDB via Dexie | Local snapshot database |
| Vitest | Unit tests |

## Project structure

```
entrypoints/
  background/     Background script: tracking, snapshots, restore, crash recovery
  overlay.ts      Injected into the current page to show the dashboard as a modal
  dashboard/      Dashboard UI: timeline, snapshot details, recently closed, closed tabs, search, backups
  offscreen/      Chrome only: turns backup data into a file the background script can download
lib/              Code shared between entrypoints (types, messaging, formatting, search)
tests/            Unit tests
assets/icon.svg   Toolbar icon source, PNG sizes are generated at build time
```

### How tracking works

- Tracking starts the moment the extension is installed or enabled, with a snapshot of whatever is open
- Every tab or window change (open, close, move, navigate, pin) schedules a snapshot. Bursts are grouped, so opening 10 tabs at once saves one snapshot
- A snapshot is only saved when the set of open tabs actually changed. Title-only changes refresh the latest snapshot instead of adding a new one
- Snapshots are never replaced, and an empty state is never saved. Old history is only thinned by the daily cleanup below
- Each browser launch starts a new session, detected through `storage.session` (which the browser clears on restart). The previous session's last snapshot is kept as is, so tabs lost in a crash are still there
- Recovery points are marked as Before window closed, Before tabs closed (5 or more at once) or Before browser closed
- Tabs you close one at a time go to a closed tabs list. Closed windows are kept with all their tabs and show up under Recently closed until they are open again

### How restore works

- Each window comes back as its own new window in its original mode, so private tabs reopen in a private window
- A single tab or a selection of tabs opens in an existing window of the same mode
- Tabs that are already open are skipped by default, and new tab pages are left out
- When more than 10 tabs come back at once, only the first tab per window loads. The rest stay unloaded until you click them
- Pages extensions are not allowed to open (such as `javascript:` links, or `about:` and `file:` pages in Firefox) are listed with buttons to copy the address or search for it with your default search engine

### How crash recovery works

Browsers close windows one at a time when they shut down, and the extension may save in between. So when a new session starts, it walks back from the previous session's last snapshot through any window closes in its final 30 seconds, and marks the last full state as Before browser closed. A window closed before later activity is left out.

About 15 seconds after the browser starts, if any of those tabs are not open, a notification offers to restore them (Restore and Review buttons in Chrome, click to review in Firefox). The dashboard shows the same session under Recently closed until everything is back or you dismiss it.

### Backups and history cleanup

Once a day the extension thins out old history and then saves a backup of everything:

- Everything from the last 7 days is kept. Between 7 and 30 days, the last snapshot of each hour is kept for every browser session, and after that the last snapshot of each day. Recovery points are never removed. Closed tabs and windows are kept for 90 days
- The backup goes to `Downloads/TabTracker/backup-<weekday>.json`, one file per weekday, so the last 7 days are always on disk
- In Chrome the download bubble is hidden while the backup is saved and the entry is removed from the download list afterwards (the file stays). Firefox has no way to hide it, so its downloads panel may show the backup once a day
- Export in the dashboard saves the same data on demand as `tab-tracker-export-<dd-mm-yyyy>.json`
- Import accepts a backup or an export and merges it into the current history, skipping anything that is already there, so it is safe after a reinstall or on another computer. History is sorted by time, so imported days fall into place

Chrome's background service worker cannot create files, so it hands the data to a small offscreen page that turns it into a downloadable file. Firefox does this in the background script directly.

### How the overlay works

Clicking the toolbar icon (or pressing `Alt+Shift+H`) injects `overlay.ts` into the current tab. It adds a full-page iframe of `dashboard.html` inside a shadow root, which keeps the page's CSS and scripts away from the dashboard. Clicking the icon again, pressing Esc, or clicking outside the panel closes it. Esc in the search box clears the search first.

Browser pages that block injection (the new tab page, `chrome://` and `about:` pages, extension stores) open the dashboard in a small window instead.

The dashboard never opens the database itself. It asks the background script over extension messaging, which works the same when the overlay is open in a private window.

The shortcut can be changed in `chrome://extensions/shortcuts` (Chrome) or under Manage Extension Shortcuts in `about:addons` (Firefox).

## Development

Requires Node 22 or newer.

```bash
npm install
npm run dev            # Chrome with live reload
npm run dev:firefox    # Firefox with live reload
npm run build          # outputs .output/chrome-mv3
npm run build:firefox  # outputs .output/firefox-mv3
npm run compile        # type check
npm test               # unit tests
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
| `alarms` | Daily backup and cleanup, and a periodic consistency check |
| `notifications` | Offer to restore tabs after a crash |
| `search` | Search for pages the extension is not allowed to reopen |
| `downloads` | Write backups and exports |
| `downloads.ui` (Chrome) | Hide the download bubble while the daily backup is saved |
| `offscreen` (Chrome) | Turn backup data into a file, since the service worker cannot |

No host permissions, and nothing runs on a page until you click the icon.
