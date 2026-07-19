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
4. Choose up to three recommended projects.
5. Under **Page content**, add, remove, or reorder blocks.
6. Upload media through image fields.
7. Save locally or publish when using the hosted CMS.

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
/project.html?project=proof-of-payment-flow
/project.html?project=bikeopolis
/project.html?project=meal-holic
```

## Enable the hosted CMS

The production configuration uses Decap's GitHub backend with Netlify's OAuth provider. It does not use the deprecated Git Gateway feature. Editors must have write access to the GitHub repository.

1. Import `OmarKhalifaa/OK-portfolio` into Netlify.
2. Use the repository root as the publish directory. `netlify.toml` already contains the build settings.
3. In GitHub, open **Settings → Developer settings → OAuth Apps** and register a new OAuth application.
4. Use the Netlify site URL as the application homepage.
5. Use `https://api.netlify.com/auth/done` as the authorization callback URL.
6. Copy the GitHub Client ID and generate a Client Secret.
7. In Netlify, open **Project configuration → Access & security → OAuth**.
8. Install the GitHub authentication provider and enter the Client ID and Client Secret.
9. Open `https://YOUR-SITE.netlify.app/admin/` and sign in with the GitHub account that has write access to the repository.

The CMS publishes to the `main` branch. Decap's editorial workflow creates a branch and pull request for drafts before publishing.

## Important deployment note

GitHub Pages can continue serving the public site, but its `/admin` will not know which Netlify OAuth configuration to use. Use the Netlify URL for online editing, or connect the final custom domain to Netlify.
