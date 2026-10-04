# tkkrlab.nl

De website van TkkrLab, de hackerspace van Enschede. Gebouwd met
[Astro](https://astro.build) (statische site) en [Keystatic](https://keystatic.com)
(CMS met een bewerk-GUI). Alle inhoud staat als bestanden in deze repo, er is
geen database en geen PHP. Er valt dus niets te hacken op de webserver: die
serveert alleen HTML, CSS en afbeeldingen.

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
npm run build    # → dist/ (puur statisch)
```

`dist/` kan op elke statische host: de eigen server (nginx/caddy), GitHub Pages,
Cloudflare Pages of Netlify. Oude WordPress-URL’s (`/wikiwiki/…`, `/project/…`,
blogposts in de root) staan in `src/data/redirects.json` en worden als
redirect-pagina’s meegebouwd.

### Online bewerken (zonder lokale checkout)

Keystatic kan ook rechtstreeks commits op GitHub maken. Daarvoor:

1. Zet de repo op GitHub (bijv. `tkkrlab/website`).
2. Zet `PUBLIC_KEYSTATIC_GITHUB_REPO=tkkrlab/website` in de omgeving.
3. Draai de admin als kleine Node-server: `KEYSTATIC=true npm run build && node dist/server/entry.mjs`.
4. Open `/keystatic`. Keystatic leidt je dan door het aanmaken van een GitHub App
   en vult `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` en
   `KEYSTATIC_SECRET` in.

Elke opslag is dan een commit. Laat CI (bijv. een GitHub Action) bij elke push
`npm run build` draaien en `dist/` uitrollen. De publieke site blijft zo statisch,
en alleen mensen met schrijfrechten op de repo kunnen iets aanpassen.

## Migratie vanaf WordPress

`npm run migrate` haalt alle pagina’s, posts, projecten, gereedschap en
Cybersaturdays op via de WordPress REST API, zet ze om naar Markdoc en downloadt
de afbeeldingen en PDF’s. **Dit overschrijft bestaande bestanden**, dus draai het
alleen opnieuw zolang niemand nog in Keystatic heeft bewerkt.
