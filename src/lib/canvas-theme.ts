// ── Canvas Theme ─────────────────────────────────────────────────────────
// All visual values for canvas-rendered elements, readable from CSS custom
// properties (--ct-*) and overridable via props.
//
// Priority chain: prop overrides → --ct-* (component) → --base-* (shared theme) → hardcoded default
//
// --base-* variables are shared design tokens set by the app's theme system.
// They allow all KeenMate components (web-treeview, svelte-treeview, canvas-tree)
// to inherit a consistent palette from a single set of CSS variables.

export interface CanvasTheme {
	// Canvas
	bg: string;

	// Node geometry (also settable as direct props — props override theme)
	nodeHeight: number;
	nodeMinWidth: number;
	nodeMaxWidth: number;  // 0 = unlimited
	nodePaddingX: number;
	nodeGap: number;
	columnGap: number;
	levelSpacingV: number;
	colorBarWidth: number;
	fontSize: number;

	// Depth colors (color bar + badge bg, 10 levels, cycles)
	depthColor0: string;
	depthColor1: string;
	depthColor2: string;
	depthColor3: string;
	depthColor4: string;
	depthColor5: string;
	depthColor6: string;
	depthColor7: string;
	depthColor8: string;
	depthColor9: string;

	// Node (idle)
	nodeBg: string;
	nodeBorder: string;
	nodeBorderWidth: number;
	nodeRadius: number;
	nodeText: string;

	// Node (selected)
	nodeSelectedBg: string;
	nodeSelectedBorder: string;

	// Selection rectangle (shift+drag)
	selectionRectFill: string;
	selectionRectStroke: string;

	// Node (hovered)
	nodeHoverBg: string;
	nodeHoverBorder: string;

	// Node (drop target)
	nodeDropBg: string;
	nodeDropBorder: string;

	// Node (search match)
	nodeMatchBg: string;
	nodeMatchBorder: string;
	nodeCurrentBg: string;
	nodeCurrentBorder: string;

	// Chevron
	chevronColor: string;
	chevronSize: number;
	chevronExpanded: string;
	chevronCollapsed: string;
	chevronFontFamily: string;
	chevronFontWeight: string;
	chevronPaddingEnd: number;

	// Badge
	badgeText: string;
	badgeHeight: number;
	badgeFontSize: number;

	// Connections
	connColor: string;
	connWidth: number;

	// Minimap
	minimapBg: string;
	minimapBorder: string;
	minimapViewport: string;
	minimapWidth: number;
	minimapHeight: number;

	// Dot Grid
	gridColor: string;
	gridSize: number;

	// Drop Zones
	dzBefore: string;
	dzAfter: string;
	dzChild: string;
	dzRadius: number;

	// Drag Ghost
	ghostBg: string;
	ghostBorder: string;
	ghostOpacity: number;

	// Tooltip (DOM)
	tooltipBg: string;
	tooltipText: string;
	tooltipRadius: string;

	// Context Menu (DOM)
	menuBg: string;
	menuText: string;
	menuHover: string;
	menuRadius: string;
}

