# Personal Dashboard

A set of small, self-contained HTML apps that share a top bar.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRowanThistlebrooke%2FYTdashh1)

One click → Vercel signs you in, copies the repo to your GitHub, and deploys it. ~30 seconds to a live URL.

## How to use

Open any `.html` file directly in your browser — no build step, no install.

For the private app version with install support and notifications, run it from
localhost:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/index.html`. The bell in the top bar controls
private browser notifications. Settings stay in this browser's `localStorage`;
there is no notification account or public push server.

## Vercel + ntfy.sh push notifications

This repo includes a Vercel serverless function at `api/check-notif.js`.
Use [cron-job.org](https://cron-job.org) to call it every hour:

```txt
https://YOUR-VERCEL-APP.vercel.app/api/check-notif
```

Do not add hourly Vercel Cron config on the Hobby plan. Add these environment
variables in the Vercel dashboard under Project Settings -> Environment
Variables, then redeploy:

| Name | Required | Example |
|---|---:|---|
| `NTFY_TOPIC` | Yes | `your-private-random-topic` |
| `SUPABASE_URL` | Yes | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Yes | `sb_publishable_...` |
| `NOTIF_TIMEZONE` | No | `America/Toronto` |
| `NOTIF_ENABLED` | No | `true` |
| `NOTIF_DAILY_TIME` | No | `20:30` |
| `NOTIF_WATER_HOURS` | No | `10,13,16,19` |
| `NOTIF_WAKE_HOUR` | No | `7` |

Verify after deployment:

1. Open `/api/check-notif?test=1` and confirm a phone notification arrives.
2. Open `/api/check-notif?debug=1` and check `currentHour`, `enabled`, and `due`.
3. Open `/api/check-notif` and confirm it returns `ok`.

| File | What it is |
|---|---|
| [index.html](index.html) | Goals tracker (Day Ring, Goal Ticker, To Do list) — the home page |
| [health.html](health.html) | Supplement / daily stack tracker |
| [po-water.html](po-water.html) | Water intake tracker |
| [finance.html](finance.html) | Finances |
| [gym.html](gym.html) | Progressive overload gym tracker |
| [topbar.js](topbar.js) | Shared top bar — auto-injected into pages that `<script src="topbar.js">` |
| [manifest.webmanifest](manifest.webmanifest) | Installable private app metadata |
| [sw.js](sw.js) | Offline cache + notification click handling |
| [pwa.js](pwa.js) | Service worker registration + notification helper |
| [icon-192.png](icon-192.png), [icon-512.png](icon-512.png) | Home-screen app icons |

Each app stores its own state in browser `localStorage`. No accounts, no server.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
