// FORK (devinchaloux): tests for ui.templates (entry-templates.ts).
import { expect, test } from 'vitest';
import { chosenTemplate, templateKey, templatesFor } from './entry-templates';

const config = {
  ui: {
    templates: {
      pages: [
        { label: 'Project page', path: 'src/content/page-templates/project' },
        { label: 'Talk', path: 'src/content/page-templates/talk' },
      ],
    },
  },
};

test('a template key is its label as a slug', () => {
  expect(templateKey({ label: 'Project page' })).toBe('project-page');
  expect(templateKey({ label: 'CV-style list!' })).toBe('cv-style-list');
});

test('a collection lists its templates in config order, or none', () => {
  expect(templatesFor(config, 'pages').map(t => t.label)).toEqual([
    'Project page',
    'Talk',
  ]);
  expect(templatesFor(config, 'essays')).toEqual([]);
  expect(templatesFor({}, 'pages')).toEqual([]);
});

test('the create address picks a template by key', () => {
  expect(chosenTemplate(config, 'pages', 'talk')?.path).toBe(
    'src/content/page-templates/talk'
  );
  expect(chosenTemplate(config, 'pages', 'nope')).toBeUndefined();
  expect(chosenTemplate(config, 'pages', null)).toBeUndefined();
});
