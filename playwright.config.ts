import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end tests against the canvas showcase dev server.
 *
 * Dev server runs on port 17778 (see package.json `dev` script). Playwright spins
 * it up automatically before tests and reuses an already-running server if one is
 * detected.
 *
 * Canvas caveat: nodes are painted to a <canvas>, not DOM elements, so specs mix
 * two strategies — (1) drive the controller via toolbar buttons + assert on the
 * fixture's text `.output` blocks, and (2) for genuine hit-testing, read a node's
 * live screen rect via CanvasTree.getNodeScreenRect() (exposed on window by the
 * /test fixtures) and click at its centre.
 *
 * Run:
 *   npm run test:e2e:install   # one-time: download chromium browser binary
 *   npm run test:e2e           # headless run
 *   npm run test:e2e:ui        # Playwright Test UI (debugging)
 *   npm run test:e2e:headed    # watch the browser do its thing
 */
export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	timeout: 45_000,
	expect: { timeout: 15_000 },

	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: process.env.CI ? 1 : 4,

	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: 'http://localhost:17778',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 1024 }
			}
		}
	],

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:17778',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		stdout: 'ignore',
		stderr: 'pipe'
	}
});
