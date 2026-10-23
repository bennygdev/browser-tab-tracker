# Tab Tracker

A personal browser extension that records your open tabs, normal and private, so you can get them back after a crash, a blackout, or an accidental close.

> Status: early development.

## What it does

- Saves a snapshot of every window and tab whenever your tabs change (open, close, move, navigate)
- Keeps normal and private tabs apart, so you always know which is which
- Never overwrites history. A crash or a closed window just adds a new snapshot, and the earlier ones stay
- Shows your history by day (dd/mm/yyyy) in an overlay on top of the page you are on, opened from the toolbar icon or `Ctrl+Shift+Y`
- Searches every tab you have had open by title or URL, and lists the tabs you closed
- Restores a whole snapshot, one window, a single tab, or only the tabs you pick, with private tabs going back into private windows
- Keeps a list of recently closed windows, private ones included, with one-click restore
- Offers to bring back lost tabs when the browser starts after a crash
- Writes a silent daily backup to `Downloads/TabTracker/`, and exports or imports your whole history as a file
- Thins out old history once a day so the database stays small, without ever touching recovery points
- Lets you tone down the restore prompt, change the restore defaults and hide the Recently closed strip in Settings
- Pauses recording when you browse something you don't want kept, with a gray toolbar icon while paused

Everything stays on your machine. The extension makes no network requests.

## Tech stack