/** Sensible defaults — match the previously hardcoded values */
export const defaultCanvasTheme: CanvasTheme = {
	bg: '#f8fafc',

	nodeHeight: 28,
	nodeMinWidth: 100,
	nodeMaxWidth: 0,
	nodePaddingX: 14,
	nodeGap: 6,
	columnGap: 40,
	levelSpacingV: 60,
	colorBarWidth: 3,
	fontSize: 12,

	depthColor0: '#f59e0b',
	depthColor1: '#0d9488',
	depthColor2: '#7c3aed',
	depthColor3: '#ec4899',
	depthColor4: '#3b82f6',
	depthColor5: '#10b981',
	depthColor6: '#f97316',
	depthColor7: '#6366f1',
	depthColor8: '#14b8a6',
	depthColor9: '#e11d48',

	nodeBg: '#ffffff',
	nodeBorder: '#e2e8f0',
	nodeBorderWidth: 1.5,
	nodeRadius: 5,
	nodeText: '#334155',

	nodeSelectedBg: '#f0f4ff',
	nodeSelectedBorder: '#667eea',

	selectionRectFill: 'rgba(102, 126, 234, 0.1)',
	selectionRectStroke: 'rgba(102, 126, 234, 0.5)',

	nodeHoverBg: '#fafbff',
	nodeHoverBorder: '#94a3b8',

	nodeDropBg: '#eff6ff',
	nodeDropBorder: '#3b82f6',

	nodeMatchBg: '#fefce8',
	nodeMatchBorder: '#f59e0b',
	nodeCurrentBg: '#fffbeb',
	nodeCurrentBorder: '#d97706',

	chevronColor: '#94a3b8',
	chevronSize: 10,
	chevronExpanded: '\u25BE',
	chevronCollapsed: '\u25B8',
	chevronFontFamily: 'sans-serif',
	chevronFontWeight: 'normal',
	chevronPaddingEnd: 14,

	badgeText: '#ffffff',
	badgeHeight: 14,
	badgeFontSize: 9,

	connColor: '#94a3b8',
	connWidth: 1.5,

	minimapBg: 'rgba(255,255,255,0.92)',
	minimapBorder: '#e2e8f0',
	minimapViewport: '#667eea',
	minimapWidth: 160,
	minimapHeight: 120,

	gridColor: '#cbd5e1',
	gridSize: 20,

	dzBefore: '#22c55e',
	dzAfter: '#f97316',
	dzChild: '#8b5cf6',
	dzRadius: 9,

	ghostBg: '#ffffff',
	ghostBorder: '#667eea',
	ghostOpacity: 0.7,

	tooltipBg: '#1e293b',
	tooltipText: '#f1f5f9',
	tooltipRadius: '6px',

	menuBg: '#1e293b',
	menuText: '#f1f5f9',
	menuHover: '#334155',
	menuRadius: '8px',
};

// ── CSS Variable Reading ─────────────────────────────────────────────────

/**
 * CSS variable mapping: [--ct-* var, theme key, type, optional --base-* fallback]
 *
 * Priority: --ct-* (component-specific) → --base-* (shared theme) → hardcoded default
 * This mirrors the web-treeview pattern where --tv-* falls back to --base-*.
 */
