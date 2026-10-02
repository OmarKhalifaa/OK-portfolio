import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

export function validateContent(root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))) {
  const projectDirectory = path.join(root, 'content/projects');
  const files = fs.readdirSync(projectDirectory).filter(file => file.endsWith('.json'));
  const projects = files.map(file => {
    const project = JSON.parse(fs.readFileSync(path.join(projectDirectory, file), 'utf8'));
    const expectedSlug = path.basename(file, '.json');
    if (project.slug !== expectedSlug) throw new Error(`${file}: slug must match its filename`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) throw new Error(`${file}: invalid slug`);
    for (const field of ['slug', 'title', 'deck', 'industry', 'role']) {
      if (!project[field]) throw new Error(`${file}: missing required field "${field}"`);
    }
    if (!Array.isArray(project.blocks)) throw new Error(`${file}: blocks must be an array`);
    if (project.showInRecommendations === true && !project.blocks.length) throw new Error(`${file}: published projects must have content`);
    return project;
  });

  const knownSlugs = new Set(projects.map(project => project.slug));
  if (knownSlugs.size !== projects.length) throw new Error('Project slugs must be unique');

  const allowedBlocks = new Set([
    'rich_text', 'two_column_text', 'image_full', 'text_image', 'gallery',
    'video', 'screen_slider', 'before_after', 'figma_prototype', 'feature_grid', 'feature_catalog', 'motion_showcase', 'widget_showcase', 'stats', 'quote', 'process', 'divider'
  ]);

  for (const project of projects) {
    for (const recommendation of project.recommendations || []) {
      if (!knownSlugs.has(recommendation)) throw new Error(`${project.slug}: unknown recommendation "${recommendation}"`);
    }
    const sectionIds = new Set();
    for (const block of project.blocks) {
      if (!allowedBlocks.has(block.type)) throw new Error(`${project.slug}: unsupported block type "${block.type}"`);
      const sectionId = String(block.sectionId || block.navLabel || `section-${sectionIds.size + 1}`).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (sectionIds.has(sectionId)) throw new Error(`${project.slug}: duplicate section ID "${sectionId}"`);
      sectionIds.add(sectionId);
    }
    const checkAssets = value => {
      if (typeof value === 'string' && /^\/?images\//.test(value)) {
        const asset = path.resolve(root, value.replace(/^\//, ''));
        if (!asset.startsWith(`${root}${path.sep}`) || !fs.existsSync(asset)) throw new Error(`${project.slug}: missing or invalid asset "${value}"`);
      } else if (Array.isArray(value)) value.forEach(checkAssets);
      else if (value && typeof value === 'object') Object.values(value).forEach(checkAssets);
    };
    checkAssets(project);
  }

  const cmsConfig = yaml.load(fs.readFileSync(path.join(root, 'admin/config.yml'), 'utf8'));
  const projectCollection = cmsConfig.collections?.find(collection => collection.name === 'projects');
  if (!projectCollection) throw new Error('CMS config is missing the projects collection');

  const cmsBlockTypes = projectCollection.fields?.find(field => field.name === 'blocks')?.types || [];
  const configuredTypes = new Set(cmsBlockTypes.map(type => type.name));
  for (const type of allowedBlocks) {
    if (!configuredTypes.has(type)) throw new Error(`CMS config is missing the "${type}" block type`);
  }

  console.log(`Validated ${projects.length} projects and ${configuredTypes.size} CMS block types.`);
  return projects;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validateContent();
