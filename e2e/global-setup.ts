import { chromium, FullConfig } from '@playwright/test';

/**
 * Pre-warm the Vite dev server by visiting every test fixture route up-front.
 *
 * Vite compiles routes on demand on first request, and that compilation competes
 * with the canvas's own startup (layout + first paint + focus animation). Hitting
 * each route once here pushes the compile cost into setup so the actual tests see
 * warm caches and a stable first frame.
 */
export default async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:17778';

	const routes = ['/test/interaction', '/test/context-menu'];

	const browser = await chromium.launch();
	const page = await browser.newPage();
	for (const route of routes) {
		try {
			await page.goto(`${baseURL}${route}`, { waitUntil: 'load', timeout: 30_000 });
			await page.waitForTimeout(500);
		} catch {
			// If a page fails to warm we ignore it; the actual test will surface the
			// real error with more context.
		}
	}
	await browser.close();
}
