import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const projectDirectory = path.resolve('content/projects');
const files = fs.readdirSync(projectDirectory).filter(file => file.endsWith('.json'));
const projects = files.map(file => {
  const project = JSON.parse(fs.readFileSync(path.join(projectDirectory, file), 'utf8'));
  const expectedSlug = path.basename(file, '.json');
  if (project.slug !== expectedSlug) throw new Error(`${file}: slug must match its filename`);
  for (const field of ['slug', 'title', 'deck', 'industry', 'role']) {
    if (!project[field]) throw new Error(`${file}: missing required field "${field}"`);
  }
  if (!Array.isArray(project.blocks)) throw new Error(`${file}: blocks must be an array`);
  return project;
});

const knownSlugs = new Set(projects.map(project => project.slug));
if (knownSlugs.size !== projects.length) throw new Error('Project slugs must be unique');

const allowedBlocks = new Set([
  'rich_text', 'two_column_text', 'image_full', 'text_image', 'gallery',
  'video', 'feature_grid', 'stats', 'quote', 'process', 'divider'
]);

for (const project of projects) {
  for (const recommendation of project.recommendations || []) {
    if (!knownSlugs.has(recommendation)) throw new Error(`${project.slug}: unknown recommendation "${recommendation}"`);
  }
  const sectionIds = new Set();
  for (const block of project.blocks) {
    if (!allowedBlocks.has(block.type)) throw new Error(`${project.slug}: unsupported block type "${block.type}"`);
    if (block.sectionId) {
      if (sectionIds.has(block.sectionId)) throw new Error(`${project.slug}: duplicate section ID "${block.sectionId}"`);
      sectionIds.add(block.sectionId);
    }
  }
}

const cmsConfig = yaml.load(fs.readFileSync(path.resolve('admin/config.yml'), 'utf8'));
const projectCollection = cmsConfig.collections?.find(collection => collection.name === 'projects');
if (!projectCollection) throw new Error('CMS config is missing the projects collection');

const cmsBlockTypes = projectCollection.fields?.find(field => field.name === 'blocks')?.types || [];
const configuredTypes = new Set(cmsBlockTypes.map(type => type.name));
for (const type of allowedBlocks) {
  if (!configuredTypes.has(type)) throw new Error(`CMS config is missing the "${type}" block type`);
}

console.log(`Validated ${projects.length} projects and ${configuredTypes.size} CMS block types.`);
