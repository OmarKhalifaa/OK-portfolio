# Portfolio CMS

The portfolio uses Decap CMS as a Git-backed editor. Project pages read structured JSON files from `content/projects`, so CMS edits become visible without a database or application server.

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

## Project URLs

The default project opens at:

```text
/project.html
```

Other projects use their slug:

```text
/project.html?project=login-revamp
/project.html?project=bikeopolis
/project.html?project=meal-holic
```

## Enable the hosted CMS

The production configuration uses Decap's GitHub backend with OAuth handled by Cloudflare Pages Functions. It does not use Git Gateway. Editors must have write access to the GitHub repository.

Hosted CMS: `https://ok-portfolio.pages.dev/admin/`

1. In Cloudflare, create a Pages project connected to `OmarKhalifaa/OK-portfolio`.
2. Use `main` as the production branch, no build command, and the repository root (`.`) as the output directory.
3. In GitHub, open **Settings → Developer settings → OAuth Apps** and register a new OAuth application.
4. Use `https://ok-portfolio.pages.dev` as the application homepage.
5. Use `https://ok-portfolio.pages.dev/callback` as the authorization callback URL.
6. Make sure the OAuth application's Client ID matches `GITHUB_CLIENT_ID` in `functions/auth.js` and `functions/callback.js`.
7. In the Cloudflare Pages project settings, add `GITHUB_CLIENT_SECRET` as an encrypted secret for Production. Add it to Preview too if CMS sign-in must work on preview deployments.
8. Redeploy the Pages project so the secret is available to the Functions.
9. Open `https://ok-portfolio.pages.dev/admin/` and sign in with the GitHub account that has write access to the repository.

The CMS publishes directly to the `main` branch because `publish_mode` is set to `simple` in `admin/config.yml`.

## Production hosting

Cloudflare Pages is the production host for the portfolio. GitHub stores the source and CMS content, while every update pushed to `main` is automatically published by Cloudflare Pages. The `functions` directory contains the CMS OAuth endpoints, and `_headers` contains Cloudflare Pages response-header rules. GitHub Pages should remain disabled to avoid maintaining a second public copy of the site.
