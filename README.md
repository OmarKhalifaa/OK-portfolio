# Omar Khalifa portfolio

Static HTML, CSS, and JavaScript with a Git-backed Decap CMS. The build renders published case studies from `content/projects`, creates responsive WebP images and social previews, minifies and fingerprints assets, and generates SEO metadata, structured data, a sitemap, and robots.txt.

## Local development

```powershell
npm ci
npm run dev
```

Open the website at `http://localhost:4173/` and the CMS at `http://localhost:4173/admin/`. Changes to source or CMS content rebuild the website automatically. The source HTML is a template; use the built site for previews.

```powershell
npm run check
```

This runs regression tests, validates all CMS projects and block types, builds the site, and checks public pages for content, metadata, dimensions, duplicate IDs, broken local links, sitemap coverage, and accidentally published source files.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22.12 or newer
- Production domain and identity: `site.config.mjs`

The root `functions` directory supplies CMS authentication and redirects old case study links. Existing `/about.html` links also redirect. Source JSON, unpublished case studies, development dependencies, docs, and temporary files are excluded from deployment. Do not publish the repository root.

Image conversions are cached in `.cache/images`; both the cache and `dist` are ignored by Git. The build clears its output before generating it so removed CMS projects and assets cannot linger in production. Original images that remain in the repository are used by CMS content and regeneration.

See [CMS_SETUP.md](CMS_SETUP.md) for editing and hosted authentication setup. The remaining low-severity npm advisory is in the local CMS proxy's `@hapi/joi` dependency; it has no upstream fix and is excluded from the public build.
