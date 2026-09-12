# Echo Master Boss Board

A lightweight shared dashboard for tracking **class master** boss respawns in SpiritVale. It is built for a small hunting group (about six people), not a game-wide platform.

The board tracks seven masters across **6 servers** and **3 channels**:

- Berserker Master
- Gunslinger Master
- Necromancer Master
- Paladin Master
- Priest Master
- Shinobi Master
- Wizard Master

Servers: **NA, Europe, Asia, South America, SEA, OCE**.

## How timers work

When a master dies it is down for **60 minutes**. After that it can spawn anywhere from **1 second to 30 minutes**. The board stores the kill time and derives everything else from **your computer clock**:

| Time since kill | Status |
| --- | --- |
| 0:00 – 60:00 | Dead. Countdown to the spawn window. |
| 60:01 – 90:00 | Spawn window. The boss can appear at any moment. |
| 90:00 – 120:00 | Overdue. It should already be up. |
| After 120:00 | Stale. Grey. The kill report has been overdue for 30 minutes. |

**Scouted just now** marks the boss **Alive** (seen up). Alive stays in Hunt now for **30 minutes**, then turns Stale. Stale scouts show **Scouted** instead of **Died**.

Hunt now lists alive scouts, overdue bosses for **30 minutes**, open windows, and dead bosses whose window opens in **5 minutes or less**. Open windows count **up** from 0:01 for how long they have been available; the grid still shows time until the guaranteed spawn. After 30 minutes overdue or 30 minutes after a scout, the report turns Stale on the grid and leaves Hunt now.

Kill times are saved as UTC and shown in each player's local timezone. That is why a player in NA and a player in SEA can look at the same board and still see times that match their own PCs.

## Stack (and why it is this light)

GitHub Pages can only host static files. There is no Node server, database, or login system.

| Piece | Choice | Why |
| --- | --- | --- |
| App | Vite + React + TypeScript | Fast static SPA that deploys cleanly to GitHub Pages. |
| UI | Tailwind + shadcn/ui | Enough structure for a dashboard without a heavy design system. |
| Time | `Date.now()` in the browser | Uses each player's computer clock. |
| Local cache | `localStorage` | The board still works if the network drops. |
| Shared store | [MantleDB](https://mantledb.sh) | Persists the board so people can join later or refresh. |
| Live updates | WebRTC via [Trystero](https://github.com/dmotz/trystero) + `BroadcastChannel` | A kill is pushed to everyone currently on the party link immediately. |

Next.js, auth, and a custom backend would be wasted weight here. The live data is 126 possible timers (7 × 6 × 3) and a handful of concurrent editors.

Anyone with the party link can read and write. That matches a private Discord pin, not a public internet service.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run build
npm run preview
```

## Use it with your party

1. Open the site and set **Your character name**.
2. Click a boss channel and enter the tombstone time, or **right-click** the cell to log it as killed now. In the dialog, use **Killed just now**, **Minutes ago**, or the **clock time on the tombstone**.
3. Click **Share board** and copy the party link into Discord.
4. Everyone else opens **that same link** and leaves it open. New kills are pushed to the party immediately. Click **Live** to see who is connected; players with no name show as *Anonymous*.
5. **Leave board** drops the party link and returns you to the local site. Your timers stay on this computer; they are no longer synced.

JSON export/import is a backup only. Importing a file does **not** subscribe you to later reports.

## GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages → GitHub Actions**.
3. The workflow in `.github/workflows/github-pages.yml` builds and deploys `dist/` on every push to `main`.

The Vite `base` is `./`, so the app works at both `https://<user>.github.io/<repo>/` and a custom domain.

Shared board state is **not** stored in the GitHub repo. The Pages site is only the UI. Timer data lives in the shared MantleDB namespace created when you copy a party link. Claimed boards stay around for 90 days of inactivity.

## Assumptions

- Tombstone times are entered in the player's local clock. If a grave shows a different timezone, convert it before saving.
- Channels are 1–3 on each listed server.

If those are wrong, the timer math and boss list are isolated in `src/lib/game.ts` and `src/lib/timers.ts`.