| Tool                   | Role                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| [WXT](https://wxt.dev) | Extension framework. Builds Chrome and Firefox (both Manifest V3) from one codebase |
| TypeScript             | Language                                                                            |
| React 19               | Dashboard UI                                                                        |
| TanStack Query         | Dashboard data fetching and paging                                                  |
| Tailwind CSS 4         | Styling                                                                             |
| IndexedDB via Dexie    | Local snapshot database                                                             |
| Vitest                 | Unit tests                                                                          |
| ESLint, Prettier       | Linting and formatting                                                              |

## Project structure

```
entrypoints/
  background/     Background script: tracking, snapshots, restore, crash recovery
  overlay.ts      Injected into the current page to show the dashboard as a modal
  dashboard/      Dashboard UI: timeline, snapshot details, recently closed, closed tabs, search, backups, settings
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

### Pausing recording

Pause from the dashboard header or by right-clicking the toolbar icon. While paused:

- Nothing new is saved: no snapshots, no closed tabs, no closed windows. Existing history and the daily backup carry on as before
- The open tabs are saved one last time right before the pause starts
- The toolbar icon turns gray and its tooltip says recording is paused. The pause stays on across browser restarts until you resume

When you resume, tabs on pages you opened while paused stay out of your history. Each one stays out while it is on that site, along with links you open from it, and is recorded again once it goes to another site. Closing it while it is left out keeps it off the closed tabs list too.

### How restore works

- Each window comes back as its own new window in its original mode, so private tabs reopen in a private window
- A single tab or a selection of tabs opens in an existing window of the same mode
- Tabs that are already open are skipped by default, and new tab pages are left out
- When more than 10 tabs come back at once (adjustable in Settings), only the first tab per window loads. The rest stay unloaded until you click them
- Pages extensions are not allowed to open (such as `javascript:` links, or `about:` and `file:` pages in Firefox) are listed with buttons to copy the address or search for it with your default search engine

### How crash recovery works

Browsers close windows one at a time when they shut down, and the extension may save in between. So when a new session starts, it walks back from the previous session's last snapshot through any window closes in its final 30 seconds, and marks the last full state as Before browser closed. A window closed before later activity is left out.

About 15 seconds after the browser starts, if any of those tabs are not open, a notification offers to restore them (Restore and Review buttons in Chrome, click to review in Firefox). The dashboard shows the same session under Recently closed until everything is back or you dismiss it.

The notification shows on every browser start where tabs are missing, including after closing the browser on purpose with private windows open. Settings can limit it to sessions that lost private tabs, or turn it off.

### Backups and history cleanup

Once a day the extension thins out old history and then saves a backup of everything:

- Everything from the last 7 days is kept. Between 7 and 30 days, the last snapshot of each hour is kept for every browser session, and after that the last snapshot of each day. Recovery points are never removed. Closed tabs and windows are kept for 90 days
- The backup goes to `Downloads/TabTracker/<browser>/backup-<weekday>.json` (`chrome` or `firefox`), one file per weekday, so each browser always has its last 7 days on disk
- In Chrome the download bubble is hidden while the backup is saved and the entry is removed from the download list afterwards (the file stays). Firefox has no way to hide it, so its downloads panel may show the backup once a day
- Export in the dashboard saves the same data on demand as `tab-tracker-export-<dd-mm-yyyy>.json`
- Import accepts a backup or an export and merges it into the current history, skipping anything that is already there, so it is safe after a reinstall or on another computer. History is sorted by time, so imported days fall into place

Chrome's background service worker cannot create files, so it hands the data to a small offscreen page that turns it into a downloadable file. Firefox does this in the background script directly.

### Settings

The gear button in the dashboard header opens the settings. Changes are saved right away in `storage.local`.

| Setting                | Default | What it does                                                                                                           |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Restore notification   | Always  | Always, Only when private tabs were lost, or Off. The browser can reopen normal tabs by itself, but never private ones |
| Skip tabs already open | On      | The default for every Restore button. Each snapshot still has its own toggle                                           |
| Lazy restore threshold | 10      | Restoring more tabs than this loads only the first tab of each window                                                  |
| Show Recently closed   | On      | Shows or hides the strip above the timeline                                                                            |

### How the overlay works

Clicking the toolbar icon (or pressing `Ctrl+Shift+Y`) injects `overlay.ts` into the current tab. It adds a full-page iframe of `dashboard.html` inside a shadow root, which keeps the page's CSS and scripts away from the dashboard. Clicking the icon again, pressing Esc, or clicking outside the panel closes it. Esc in the search box clears the search first, and in Settings it goes back to the history.

Browser pages that block injection (the new tab page, `chrome://` and `about:` pages, extension stores) open the dashboard in a small window instead.

The dashboard never opens the database itself. It asks the background script over extension messaging, which works the same when the overlay is open in a private window.

The shortcut can be changed in `chrome://extensions/shortcuts` (Chrome) or under Manage Extension Shortcuts in `about:addons` (Firefox). In Firefox on Windows and Linux, avoid Alt+Shift with a letter: Firefox uses it for its menus (Alt+Shift+H opens Help) and for access keys on web pages.

## Development

Requires Node 22 or newer.

```bash
npm install
npm run dev            # Chrome with live reload
npm run dev:firefox    # Firefox with live reload
npm run build          # outputs .output/chrome-mv3
npm run build:firefox  # outputs .output/firefox-mv3
npm run sign:firefox   # signed .xpi for a permanent Firefox install, see below
npm run compile        # type check
npm test               # unit tests
npm run lint           # ESLint
npm run format         # Prettier, sorts Tailwind classes too
```

`dev` is for working on the code. `build` and `build:firefox` make the minified production build, which is what you install.

## Installing

**Firefox**

Firefox only keeps add-ons that Mozilla has signed. Signing is free, and an unlisted add-on is not published on addons.mozilla.org, it is only signed for your own use.

1. Sign in to [addons.mozilla.org](https://addons.mozilla.org), open the [API key page](https://addons.mozilla.org/developers/addon/api/key/) and generate credentials
2. Put them in a `.env` file in the project root (it is gitignored):
   ```
   WEB_EXT_API_KEY=user:12345678:123
   WEB_EXT_API_SECRET=your-secret
   ```
3. Run `npm run sign:firefox`. It builds the extension, uploads it together with its source code for Mozilla's review, waits for the signature and saves the signed `.xpi` in `web-ext-artifacts/`
4. In Firefox, open `about:addons`, click the gear, choose Install Add-on From File and pick the `.xpi`
5. Allow it to run in private windows when Firefox asks (or later in the extension's Details)

To update, raise `version` in `package.json` (Mozilla signs each version only once), run `npm run sign:firefox` again and install the new `.xpi` the same way. Your history is kept. Removing the extension deletes its history, so export it first if you ever need to reinstall.

While developing you can skip signing: open `about:debugging#/runtime/this-firefox`, click Load Temporary Add-on and pick `.output/firefox-mv3/manifest.json`. Firefox removes it again when it restarts.

**Chrome**

1. Run `npm run build`
2. Open `chrome://extensions` and turn on Developer mode
3. Click Load unpacked and pick `.output/chrome-mv3`
4. Open the extension's Details and turn on Allow in Incognito

Chrome keeps unpacked extensions across restarts, but reads them from that folder, so every new build replaces the installed extension the next time Chrome reloads it.

## Permissions

| Permission                    | Why                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| `tabs`                        | Read tab URLs and titles                                            |
| `storage`, `unlimitedStorage` | Keep the full history without the default size cap                  |
| `activeTab`, `scripting`      | Show the overlay on the current page when you click the icon        |
| `alarms`                      | Daily backup and cleanup, and a periodic consistency check          |
| `contextMenus`                | Pause and resume recording from the toolbar icon's right-click menu |
| `notifications`               | Offer to restore tabs after a crash                                 |
| `search`                      | Search for pages the extension is not allowed to reopen             |
| `downloads`                   | Write backups and exports                                           |
| `downloads.ui` (Chrome)       | Hide the download bubble while the daily backup is saved            |
| `offscreen` (Chrome)          | Turn backup data into a file, since the service worker cannot       |

No host permissions, and nothing runs on a page until you click the icon.
