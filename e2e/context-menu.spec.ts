import { test, expect } from '@playwright/test';
import { waitForCanvas, fitAndSettle, rightClickNode } from './helpers';

/**
 * E2E for /test/context-menu — the canvas menu is REAL DOM
 * (`.canvas-tree-ctx-menu` / `.canvas-tree-ctx-menu-item`), so we open it with a
 * right-click at a node's screen position and assert on the rendered menu.
 */

const PAGE = '/test/context-menu';

const menu = (page: import('@playwright/test').Page) => page.locator('.canvas-tree-ctx-menu');
const menuItem = (page: import('@playwright/test').Page, label: string) =>
	page.locator('.canvas-tree-ctx-menu-item', { hasText: label });
const lastAction = (page: import('@playwright/test').Page) => page.getByTestId('last-action');

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await waitForCanvas(page);
	await fitAndSettle(page);
});

test('right-clicking a node opens its context menu with the expected items', async ({ page }) => {
	await rightClickNode(page, '1'); // Documents

	await expect(menu(page)).toBeVisible();
	await expect(page.locator('.canvas-tree-ctx-menu-header')).toContainText('Documents');
	await expect(menuItem(page, 'Rename')).toBeVisible();
	await expect(menuItem(page, 'Duplicate')).toBeVisible();
	await expect(menuItem(page, 'Delete')).toBeVisible();
	// Named divider between the safe items and the danger zone.
	await expect(page.locator('.canvas-tree-ctx-menu-divider-label')).toHaveText('Danger zone');
	// Delete carries the consumer's className.
	await expect(page.locator('.canvas-tree-ctx-menu-item.danger')).toContainText('Delete');
});

test('clicking a menu item runs its action and closes the menu', async ({ page }) => {
	await rightClickNode(page, '1');
	await expect(menu(page)).toBeVisible();

	await menuItem(page, 'Rename').click();

	await expect(lastAction(page)).toHaveText('rename:Documents');
	await expect(menu(page)).toHaveCount(0);
});

test('the menu is node-specific (label + action reflect the right-clicked node)', async ({ page }) => {
	await rightClickNode(page, '2'); // Downloads
	await expect(page.locator('.canvas-tree-ctx-menu-header')).toContainText('Downloads');

	await menuItem(page, 'Delete').click();
	await expect(lastAction(page)).toHaveText('delete:Downloads');
});

test('right-clicking empty canvas opens the canvas-level menu', async ({ page }) => {
	const box = await page.locator('[data-testid="canvas-host"] canvas').boundingBox();
	expect(box).not.toBeNull();
	// Bottom-right corner is empty space (nodes lay out from the top-left).
	await page.mouse.click(box!.x + box!.width - 24, box!.y + box!.height - 24, { button: 'right' });

	await expect(menuItem(page, 'Expand All')).toBeVisible();
	await expect(menuItem(page, 'Collapse All')).toBeVisible();

	await menuItem(page, 'Collapse All').click();
	await expect(lastAction(page)).toHaveText('canvas:collapse-all');
});
