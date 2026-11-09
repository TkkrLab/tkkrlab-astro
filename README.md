# tkkrlab.nl

The website of TkkrLab, the hackerspace in Enschede. Built with
[Astro](https://astro.build) and edited with [Sveltia CMS](https://sveltiacms.app).
All content lives as files in this repo: there is no database and no PHP. The web
server serves prebuilt HTML, CSS and images; only CMS sign-in (`/oauth/*`) runs on
the server.

## Run locally

```sh
npm install
npm run dev
```

- Site: http://localhost:4321
- CMS: http://localhost:4321/admin/ (in Chrome or Edge, click *Work with Local
  Repository* and pick this repo's folder)

Locally, the CMS writes directly to the files in `src/content` and `src/data`.
Commit and push your changes with git afterwards.

## Where things live

| What | Where | URL |
| --- | --- | --- |
| Blog posts | `src/content/posts/*.mdoc` | `/blog/<slug>/` |
| Pages | `src/content/pages/*.mdoc` | `/<slug>/` |
| Projects | `src/content/projects/*.mdoc` | `/projecten/<slug>/` |
| Tools (workshop) | `src/content/tools/*.mdoc` | `/gereedschap/<slug>/` |
| Cybersaturdays | `src/content/cybersaturdays/*.mdoc` | `/cybersaturdays/<slug>/` |
| Homepage | `src/data/home.yaml` | `/` |
| Menu, address, socials | `src/data/settings.yaml` | everywhere |
| Images | `public/images/<collection>/<slug>/` | |
| Manuals (PDF) | `public/files/` | |

A page with a listing set (for example `blog`, `projecten` or `gereedschap`)
automatically shows cards for that collection below its text.

Besides regular Markdown, two custom blocks are available in the text:

- `{% button href="/deelnemer-worden/" label="Kom langs" /%}`
- `{% youtube id="g5ib6TEji5o" /%}`, which only loads anything from YouTube once
  someone clicks play

The open/closed status in the header comes live from the SpaceAPI
(`spaceapi.tkkrlab.nl`).

## Build and hosting

```sh
npm run build                # outputs dist/client (static) and dist/server (Node)
node dist/server/entry.mjs
```

The site runs as a single Node container, see `Dockerfile` (port 8080, or `PORT`).
Old WordPress URLs (`/wikiwiki/…`, `/project/…`, blog posts in the root) are listed
in `src/data/redirects.json` and built as redirects.

On every push to `main`, `.github/workflows/deploy.yml` builds the container,
publishes it to GHCR and rolls it out on Greybull. This needs the repo secret
`GREYBULL_API_KEY` (scope `services:write`) and the repo variable `GREYBULL_APP`.

## Editing online

The admin at `/admin/` ships with the site, and GitHub sign-in goes through
`/oauth/*` (`src/pages/oauth/[action].js`, using the
[Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)). To set it
up, create a GitHub OAuth App with the callback URL
`https://<site hostname>/oauth/redirect`, set `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET` and `ALLOWED_DOMAINS=<site hostname>` in the container's
environment, and point `base_url` in `public/admin/config.yml` at the same hostname.

Every save is a commit, so only people with write access to the repo can change
anything.

The CMS config is in `public/admin/config.yml`. The admin page itself (the button and
YouTube blocks, plus the `.mdoc` format) is in `src/pages/admin/index.astro`.

## Migrating from WordPress

`npm run migrate` fetches all pages, posts, projects, tools and Cybersaturdays through
the WordPress REST API, converts them to Markdoc and downloads the images and PDFs.
**This overwrites existing files**, so only run it again while nobody has edited the
content yet.
