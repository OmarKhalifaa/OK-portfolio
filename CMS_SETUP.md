# Portfolio CMS

The portfolio uses Decap CMS as a Git-backed editor. A static build turns structured JSON files from `content/projects` into complete HTML pages. Publishing a CMS edit triggers Cloudflare's build; visitors and search engines receive the content immediately without browser-side JSON requests.

## Start the CMS locally

Install the project dependencies once:

```powershell
npm install
```

Start the website and the local CMS proxy together:

```powershell
npm run dev
```

Open:

- Website: `http://localhost:4173/`
- CMS: `http://localhost:4173/admin/`

Local CMS mode writes directly to the JSON files and `images/uploads`. It does not require a login and does not support Decap's editorial workflow.

## Editing projects

1. Open **Projects**.
2. Select an existing project or choose **New Project**.
3. Complete the fixed hero and metadata fields.
4. Upload a dedicated 4:3 **Project thumbnail** for the outer project card.
5. Choose up to three recommended projects.
6. Under **Page content**, add, remove, or reorder blocks.
7. Upload media through image fields.
8. Save locally or publish when using the hosted CMS.

Available content blocks:

- Rich text
- Two-column text
- Full-width image
- Text + image
- Image gallery
- Before / after comparison (draggable divider, with optional images and placeholders)
- Video
- Feature / insight cards
- Results / statistics
- Quote
- Process steps
- Section divider

### Image controls

The **Full-width image** block includes:

- Width: full, wide, medium, or small
- Alignment: left, center, or right
- Aspect ratio: natural, 16:9, 4:3, square, or 4:5 portrait
- Fit: crop to fill or show the complete image
- Crop focus: center, top, bottom, left, or right
- Caption alignment

The **Text + image** block additionally controls the image side, image-column width, and vertical alignment. Galleries control their column count, common aspect ratio, fit, and crop focus. Smaller image widths automatically become full width on mobile so they remain readable.

Every content block can have a section ID. Blocks with a side-menu label and **Show in side menu** enabled automatically appear in the sticky project navigation.

Enable **Published on website** to include a project on the homepage, in recommendations, and in the sitemap. Disabled projects remain editable CMS drafts and are excluded from the public build. Local changes rebuild automatically while `npm run dev` is running.

The **Before / after comparison** block overlays two images in the same frame. Visitors can drag the divider with a mouse or touch, or use arrow keys while it is focused. Upload the before and after images independently, set their labels and descriptions, and choose their fit and shape. Use images aligned to the same viewport for a meaningful comparison. Empty image fields show the named placeholders while the case study is being prepared. Full-width images and galleries also support optional placeholder text.

For tall pages with different lengths, use an **Image gallery** with **Full pages with tabs and scrolling** selected. Each image is shown at the full preview width, with its own scroll position and a named tab. This keeps text readable and avoids forcing unrelated sections into an overlay.

## Project URLs

Published projects have their own permanent URLs:

```text
/projects/login-revamp/
/projects/digital-store/
/projects/accessibility-widget/
/projects/plekundig/
```

Old `/project.html?project=...` and `/project?project=...` links redirect permanently through Cloudflare Pages Functions. Unpublished project URLs return the site's 404 page.

## Enable the hosted CMS

The production configuration uses Decap's GitHub backend with OAuth handled by Cloudflare Pages Functions. It does not use Git Gateway. Editors must have write access to the GitHub repository.

Hosted CMS: `https://ok-portfolio.pages.dev/admin/`

1. In Cloudflare, create a Pages project connected to `OmarKhalifaa/OK-portfolio`.
2. Use `main` as the production branch, `npm run build` as the build command, and `dist` as the output directory. Use Node.js 22.12 or newer. Deploy the build output rather than the source directory.
3. In GitHub, open **Settings → Developer settings → OAuth Apps** and register a new OAuth application.
4. Use `https://ok-portfolio.pages.dev` as the application homepage.
5. Use `https://ok-portfolio.pages.dev/callback` as the authorization callback URL.
6. Make sure the OAuth application's Client ID matches `GITHUB_CLIENT_ID` in `functions/auth.js` and `functions/callback.js`.
7. In the Cloudflare Pages project settings, add `GITHUB_CLIENT_SECRET` as an encrypted secret for Production. Hosted editing uses the production `/admin/` origin; the OAuth popup only sends credentials to a window on that same origin. Use the local backend for local editing.
8. Redeploy the Pages project so the secret is available to the Functions.
9. Open `https://ok-portfolio.pages.dev/admin/` and sign in with the GitHub account that has write access to the repository.

The CMS publishes directly to the `main` branch because `publish_mode` is set to `simple` in `admin/config.yml`.

## Production hosting

Cloudflare Pages is the production host for the portfolio. GitHub stores the source and CMS content, while every update pushed to `main` is automatically published by Cloudflare Pages. The `functions` directory contains the CMS OAuth endpoints, and `_headers` contains Cloudflare Pages response-header rules. GitHub Pages should remain disabled to avoid maintaining a second public copy of the site.
