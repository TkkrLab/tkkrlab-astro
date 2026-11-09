# tkkrlab.nl

De website van TkkrLab, de hackerspace van Enschede. Gebouwd met
[Astro](https://astro.build) (statische site) en [Keystatic](https://keystatic.com)
(CMS met een bewerk-GUI). Alle inhoud staat als bestanden in deze repo, er is
geen database en geen PHP. De webserver serveert vooraf gebouwde HTML, CSS en
afbeeldingen; alleen het inloggen in het CMS (`/oauth/*`) draait op de server.

## Lokaal draaien

```sh
npm install
npm run dev
```

- Site: http://localhost:4321
- CMS: http://localhost:4321/keystatic

In dev schrijft Keystatic direct naar de bestanden in `src/content` en `src/data`.
Commit en push je wijzigingen daarna gewoon met git.

## Waar staat wat

| Wat | Waar | URL |
| --- | --- | --- |
| Blogberichten | `src/content/posts/*.mdoc` | `/blog/<slug>/` |
| Pagina’s | `src/content/pages/*.mdoc` | `/<slug>/` |
| Projecten | `src/content/projects/*.mdoc` | `/projecten/<slug>/` |
| Gereedschap (werkplaats) | `src/content/tools/*.mdoc` | `/gereedschap/<slug>/` |
| Cybersaturdays | `src/content/cybersaturdays/*.mdoc` | `/cybersaturdays/<slug>/` |
| Homepage | `src/data/home.yaml` | `/` |
| Menu, adres, socials | `src/data/settings.yaml` | overal |
| Afbeeldingen | `public/images/<collectie>/<slug>/` | |
| Handleidingen (PDF) | `public/files/` | |

Een pagina met *Overzicht onder de tekst* (bijv. `blog`, `projecten`, `gereedschap`)
toont automatisch kaarten van die collectie onder de introtekst.

In de tekst kun je naast gewone Markdown twee blokken gebruiken (via de **+** in de editor):

- `{% button href="/deelnemer-worden/" label="Kom langs" /%}`
- `{% youtube id="g5ib6TEji5o" /%}`, die pas iets van YouTube laadt als iemand op afspelen klikt

De open/dicht-status in de header komt live uit de SpaceAPI (`spaceapi.tkkrlab.nl`).

## Bouwen en hosten

```sh
npm run build                # → dist/client (statisch) en dist/server (Node)
node dist/server/entry.mjs
```

De site draait als één Node-container, zie `Dockerfile` (poort 8080, of `PORT`).
Oude WordPress-URL’s (`/wikiwiki/…`, `/project/…`, blogposts in de root) staan in
`src/data/redirects.json` en worden als redirects meegebouwd.

Bij elke push naar `main` bouwt `.github/workflows/deploy.yml` de container, zet die
op GHCR en rolt hem uit op Greybull. Daarvoor zijn in de repo het secret
`GREYBULL_API_KEY` (scope `services:write`) en de variabele `GREYBULL_APP` nodig.

### Online bewerken (zonder lokale checkout)

Keystatic kan ook rechtstreeks commits op GitHub maken. Daarvoor:

1. Zet de repo op GitHub (bijv. `TkkrLab/tkkrlab-astro`).
2. Zet `PUBLIC_KEYSTATIC_GITHUB_REPO=TkkrLab/tkkrlab-astro` in de omgeving.
3. Draai de admin als kleine Node-server: `KEYSTATIC=true npm run build && node dist/server/entry.mjs`.
4. Open `/keystatic`. Keystatic leidt je dan door het aanmaken van een GitHub App
   en vult `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` en
   `KEYSTATIC_SECRET` in.

Elke opslag is dan een commit. Laat CI (bijv. een GitHub Action) bij elke push
`npm run build` draaien en `dist/` uitrollen. De publieke site blijft zo statisch,
en alleen mensen met schrijfrechten op de repo kunnen iets aanpassen.

## Alternatief: Sveltia CMS (branch `sveltia-cms`)

Op deze branch staat naast Keystatic ook [Sveltia CMS](https://sveltiacms.app) op
`/admin/`. Beide bewerken dezelfde bestanden, zodat je ze naast elkaar kunt vergelijken.

- **Lokaal:** open http://localhost:4321/admin/ in Chrome of Edge, klik *Work with
  Local Repository* en kies de map van deze repo. Er is geen server nodig: de browser
  schrijft direct naar de bestanden.
- **Online:** de admin draait mee op de site en inloggen met GitHub loopt via
  `/oauth/*` (`src/pages/oauth/[action].js`, met de
  [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)). Maak op
  GitHub een OAuth App met callback-URL `https://tkkrlab.nl/oauth/redirect` en zet in
  de omgeving van de container `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` en
  `ALLOWED_DOMAINS=tkkrlab.nl`.
- Config: `public/admin/config.yml`. De pagina zelf (knop- en YouTube-blokken plus
  het `.mdoc`-formaat) staat in `src/pages/admin/index.astro`.

Als de keuze gemaakt is, verwijder je de andere: voor Keystatic `public/admin/`,
`src/pages/admin/`, `src/pages/oauth/` en het `sveltia-cms-auth` package, voor Sveltia
`keystatic.config.ts`, de `@keystatic/*` packages en de `withAdmin`-regels in
`astro.config.mjs`.

## Migratie vanaf WordPress

`npm run migrate` haalt alle pagina’s, posts, projecten, gereedschap en
Cybersaturdays op via de WordPress REST API, zet ze om naar Markdoc en downloadt
de afbeeldingen en PDF’s. **Dit overschrijft bestaande bestanden**, dus draai het
alleen opnieuw zolang niemand nog in Keystatic heeft bewerkt.