const CSS_VAR_MAP: [string, keyof CanvasTheme, 'string' | 'number', string?][] = [
	['--ct-bg',                  'bg',                  'string', '--base-main-bg'],

	// Node geometry
	['--ct-node-height',         'nodeHeight',          'number'],
	['--ct-node-min-width',      'nodeMinWidth',        'number'],
	['--ct-node-max-width',      'nodeMaxWidth',        'number'],
	['--ct-node-padding-x',      'nodePaddingX',        'number'],
	['--ct-node-gap',            'nodeGap',             'number'],
	['--ct-column-gap',          'columnGap',           'number'],
	['--ct-level-spacing-v',     'levelSpacingV',       'number'],
	['--ct-color-bar-width',     'colorBarWidth',       'number'],
	['--ct-font-size',           'fontSize',            'number'],

	// Depth colors (--ct-depth-color-N → --pa-color-N → default)
	['--ct-depth-color-0',       'depthColor0',         'string', '--pa-color-1'],
	['--ct-depth-color-1',       'depthColor1',         'string', '--pa-color-2'],
	['--ct-depth-color-2',       'depthColor2',         'string', '--pa-color-3'],
	['--ct-depth-color-3',       'depthColor3',         'string', '--pa-color-4'],
	['--ct-depth-color-4',       'depthColor4',         'string', '--pa-color-5'],
	['--ct-depth-color-5',       'depthColor5',         'string', '--pa-color-6'],
	['--ct-depth-color-6',       'depthColor6',         'string', '--pa-color-7'],
	['--ct-depth-color-7',       'depthColor7',         'string', '--pa-color-8'],
	['--ct-depth-color-8',       'depthColor8',         'string', '--pa-color-9'],
	['--ct-depth-color-9',       'depthColor9',         'string'],

	['--ct-node-bg',             'nodeBg',              'string', '--base-elevated-bg'],
	['--ct-node-border',         'nodeBorder',          'string', '--base-border-color'],
	['--ct-node-border-width',   'nodeBorderWidth',     'number'],
	['--ct-node-radius',         'nodeRadius',          'number'],
	['--ct-node-text',           'nodeText',            'string', '--base-text-color-1'],

	['--ct-node-selected-bg',    'nodeSelectedBg',      'string', '--base-accent-color-light'],
	['--ct-node-selected-border','nodeSelectedBorder',   'string', '--base-accent-color'],

	['--ct-selection-rect-fill',  'selectionRectFill',  'string'],
	['--ct-selection-rect-stroke','selectionRectStroke', 'string'],

	['--ct-node-hover-bg',       'nodeHoverBg',         'string', '--base-hover-bg'],
	['--ct-node-hover-border',   'nodeHoverBorder',     'string'],

	['--ct-node-drop-bg',        'nodeDropBg',          'string'],
	['--ct-node-drop-border',    'nodeDropBorder',      'string'],

	['--ct-node-match-bg',       'nodeMatchBg',         'string'],
	['--ct-node-match-border',   'nodeMatchBorder',     'string'],
	['--ct-node-current-bg',     'nodeCurrentBg',       'string'],
	['--ct-node-current-border', 'nodeCurrentBorder',   'string'],

	['--ct-chevron-color',       'chevronColor',        'string', '--base-text-color-3'],
	['--ct-chevron-size',        'chevronSize',         'number'],
	['--ct-chevron-expanded',    'chevronExpanded',     'string'],
	['--ct-chevron-collapsed',   'chevronCollapsed',    'string'],
	['--ct-chevron-font-family', 'chevronFontFamily',   'string'],
	['--ct-chevron-font-weight', 'chevronFontWeight',   'string'],
	['--ct-chevron-padding-end',  'chevronPaddingEnd','number'],

	['--ct-badge-text',          'badgeText',           'string', '--base-text-color-on-accent'],
	['--ct-badge-height',        'badgeHeight',         'number'],
	['--ct-badge-font-size',     'badgeFontSize',       'number'],

	['--ct-conn-color',          'connColor',           'string', '--base-text-color-3'],
	['--ct-conn-width',          'connWidth',           'number'],

	['--ct-minimap-bg',          'minimapBg',           'string'],
	['--ct-minimap-border',      'minimapBorder',       'string', '--base-border-color'],
	['--ct-minimap-viewport',    'minimapViewport',     'string', '--base-accent-color'],
	['--ct-minimap-width',       'minimapWidth',        'number'],
	['--ct-minimap-height',      'minimapHeight',       'number'],

	['--ct-grid-color',          'gridColor',           'string', '--base-border-color'],
	['--ct-grid-size',           'gridSize',            'number'],

	['--ct-dz-before',           'dzBefore',            'string', '--base-success-color'],
	['--ct-dz-after',            'dzAfter',             'string'],
	['--ct-dz-child',            'dzChild',             'string'],
	['--ct-dz-radius',           'dzRadius',            'number'],

	['--ct-ghost-bg',            'ghostBg',             'string', '--base-elevated-bg'],
	['--ct-ghost-border',        'ghostBorder',         'string', '--base-accent-color'],
	['--ct-ghost-opacity',       'ghostOpacity',        'number'],

	['--ct-tooltip-bg',          'tooltipBg',           'string'],
	['--ct-tooltip-text',        'tooltipText',         'string'],
	['--ct-tooltip-radius',      'tooltipRadius',       'string'],

	['--ct-menu-bg',             'menuBg',              'string'],
	['--ct-menu-text',           'menuText',            'string'],
	['--ct-menu-hover',          'menuHover',           'string'],
	['--ct-menu-radius',         'menuRadius',          'string'],
];

/**
 * Read CSS custom properties from an element and return partial theme overrides.
 * Only returns keys that are actually set on the element.
 *
 * For each theme key, tries --ct-* first, then --base-* fallback (if mapped).
 * This lets apps set --base-accent-color once and have it flow into canvas nodes,
 * connections, minimap, etc. — while still allowing per-component --ct-* overrides.
 */
export function readCssTheme(el: HTMLElement): Partial<CanvasTheme> {
	const style = getComputedStyle(el);
	const partial: Partial<CanvasTheme> = {};

	for (const [varName, key, type, baseVar] of CSS_VAR_MAP) {
		// Try --ct-* first, then --base-* fallback
		let raw = style.getPropertyValue(varName).trim();
		if (!raw && baseVar) {
			raw = style.getPropertyValue(baseVar).trim();
		}
		if (!raw) continue;

		if (type === 'number') {
			const num = parseFloat(raw);
			if (!isNaN(num)) {
				(partial as Record<string, unknown>)[key] = num;
			}
		} else {
			(partial as Record<string, unknown>)[key] = raw;
		}
	}

	return partial;
}

/**
 * Merge theme layers: defaults → CSS variables → prop overrides.
 * Props have highest priority.
 */
export function resolveTheme(
	cssOverrides: Partial<CanvasTheme>,
	propOverrides: Partial<CanvasTheme>
): CanvasTheme {
	return { ...defaultCanvasTheme, ...cssOverrides, ...propOverrides };
}
