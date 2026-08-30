import { Page, expect } from '@playwright/test';

/**
 * Shared canvas e2e helpers.
 *
 * Nodes are painted to a <canvas>, so there are no DOM elements to click. Instead
 * the /test fixtures expose `window.__canvasRect(path)` → CanvasTree.getNodeScreenRect,
 * which returns a node's LIVE client-space rect through the current pan/zoom. We read
 * that and drive `page.mouse` at the node's centre.
 */

export interface ScreenRect {
	x: number;
	y: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

/** Wait for the canvas to mount, expose its rect helper, and settle its first paint. */
export async function waitForCanvas(page: Page) {
	await page.locator('[data-testid="canvas-host"] canvas').waitFor({ state: 'visible' });
	await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__canvasReady === true);
	await page.waitForTimeout(300);
}

/** Fit the whole tree into view so every node has a stable on-screen rect. */
export async function fitAndSettle(page: Page) {
	const fit = page.getByRole('button', { name: 'Fit' });
	if (await fit.count()) {
		await fit.click();
		await page.waitForTimeout(400);
	}
}

/** Live client-space rect of a rendered node, or null when it isn't in the layout. */
export async function nodeRect(page: Page, path: string): Promise<ScreenRect | null> {
	return page.evaluate((p) => {
		const fn = (window as unknown as Record<string, unknown>).__canvasRect as
			| ((path: string) => ScreenRect | null)
			| undefined;
		return fn ? fn(p) : null;
	}, path);
}

/** Poll until a node is present in the layout (e.g. after an expand animation). */
export async function waitForNodeRect(page: Page, path: string): Promise<ScreenRect> {
	let rect: ScreenRect | null = null;
	await expect(async () => {
		rect = await nodeRect(page, path);
		expect(rect).not.toBeNull();
	}).toPass({ timeout: 5000 });
	return rect!;
}

interface ClickOpts {
	modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>;
	button?: 'left' | 'right' | 'middle';
}

/** Click a node at its centre (optionally with modifiers / right button).
 *  NOTE: page.mouse.click ignores a `modifiers` option (unlike locator.click), so
 *  we hold the keys down around the raw mouse click ourselves. */
export async function clickNode(page: Page, path: string, opts: ClickOpts = {}) {
	const r = await waitForNodeRect(page, path);
	const mods = opts.modifiers ?? [];
	for (const m of mods) await page.keyboard.down(m);
	try {
		await page.mouse.click(r.centerX, r.centerY, opts.button ? { button: opts.button } : {});
	} finally {
		for (const m of mods) await page.keyboard.up(m);
	}
}

/** Right-click a node at its centre (opens the node context menu). */
export async function rightClickNode(page: Page, path: string) {
	await clickNode(page, path, { button: 'right' });
}
