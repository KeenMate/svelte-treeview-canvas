<script lang="ts">
	import { CanvasTree, type CanvasTheme, type CanvasRenderContext, getBadgeWidth, truncateText } from '$lib/index.js';
	import type { LTreeNode, ContextMenuEntry } from '@keenmate/svelte-treeview';

	// ── Types ──────────────────────────────────────────────────────────────

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		level: number;
		name: string;
		title: string;
		email: string;
		hasChildren: boolean;
	}

	// ── Sample data ──────────────────────────────────────────────────────

	const sampleData: Item[] = [
		// Engineering
		{ id: 1,  path: '1',       parentPath: '',    level: 1, name: 'Sarah Chen',       title: 'VP of Engineering',    email: 'sarah.chen@acme.com',       hasChildren: true },
		{ id: 2,  path: '1.1',     parentPath: '1',   level: 2, name: 'Marcus Rivera',    title: 'Frontend Lead',        email: 'marcus.rivera@acme.com',    hasChildren: true },
		{ id: 3,  path: '1.1.1',   parentPath: '1.1', level: 3, name: 'Emma Watson',      title: 'React Developer',      email: 'emma.watson@acme.com',      hasChildren: false },
		{ id: 4,  path: '1.1.2',   parentPath: '1.1', level: 3, name: 'Jake Liu',         title: 'UI Engineer',          email: 'jake.liu@acme.com',         hasChildren: false },
		{ id: 5,  path: '1.2',     parentPath: '1',   level: 2, name: 'Priya Sharma',     title: 'Backend Lead',         email: 'priya.sharma@acme.com',     hasChildren: true },
		{ id: 6,  path: '1.2.1',   parentPath: '1.2', level: 3, name: 'Carlos Mendez',    title: 'API Developer',        email: 'carlos.mendez@acme.com',    hasChildren: false },
		{ id: 7,  path: '1.2.2',   parentPath: '1.2', level: 3, name: 'Aisha Patel',      title: 'Database Engineer',    email: 'aisha.patel@acme.com',      hasChildren: false },
		// Design
		{ id: 8,  path: '2',       parentPath: '',    level: 1, name: 'David Kim',        title: 'Head of Design',       email: 'david.kim@acme.com',        hasChildren: true },
		{ id: 9,  path: '2.1',     parentPath: '2',   level: 2, name: 'Sofia Andersson',  title: 'UX Lead',              email: 'sofia.andersson@acme.com',  hasChildren: true },
		{ id: 10, path: '2.1.1',   parentPath: '2.1', level: 3, name: 'Tomoko Sato',      title: 'UX Researcher',        email: 'tomoko.sato@acme.com',      hasChildren: false },
		{ id: 11, path: '2.2',     parentPath: '2',   level: 2, name: 'Leo Nguyen',       title: 'Visual Designer',      email: 'leo.nguyen@acme.com',       hasChildren: false },
		// Product
		{ id: 12, path: '3',       parentPath: '',    level: 1, name: 'Rachel Torres',    title: 'VP of Product',        email: 'rachel.torres@acme.com',    hasChildren: true },
		{ id: 13, path: '3.1',     parentPath: '3',   level: 2, name: 'James O\'Brien',   title: 'Product Manager',      email: 'james.obrien@acme.com',     hasChildren: true },
		{ id: 14, path: '3.1.1',   parentPath: '3.1', level: 3, name: 'Maya Johnson',     title: 'Business Analyst',     email: 'maya.johnson@acme.com',     hasChildren: false },
		{ id: 15, path: '3.2',     parentPath: '3',   level: 2, name: 'Alex Petrov',      title: 'Growth Manager',       email: 'alex.petrov@acme.com',      hasChildren: true },
		{ id: 16, path: '3.2.1',   parentPath: '3.2', level: 3, name: 'Nina Garcia',      title: 'Data Analyst',         email: 'nina.garcia@acme.com',      hasChildren: false },
		{ id: 17, path: '3.2.2',   parentPath: '3.2', level: 3, name: 'Christopher Aleksandrov-Whitfield', title: 'Marketing Specialist', email: 'christopher.aleksandrov-whitfield@acme.com', hasChildren: false },
	];

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// ── Two-line body renderer ──────────────────────────────────────────

	function renderBody(rctx: CanvasRenderContext<Item>): void {
		const { ctx, node, bounds, state, config, theme } = rctx;
		const { x, y, w, h } = bounds;
		const isV = config.growthDirection === 'up' || config.growthDirection === 'down';

		const textOffsetX = isV ? config.nodePaddingX : config.colorBarWidth + config.nodePaddingX;
		const textX = x + textOffsetX;
		const chevronW = node.hasChildren ? 16 : 0;
		const badgeW = getBadgeWidth(rctx.badgeContent, theme);
		const badgeGap = badgeW > 0 ? 4 : 0;
		const maxTextW = w - textOffsetX - config.nodePaddingX - chevronW - badgeW - badgeGap;

		if (maxTextW <= 0) return;

		// Line 1: Name (bold)
		ctx.font = config.fontBold;
		ctx.fillStyle = theme.nodeText;
		ctx.textBaseline = 'middle';
		const nameY = y + h * 0.38;
		ctx.fillText(truncateText(ctx, node.data?.name || rctx.label, maxTextW), textX, nameY);

		// Line 2: Title (smaller, muted)
		const sizeMatch = config.font.match(/(\d+)px/);
		const baseSize = sizeMatch ? parseInt(sizeMatch[1]) : 12;
		const subtitleSize = Math.max(baseSize - 3, 8);
		const fontFamily = config.font.replace(/^(bold\s+)?\d+px\s*/, '');
		ctx.font = `${subtitleSize}px ${fontFamily}`;
		ctx.fillStyle = theme.chevronColor;
		const titleY = y + h * 0.68;
		ctx.fillText(truncateText(ctx, node.data?.title || '', maxTextW), textX, titleY);
	}

	// ── Context menu ────────────────────────────────────────────────────

	function getContextMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const d = node.data;
		if (!d) return [];

		const items: ContextMenuEntry[] = [
			{
				icon: '✉',
				label: `Email ${d.name.split(' ')[0]}`,
				onclick: () => { window.open('mailto:' + d.email); }
			},
			{ divider: true },
			{
				icon: '📋',
				label: 'Copy Email',
				onclick: async () => { await navigator.clipboard.writeText(d.email); }
			}
		];

		if (d.hasChildren) {
			items.push({ divider: true });
			items.push({
				icon: node.isExpanded ? '▼' : '▶',
				label: node.isExpanded ? 'Collapse Team' : 'Expand Team',
				onclick: () => {} // CanvasTree handles expand/collapse internally
			});
		}

		return items;
	}

	// ── Theme presets ────────────────────────────────────────────────────

	interface ThemePreset {
		name: string;
		description: string;
		baseVars: Record<string, string>;
		propOverrides?: Partial<CanvasTheme>;
	}

	const presets: ThemePreset[] = [
		{
			name: 'Default',
			description: 'No variables set. Uses hardcoded defaults.',
			baseVars: {},
		},
		{
			name: 'Audi',
			description: 'Pure Admin dark theme. Red accent, sharp corners, Fira Sans Condensed, --pa-color-* palette.',
			baseVars: {
				'--base-font-family': '"Fira Sans Condensed", sans-serif',
				'--base-accent-color': '#ff0000',
				'--base-accent-color-light': 'rgba(255, 0, 0, 0.25)',
				'--base-text-color-1': '#ffffff',
				'--base-text-color-3': '#999999',
				'--base-text-color-on-accent': '#ffffff',
				'--base-main-bg': '#1a1a1a',
				'--base-elevated-bg': '#0d0d0d',
				'--base-border-color': '#333333',
				'--base-hover-bg': '#2a2a2a',
				'--ct-node-radius': '0',
				'--ct-chevron-expanded': '\uf078',
				'--ct-chevron-collapsed': '\uf054',
				'--ct-chevron-size': '12',
				'--ct-chevron-font-family': "'Font Awesome 6 Free'",
				'--ct-chevron-font-weight': '900',
				// Audi depth palette (--pa-color-1..9)
				'--pa-color-1': '#bb0a30',
				'--pa-color-2': '#ff4444',
				'--pa-color-3': '#ff6600',
				'--pa-color-4': '#d4af37',
				'--pa-color-5': '#00a0a0',
				'--pa-color-6': '#0066cc',
				'--pa-color-7': '#8c8c8c',
				'--pa-color-8': '#404040',
				'--pa-color-9': '#6b3fa0',
			},
		},
		{
			name: 'Express',
			description: 'Pure Admin light theme. Red + yellow, --pa-color-* palette.',
			baseVars: {
				'--base-accent-color': '#D40511',
				'--base-accent-color-light': 'rgba(212, 5, 17, 0.06)',
				'--base-text-color-1': '#333333',
				'--base-text-color-3': '#CCCCCC',
				'--base-text-color-on-accent': '#ffffff',
				'--base-main-bg': '#ffffff',
				'--base-elevated-bg': '#f5f5f5',
				'--base-border-color': '#E5E5E5',
				'--base-hover-bg': '#e9ecef',
				// Express depth palette (--pa-color-1..9)
				'--pa-color-1': '#D40511',
				'--pa-color-2': '#FFCC00',
				'--pa-color-3': '#ff6b00',
				'--pa-color-4': '#00a651',
				'--pa-color-5': '#0066cc',
				'--pa-color-6': '#6b3fa0',
				'--pa-color-7': '#8C8C8C',
				'--pa-color-8': '#333333',
				'--pa-color-9': '#00b4d8',
			},
		},
		{
			name: 'Compact',
			description: 'Smaller nodes, tighter spacing via --ct-* geometry variables.',
			baseVars: {
				'--ct-node-height': '22',
				'--ct-node-min-width': '70',
				'--ct-node-gap': '3',
				'--ct-column-gap': '25',
				'--ct-font-size': '10',
				'--ct-node-radius': '3',
				'--ct-color-bar-width': '2',
				'--base-accent-color': '#6366f1',
				'--base-accent-color-light': '#eef2ff',
				'--base-text-color-1': '#312e81',
				'--base-text-color-3': '#a5b4fc',
				'--base-main-bg': '#f5f3ff',
				'--base-elevated-bg': '#ffffff',
				'--base-border-color': '#c7d2fe',
				'--base-hover-bg': '#eef2ff',
				'--base-text-color-on-accent': '#ffffff',
			},
		},
		{
			name: 'Spacious',
			description: 'Large nodes, generous spacing. Colors + geometry via CSS variables.',
			baseVars: {
				'--ct-node-height': '44',
				'--ct-node-min-width': '160',
				'--ct-node-gap': '14',
				'--ct-column-gap': '70',
				'--ct-font-size': '15',
				'--ct-node-radius': '12',
				'--ct-node-padding-x': '20',
				'--ct-color-bar-width': '5',
				'--base-accent-color': '#059669',
				'--base-accent-color-light': '#d1fae5',
				'--base-text-color-1': '#064e3b',
				'--base-text-color-3': '#6ee7b7',
				'--base-main-bg': '#ecfdf5',
				'--base-elevated-bg': '#ffffff',
				'--base-border-color': '#a7f3d0',
				'--base-hover-bg': '#d1fae5',
				'--base-text-color-on-accent': '#ffffff',
			},
		},
		{
			name: 'Pill Nodes',
			description: 'High border-radius for rounded pill-shaped nodes. No color bar.',
			baseVars: {
				'--ct-node-height': '32',
				'--ct-node-radius': '16',
				'--ct-node-padding-x': '20',
				'--ct-color-bar-width': '0',
				'--ct-node-gap': '8',
				'--base-accent-color': '#e11d48',
				'--base-accent-color-light': '#ffe4e6',
				'--base-text-color-1': '#881337',
				'--base-text-color-3': '#fda4af',
				'--base-main-bg': '#fff1f2',
				'--base-elevated-bg': '#ffffff',
				'--base-border-color': '#fecdd3',
				'--base-hover-bg': '#ffe4e6',
				'--base-text-color-on-accent': '#ffffff',
			},
		},
		{
			name: 'Mixed: --ct-* over --base-*',
			description: 'Shows priority: --ct-conn-color (orange) wins over --base-accent-color (blue).',
			baseVars: {
				'--base-accent-color': '#0284c7',
				'--base-accent-color-light': '#e0f2fe',
				'--base-text-color-1': '#0c4a6e',
				'--base-text-color-3': '#7dd3fc',
				'--base-main-bg': '#f0f9ff',
				'--base-elevated-bg': '#ffffff',
				'--base-border-color': '#bae6fd',
				'--base-hover-bg': '#e0f2fe',
				// --ct-* wins over --base-* for these specific properties
				'--ct-conn-color': '#f97316',
				'--ct-node-selected-border': '#f97316',
				'--ct-node-height': '36',
				'--ct-node-radius': '8',
			},
		},
	];

	// ── Node Geometry State ──────────────────────────────────────────────

	let geoNodeHeight = $state(44);
	let geoNodeMinWidth = $state(100);
	let geoNodeMaxWidth = $state(200);
	let geoNodePaddingX = $state(14);
	let geoColorBarWidth = $state(3);
	let geoNodeGap = $state(6);
	let geoColumnGap = $state(40);
	let geoFontSize = $state(12);
	let geoBorderRadius = $state(5);
	let geoShowDots = $state(true);

	// ── Theme State ─────────────────────────────────────────────────────

	let activePreset = $state(0);
	let treeKey = $state(0);

	// Rekey the tree when preset changes to force CSS re-read
	function applyPreset(index: number) {
		activePreset = index;
		treeKey++;
	}

	// Build inline style string from preset's baseVars
	function getStyleString(preset: ThemePreset): string {
		return Object.entries(preset.baseVars)
			.map(([k, v]) => `${k}: ${v}`)
			.join('; ');
	}

	const activeStyle = $derived(getStyleString(presets[activePreset]));
	const activeVars = $derived(presets[activePreset].baseVars);
