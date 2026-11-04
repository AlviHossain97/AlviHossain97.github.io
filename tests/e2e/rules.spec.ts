import { expect, test } from '@playwright/test';
import { cv } from '../../src/data/cv';
import { CvSchema } from '../../src/data/schema';
import { findIssues } from '../../scripts/privacy-rules.mjs';

const clone = () => structuredClone(cv);

test.describe('privacy rules', () => {
  const bad = [
    '07700 900123',
    '07700900123',
    '020 7946 0958',
    '(020) 7946 0958',
    '020-7946-0958',
    '+44 20 7946 0958',
    '+44(0)20 7946 0958',
    '0044 7700 900123',
    'TW13 5AB',
    'tw13 5ab',
    'Student ID: 12345678',
    'Date of birth: 1 Jan 2000',
    'This is production-ready',
    'ready for production',
  ];
  for (const text of bad) {
    test(`flags: ${text}`, () => expect(findIssues(text).length).toBeGreaterThan(0));
  }
  test('does not flag ordinary CV and CSS text', () => {
    for (const text of [
      'Sep 2026 to present',
      'oklch(0.165 0.014 255)',
      'rgba(0 0 0 / 0.045)',
      'First five students, from three families',
      'Classes of 20+ students',
      '75/100',
      'West London, UK',
    ]) {
      expect(findIssues(text), text).toEqual([]);
    }
  });
});

test.describe('CV schema', () => {
  test('the real CV is valid', () => expect(CvSchema.safeParse(cv).success).toBe(true));

  test('rejects a link that is not email, LinkedIn or GitHub', () => {
    const c = clone();
    c.entries[0]!.links = [{ label: 'Elsewhere', href: 'https://example.com/me' }];
    expect(CvSchema.safeParse(c).success).toBe(false);
  });

  test('rejects an unknown skill id', () => {
    const c = clone();
    c.entries[0]!.skills = ['not-a-skill'];
    expect(CvSchema.safeParse(c).success).toBe(false);
  });

  test('rejects duplicate entry ids', () => {
    const c = clone();
    c.entries[1]!.id = c.entries[0]!.id;
    expect(CvSchema.safeParse(c).success).toBe(false);
  });

  test('rejects role and outcome on a project that is not featured', () => {
    const c = clone();
    const p = c.entries.find((e) => e.kind === 'project' && !e.featured)!;
    p.role = 'Built it.';
    expect(CvSchema.safeParse(c).success).toBe(false);
  });

  test('rejects a relatedProject that does not exist', () => {
    const c = clone();
    c.entries[0]!.relatedProject = 'no-such-project';
    expect(CvSchema.safeParse(c).success).toBe(false);
  });

  test('rejects a PDF name with a path', () => {
    const c = clone();
    c.site.pdfFile = '../cv.pdf';
    expect(CvSchema.safeParse(c).success).toBe(false);
  });
});

test('a malformed URL hash does not break the page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#%E0%A4%A');
  await expect(page.locator('#timeline .tl-item').first()).toBeVisible();
  await expect(page.locator('#skills .skill-btn').first()).toBeVisible();
  expect(errors).toEqual([]);
});
