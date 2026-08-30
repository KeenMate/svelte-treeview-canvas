import { test, expect } from '@playwright/test';
import { waitForCanvas, fitAndSettle, clickNode, nodeRect } from './helpers';

/**
 * E2E for /test/interaction — proves the real canvas pointer → hit-test → selection
 * pipeline (via getNodeScreenRect coordinate clicks) plus controller-driven
 * expand/collapse, asserted through the fixture's text outputs.
 *
 * Data (sorted by name): 1 Documents, 1.1 Work, 1.1.1 Reports, 1.1.2 Presentations,
 * 1.2 Personal, 1.2.1 Photos, 2 Downloads, 2.1 Software — 8 nodes total.
 */

const PAGE = '/test/interaction';

const focusedPath = (page: import('@playwright/test').Page) =>
	page.getByTestId('focused-path');
const highlighted = (page: import('@playwright/test').Page) =>
	page.getByTestId('highlighted-paths');
const highlightedCount = (page: import('@playwright/test').Page) =>
	page.getByTestId('highlighted-count');
const visibleTotal = (page: import('@playwright/test').Page) =>
	page.getByTestId('visible-total');

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await waitForCanvas(page);
	await fitAndSettle(page);
});

test('clicking a node on the canvas focuses and highlights it', async ({ page }) => {
	await expect(focusedPath(page)).toHaveText('(none)');

	// 2.1 = Software (a leaf) — click in 'select' mode selects without expand side effects.
	await clickNode(page, '2.1');

	await expect(focusedPath(page)).toHaveText('2.1');
	await expect(highlighted(page)).toHaveText('2.1');
	await expect(highlightedCount(page)).toHaveText('1');
});

test('Ctrl+click extends the highlight set to multiple nodes', async ({ page }) => {
	await clickNode(page, '2.1');
	await expect(highlightedCount(page)).toHaveText('1');

	await clickNode(page, '1.1.1', { modifiers: ['Control'] });

	await expect(highlightedCount(page)).toHaveText('2');
	await expect(highlighted(page)).toHaveText('1.1.1, 2.1');
});

test('Clear Selection empties the highlight set', async ({ page }) => {
	await clickNode(page, '2.1');
	await expect(highlightedCount(page)).toHaveText('1');

	await page.getByRole('button', { name: 'Clear Selection' }).click();

	await expect(highlightedCount(page)).toHaveText('0');
	await expect(highlighted(page)).toHaveText('(none)');
});

test('Collapse All hides descendants; Expand All brings them back', async ({ page }) => {
	// Baseline: expandLevel=2 renders all 8 nodes.
	await expect(visibleTotal(page)).toHaveText('8/8');

	await page.getByRole('button', { name: 'Collapse All' }).click();
	await fitAndSettle(page);

	// Only the two roots (Documents, Downloads) remain laid out (totalCount tracks
	// the current layout, not the full dataset).
	await expect(visibleTotal(page)).toHaveText('2/2');
	// A collapsed descendant is no longer in the layout → no screen rect.
	expect(await nodeRect(page, '1.1')).toBeNull();

	await page.getByRole('button', { name: 'Expand All' }).click();
	await fitAndSettle(page);

	await expect(visibleTotal(page)).toHaveText('8/8');
	expect(await nodeRect(page, '1.1.1')).not.toBeNull();
});