</script>

<svelte:head>
	<title>Theming - Canvas Treeview</title>
	<link rel="stylesheet" href="/examples-shared.css" />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="container">
	<header>
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Theming with --base-* Variables</h1>
		<p class="subtitle">Shared design tokens that flow into the canvas theme automatically</p>
	</header>

	<div class="card">
		<h2>Priority Chain</h2>
		<p class="description">
			The canvas theme resolves values in this order:
			<code>theme prop</code> &rarr; <code>--ct-*</code> (component) &rarr; <code>--base-*</code> (shared) &rarr; hardcoded default.
			<br>
			Set <code>--base-accent-color</code> once on <code>:root</code> and it flows into node selection, minimap viewport, ghost border, and more.
		</p>
	</div>

	<!-- Preset selector -->
	<div class="card">
		<h2>Theme Presets</h2>
		<p class="description">Each preset sets <code>--base-*</code> CSS variables on the canvas wrapper. No <code>theme</code> prop needed.</p>

		<div class="preset-grid">
			{#each presets as preset, i}
				<button
					class="preset-btn"
					class:active={activePreset === i}
					onclick={() => applyPreset(i)}
				>
					<span class="preset-name">{preset.name}</span>
					<span class="preset-desc">{preset.description}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Active variables display -->
	<div class="card">
		<h2>Active CSS Variables</h2>
		{#if Object.keys(activeVars).length === 0}
			<p class="description">No <code>--base-*</code> variables set. All values fall through to hardcoded defaults.</p>
		{:else}
			<div class="var-list">
				{#each Object.entries(activeVars) as [name, value]}
					<div class="var-row">
						<code class="var-name">{name}</code>
						<span class="var-value">
							{#if value.startsWith('#')}
								<span class="color-swatch" style="background: {value}"></span>
							{/if}
							<code>{value}</code>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Canvas tree with applied variables -->
	<div class="card">
		<h2>Result</h2>
		<p class="description">Click nodes to see selection colors. Hover to see hover state. Collapse nodes to see chevron and badge colors.</p>

		{#key treeKey}
			<div class="canvas-wrapper" style={activeStyle}>
				<CanvasTree
					data={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}

					growthDirection="right"
					nodeHeight={44}
					nodeMinWidth={120}
					nodeMaxWidth={200}
					nodeGap={8}
					columnGap={50}
					fontSize={13}
					showDotGrid={true}
					getNodeLabelCallback={(node) => node.data?.name || node.path}
					renderBodyCallback={renderBody}
					getNodeContextMenuItemsCallback={getContextMenu}
				/>
			</div>
		{/key}
	</div>

	<!-- Node Geometry -->
	<div class="card">
		<h2>Node Geometry</h2>
		<p class="description">Props that shape node size, spacing, and layout. Drag the sliders to see changes live.</p>

		<div class="geo-controls">
			<label class="geo-label">
				<span>nodeHeight <code>{geoNodeHeight}</code></span>
				<input type="range" min="16" max="60" bind:value={geoNodeHeight} />
			</label>
			<label class="geo-label">
				<span>nodeMinWidth <code>{geoNodeMinWidth}</code></span>
				<input type="range" min="40" max="300" bind:value={geoNodeMinWidth} />
			</label>
			<label class="geo-label">
				<span>nodeMaxWidth <code>{geoNodeMaxWidth === 0 ? '∞' : geoNodeMaxWidth}</code></span>
				<input type="range" min="0" max="400" bind:value={geoNodeMaxWidth} />
			</label>
			<label class="geo-label">
				<span>nodePaddingX <code>{geoNodePaddingX}</code></span>
				<input type="range" min="0" max="40" bind:value={geoNodePaddingX} />
			</label>
			<label class="geo-label">
				<span>colorBarWidth <code>{geoColorBarWidth}</code></span>
				<input type="range" min="0" max="20" bind:value={geoColorBarWidth} />
			</label>
			<label class="geo-label">
				<span>nodeGap <code>{geoNodeGap}</code></span>
				<input type="range" min="0" max="30" bind:value={geoNodeGap} />
			</label>
			<label class="geo-label">
				<span>columnGap <code>{geoColumnGap}</code></span>
				<input type="range" min="10" max="120" bind:value={geoColumnGap} />
			</label>
			<label class="geo-label">
				<span>fontSize <code>{geoFontSize}</code></span>
				<input type="range" min="8" max="24" bind:value={geoFontSize} />
			</label>
			<label class="geo-label">
				<span>nodeRadius <code>{geoBorderRadius}</code></span>
				<input type="range" min="0" max="20" bind:value={geoBorderRadius} />
			</label>
			<label class="geo-label geo-checkbox">
				<input type="checkbox" bind:checked={geoShowDots} />
				<span>showDotGrid</span>
			</label>
		</div>

		<div class="canvas-wrapper">
			<CanvasTree
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				growthDirection="right"
				nodeHeight={geoNodeHeight}
				nodeMinWidth={geoNodeMinWidth}
				nodeMaxWidth={geoNodeMaxWidth || undefined}
				nodePaddingX={geoNodePaddingX}
				colorBarWidth={geoColorBarWidth}
				nodeGap={geoNodeGap}
				columnGap={geoColumnGap}
				fontSize={geoFontSize}
				theme={{ nodeRadius: geoBorderRadius }}
				showDotGrid={geoShowDots}
				getNodeLabelCallback={(node) => node.data?.name || node.path}
				renderBodyCallback={renderBody}
				getNodeContextMenuItemsCallback={getContextMenu}
			/>
		</div>
	</div>

	<div class="card">
		<h2>How It Works</h2>
		<div class="code-block">
			<pre>{`<!-- Set shared design tokens on any ancestor element -->
<div style="--base-accent-color: #e11d48; --base-main-bg: #fff1f2;">
  <CanvasTree {data} ... />
</div>

<!-- Or set them globally -->
<style>
  :root {
    --base-accent-color: #0284c7;
    --base-text-color-1: #0c4a6e;
    --base-border-color: #bae6fd;
  }
</style>

<!-- Component-specific --ct-* always wins over --base-* -->
<div style="--base-accent-color: #0284c7; --ct-conn-color: #f97316;">
  <CanvasTree {data} ... />
  <!-- connections are orange, selection is blue -->
</div>

<!-- theme prop wins over everything -->
<CanvasTree {data} theme={{ bg: '#000' }} ... />`}
</pre>
		</div>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>

<style>
	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.preset-btn {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.preset-btn:hover {
		border-color: #94a3b8;
	}

	.preset-btn.active {
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
	}

	.preset-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1e293b;
	}

	.preset-desc {
		font-size: 0.8rem;
		color: #64748b;
		line-height: 1.4;
	}

	.var-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}

	.var-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.35rem 0.75rem;
		background: #f8fafc;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.var-name {
		color: #7c3aed;
		font-weight: 500;
	}

	.var-value {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.var-value code {
		color: #334155;
	}

	.color-swatch {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 3px;
		border: 1px solid rgba(0,0,0,0.1);
	}

	.canvas-wrapper {
		height: 500px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 1rem;
	}

	.description {
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.description code {
		background: #f1f5f9;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85em;
	}

	.code-block {
		background: #1e293b;
		color: #e2e8f0;
		padding: 1.25rem;
		border-radius: 8px;
		overflow-x: auto;
		margin-top: 0.5rem;
	}

	.code-block pre {
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.85rem;
		line-height: 1.6;
		margin: 0;
	}

	.geo-controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.geo-label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.85rem;
		color: #334155;
	}

	.geo-label code {
		background: #f1f5f9;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		font-size: 0.85em;
		color: #7c3aed;
		font-weight: 600;
	}

	.geo-label input[type="range"] {
		width: 100%;
		accent-color: #667eea;
	}

	.geo-checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.geo-checkbox input[type="checkbox"] {
		accent-color: #667eea;
	}
</style>
