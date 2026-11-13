# Deploying technyah.com on Cloudflare

Everything here runs on Cloudflare's free plan. Do Part A first; the site works after it.
Parts B to D switch on extras one at a time. `https://YOUR-SITE/api/health` shows what is on.

## Part A. Put the site online (about 10 minutes)

The site runs as a Cloudflare **Worker** (`wrangler.jsonc` + `src/worker.js`). The build runs by itself on every deploy.

1. GitHub repository → **Add file → Upload files** → drag in everything inside this folder
   (`build.mjs`, `package.json`, `wrangler.jsonc`, `content`, `functions`, `public`, `src`, `tools`, the two .md files) → **Commit changes**.
   The old site's files can stay; they are ignored. Delete the old `CNAME` file if there is one.
2. Check the Worker's name: Cloudflare → **Workers & Pages** → the name in the list. If it is not `technyah`,
   change the `"name"` line in `wrangler.jsonc` to match (edit it in GitHub with the pencil icon).
3. The upload starts a build by itself. Watch it in the Worker → **Deployments** (or **Builds**).
   A good log shows `[custom build] built 24 indexable pages` and ends with a `workers.dev` address. Open it.
4. If the Worker's **Settings → Build** has a *Build command*, leave it empty. *Deploy command* stays `npx wrangler deploy`.

## Part B. Switch on the contact system

Each step is independent. Secrets: Worker → **Settings → Variables and Secrets → Add → Secret**. They survive every deploy.

| # | What it gives you | How | Name |
|---|---|---|---|
| 1 | Every message saved with a reference number | **Storage & Databases → D1** → create `technyah` → copy its ID into the `d1_databases` line of `wrangler.jsonc`, remove the `//` in front, commit | `DB` |
| 2 | Resumes and drawings saved | **Storage & Databases → KV** → create `technyah-files` → copy its ID into the `kv_namespaces` line, remove the `//`, commit | `FILES` |
| 3 | The private inbox at `/admin/` | Secret, 32 or more random characters | `ADMIN_TOKEN` |
| 4 | Emails to info@, hr@ and mhadid@, with Reply-To set to the sender, plus a confirmation to the sender | Free account at resend.com, add the domain `technyah.com`, add the DNS records it lists, create an API key, save it as a Secret | `RESEND_API_KEY` |
| 5 | Spam check on every form | **Turnstile → Add widget** for `technyah.com`. Put the *site key* in `content/site.json` (`turnstileSiteKey`) and commit. Save the *secret key* as a Secret | `TURNSTILE_SECRET` |

Step 4 alone is enough for forms to work (email only). The table is created automatically on the first message.

Optional plain variables: `MAIL_TO` (default info@technyah.com), `MAIL_HR` (hr@technyah.com), `MAIL_CC` (mhadid@technyah.com),
`MAIL_FROM` (`TECHNYAH <info@technyah.com>`), `SITE_URL`, `SEND_CONFIRMATION=off`.

## Part C. Move technyah.com to Cloudflare

1. Cloudflare → **Add a domain** → `technyah.com` → Free plan.
2. **Before changing nameservers**, compare the imported DNS records with your current ones. The `MX` and `TXT` records carry your email; if one is missing, add it.
3. At your registrar, switch to the two Cloudflare nameservers.
4. GitHub repository → **Settings → Pages** → remove the custom domain.
5. Worker → **Settings → Domains & Routes → Add → Custom domain** → `technyah.com`, then `www.technyah.com`.
6. Optional: **Rules → Redirect Rules** → redirect `www.technyah.com/*` to `https://technyah.com/$1` (301).

## Part D. Get found

1. Google Search Console → add `technyah.com` → verify by DNS → submit `https://technyah.com/sitemap.xml`. Do the same in Bing Webmaster Tools.
2. Create a Google Business Profile for the Lakeland address and link the site.
3. Cloudflare → **Web Analytics** → add `technyah.com` (free, no cookie banner needed).
4. Add your street address, phone and LinkedIn URL to `content/site.json` when you are ready to publish them. They flow into the pages and the search-engine data.

## Day to day

| To do this | Do this |
|---|---|
| Change a service, industry, product or job | Edit the file in `content/`, push |
| Change what NURA answers | Edit `content/kb.json`, push. The FAQ page updates too |
| Use the logo you picked | `npm install` once, then `npm run logo apply 7` (your number), push |
| Add the photos | `npm run photos` on your computer, look at each one, push. Illustrations show until then |
| Preview on your computer | `npm install`, then `npx wrangler dev` and open http://localhost:8787 |
| Undo a bad release | Worker → **Deployments** → the last good one → **Rollback** |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Could not detect a directory containing static files" | `wrangler.jsonc` is not at the top of the repository. Upload the files themselves, not the `technyah-site` folder, or set the Worker's **Settings → Build → Root directory** to that folder name |
| "The name in your wrangler.jsonc does not match" | Part A step 2: make `"name"` match the Worker's name |
| `/api/health` shows `storage: false` after creating D1 | The ID is not in `wrangler.jsonc`, or the `//` is still in front of the line |
| Build fails with "node: not found" or a syntax error | `NODE_VERSION` is missing. Set it to `22` and retry |
| technyah.com still shows the old site | DNS still points to GitHub. Finish Part C steps 3 to 5 and wait for the nameserver change |
| Form says "not able to deliver messages right now" | Neither storage nor email is configured. Check `/api/health`, then Part B steps 1 or 4 |
| Messages are saved but no email arrives | `email: false` → add `RESEND_API_KEY`. If `true`, the domain is not verified in Resend, or `MAIL_FROM` is not on that domain. Worker → **Observability → Logs** shows the reason |
| Email stopped after moving DNS | An `MX` or `TXT` record was not carried over. Re-add it (Part C step 2) |
| "The spam check did not pass" on every send | The site key and secret key are from different Turnstile widgets, or the widget does not list your domain |
| Inbox says "switched off" | `ADMIN_TOKEN` is missing or shorter than 16 characters |
| Inbox says "token was not accepted" | Paste the exact secret value |
| "File did not come through" after an upload | `FILES` is not set up (Part B step 2), or the file is over 10 MB |
| A page works on workers.dev but not on technyah.com | The custom domain is still "verifying". It finishes once nameservers have switched |
| Search or NURA shows nothing | `search-index.json` or `assistant.json` did not build. Run `npm run build` locally and read the last line |

## Security already in place

- HTTPS only, with a strict content security policy, no inline scripts, no third-party fonts or trackers (`public/_headers`).
- Honeypot field, timing check and optional Turnstile on every form; file type and size limits on uploads.
- The inbox API is closed unless `ADMIN_TOKEN` is set; uploads are readable only through it.
- No secrets live in this repository. Never commit a key.
- Recommended extra: **Zero Trust → Access** → protect `technyah.com/admin*` with your email (free up to 50 users), and one **WAF rate limiting rule** on `/api/submit`.

## Free-plan limits (checked November 2026)

Pages: 500 builds a month, 100 custom domains per project, 20,000 files per site. Functions share the Workers free allowance of 100,000 requests a day.
D1: 5 GB and 100,000 rows written a day. KV: 1 GB and 1,000 writes a day. Resend: 3,000 emails a month, 100 a day.
Sources: developers.cloudflare.com/pages/platform/limits · developers.cloudflare.com/workers/platform/pricing · resend.com/pricing
