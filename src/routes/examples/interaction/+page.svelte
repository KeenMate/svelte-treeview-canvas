<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { TreeController, LTreeNode, ClickBehavior } from '@keenmate/svelte-treeview';

	const STORAGE_KEY = 'canvas-interaction-settings';

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		name: string;
		icon: string;
		hasChildren: boolean;
	}

	// Generate sample data with enough nodes to test bulk selection
	const sampleData: Item[] = [
		{ id: 1, path: '1', parentPath: '', name: 'Documents', icon: '📁', hasChildren: true },
		{ id: 2, path: '1.1', parentPath: '1', name: 'Work', icon: '💼', hasChildren: true },
		{ id: 3, path: '1.1.1', parentPath: '1.1', name: 'Reports', icon: '📊', hasChildren: false },
		{ id: 4, path: '1.1.2', parentPath: '1.1', name: 'Presentations', icon: '📽️', hasChildren: false },
		{ id: 5, path: '1.1.3', parentPath: '1.1', name: 'Spreadsheets', icon: '📈', hasChildren: false },
		{ id: 6, path: '1.1.4', parentPath: '1.1', name: 'Invoices', icon: '🧾', hasChildren: false },
		{ id: 7, path: '1.1.5', parentPath: '1.1', name: 'Contracts', icon: '📜', hasChildren: false },
		{ id: 8, path: '1.1.6', parentPath: '1.1', name: 'Budgets', icon: '💰', hasChildren: false },
		{ id: 9, path: '1.2', parentPath: '1', name: 'Personal', icon: '🏠', hasChildren: true },
		{ id: 10, path: '1.2.1', parentPath: '1.2', name: 'Photos', icon: '📷', hasChildren: false },
		{ id: 11, path: '1.2.2', parentPath: '1.2', name: 'Music', icon: '🎵', hasChildren: false },
		{ id: 12, path: '1.2.3', parentPath: '1.2', name: 'Videos', icon: '🎬', hasChildren: false },
		{ id: 13, path: '1.2.4', parentPath: '1.2', name: 'Recipes', icon: '🍳', hasChildren: false },
		{ id: 14, path: '1.2.5', parentPath: '1.2', name: 'Books', icon: '📚', hasChildren: false },
		{ id: 20, path: '2', parentPath: '', name: 'Downloads', icon: '⬇️', hasChildren: true },
		{ id: 21, path: '2.1', parentPath: '2', name: 'Software', icon: '💿', hasChildren: false },
		{ id: 22, path: '2.2', parentPath: '2', name: 'Media', icon: '🎞️', hasChildren: false },
		{ id: 23, path: '2.3', parentPath: '2', name: 'Archives', icon: '📦', hasChildren: false },
		{ id: 24, path: '2.4', parentPath: '2', name: 'Fonts', icon: '🔤', hasChildren: false },
		{ id: 25, path: '2.5', parentPath: '2', name: 'Plugins', icon: '🔌', hasChildren: false },
		{ id: 30, path: '3', parentPath: '', name: 'Projects', icon: '🚀', hasChildren: true },
		{ id: 31, path: '3.1', parentPath: '3', name: 'Web App', icon: '🌐', hasChildren: true },
		{ id: 32, path: '3.1.1', parentPath: '3.1', name: 'Frontend', icon: '🎨', hasChildren: false },
		{ id: 33, path: '3.1.2', parentPath: '3.1', name: 'Backend', icon: '⚙️', hasChildren: false },
		{ id: 34, path: '3.1.3', parentPath: '3.1', name: 'Tests', icon: '🧪', hasChildren: false },
		{ id: 35, path: '3.1.4', parentPath: '3.1', name: 'DevOps', icon: '🔧', hasChildren: false },
		{ id: 36, path: '3.2', parentPath: '3', name: 'Mobile App', icon: '📱', hasChildren: true },
		{ id: 37, path: '3.2.1', parentPath: '3.2', name: 'iOS', icon: '🍎', hasChildren: false },
		{ id: 38, path: '3.2.2', parentPath: '3.2', name: 'Android', icon: '🤖', hasChildren: false },
		{ id: 39, path: '3.2.3', parentPath: '3.2', name: 'Flutter', icon: '🦋', hasChildren: false },
		{ id: 40, path: '3.3', parentPath: '3', name: 'CLI Tools', icon: '⌨️', hasChildren: true },
		{ id: 41, path: '3.3.1', parentPath: '3.3', name: 'Linter', icon: '🔍', hasChildren: false },
		{ id: 42, path: '3.3.2', parentPath: '3.3', name: 'Formatter', icon: '✨', hasChildren: false },
		{ id: 43, path: '3.3.3', parentPath: '3.3', name: 'Bundler', icon: '📦', hasChildren: false },
	];

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// ── Persisted settings ───────────────────────────────────────────
	interface Settings {
		clickBehavior: ClickBehavior;
	}

	function loadSettings(): Settings {
		try {
			const raw = localStorage?.getItem(STORAGE_KEY);
			if (raw) return { clickBehavior: 'expand-and-focus', ...JSON.parse(raw) };
		} catch {}
		return { clickBehavior: 'expand-and-focus' };
	}

	const saved = loadSettings();

	function saveSettings() {
		try { localStorage?.setItem(STORAGE_KEY, JSON.stringify({ clickBehavior })); } catch {}
	}

	// ── State ────────────────────────────────────────────────────────
	let clickBehavior = $state<ClickBehavior>(saved.clickBehavior);
	let canvasTreeRef = $state<CanvasTree<Item> | null>(null);
	let ctrlRef = $state<TreeController<Item> | null>(null);

	// Canvas package still uses old API: selectedPath (focused) + selectedPaths (highlighted)
	let selectedPath = $state<string | null>(null);
	let selectedPaths = $state(new Set<string>());

	// Metrics
	let layoutTime = $state(0);
	let drawTime = $state(0);
	let visibleCount = $state(0);
	let totalCount = $state(0);

	$effect(() => { clickBehavior; saveSettings(); });

	function onNodeClick(node: LTreeNode<Item>) {
	}

	function onSelectionChange(paths: Set<string>, nodes: LTreeNode<Item>[]) {
	}
</script>

<svelte:head>
	<title>Interaction - Canvas Treeview</title>
</svelte:head>

<div class="container">
	<header class="example-header">
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>🖱️ Interaction</h1>
		<p class="subtitle">Click behavior, multi-select, and keyboard navigation on canvas</p>
	</header>

	<div class="card">
		<h2>Click Behavior & Selection</h2>
		<p class="description">
			Test click behavior modes, Ctrl+click / Shift+click multi-select, and Shift+drag rectangle selection on the canvas.
		</p>

		<div class="controls">
			<label>
				Click Behavior:
				<select bind:value={clickBehavior}>
					<option value="expand-and-focus">expand-and-focus (select + expand)</option>
					<option value="select">select (dbl-click to expand)</option>
					<option value="expand">expand (no selection)</option>
				</select>
			</label>
			<button class="btn" onclick={() => canvasTreeRef?.expandAll()}>Expand All</button>
			<button class="btn btn-secondary" onclick={() => canvasTreeRef?.collapseAll()}>Collapse All</button>
			<button class="btn btn-secondary" onclick={() => { selectedPaths = new Set(); selectedPath = null; }}>Clear Selection</button>
		</div>

		<div class="grid-2">
			<div class="canvas-container">
				<CanvasTree
					bind:this={canvasTreeRef}
					bind:controller={ctrlRef}
					data={sampleData}
					idMember="id"
					pathMember="path"
					parentPathMember="parentPath"
					hasChildrenMember="hasChildren"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={2}
					bind:clickBehavior
					bind:selectedPath
					bind:selectedPaths
					{onNodeClick}
					{onSelectionChange}
					getNodeLabelCallback={(node) => `${node.data?.icon || ''} ${node.data?.name || node.path}`}
					bind:layoutTime
					bind:drawTime
					bind:visibleCount
					bind:totalCount
				/>
			</div>
			<div>
				<div class="output">
					<p class="output-label">Focused Node (selectedPath)</p>
					<pre>{selectedPath
	? (() => { const n = ctrlRef?.getNodeByPath(selectedPath); return n ? `${n.data?.icon} ${n.data?.name} (${n.path})` : selectedPath; })()
	: '(none — click a node)'}</pre>
				</div>
				<div class="output">
					<p class="output-label">Highlighted ({selectedPaths.size})</p>
					<pre>{selectedPaths.size > 0
	? [...selectedPaths].join(', ')
	: '(none — try Ctrl+click or Shift+click)'}</pre>
				</div>
				<div class="output">
					<p class="output-label">Metrics</p>
					<pre>Nodes: {visibleCount}/{totalCount} visible
Layout: {layoutTime.toFixed(1)}ms
Draw: {drawTime.toFixed(1)}ms</pre>
				</div>

				<div class="note">
					<p class="note-title">Canvas Selection</p>
					<p>
						The canvas package currently uses <code>selectedPath</code> (focused node) and <code>selectedPaths</code> (highlighted set).
						These will be renamed to <code>focusedPath</code> / <code>highlightedPaths</code> when the canvas package migrates to the three-level model.
						Checkbox-based <code>selectedPaths</code> (data state) is not yet available in the canvas renderer.
					</p>
				</div>
			</div>
		</div>

		<div class="note">
			<p class="note-title">Interaction Guide</p>
			<p>
				<strong>Pan</strong>: drag empty space.
				<strong>Zoom</strong>: scroll wheel.
				<strong>Click</strong>: select/expand based on mode.
				<strong>Ctrl+click</strong>: toggle individual node.
				<strong>Shift+click</strong>: range select.
				<strong>Shift+drag</strong>: rectangle selection.
				<strong>Arrow keys</strong>: navigate (click canvas first to focus).
			</p>
		</div>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>

<style>
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.example-header {
		margin-bottom: 2rem;
	}

	.back-link {
		color: #667eea;
		text-decoration: none;
		font-size: 0.9rem;
	}

	h1 { margin: 0.5rem 0 0.25rem; }

	.subtitle {
		color: #718096;
		margin: 0;
	}

	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	h2 { margin: 0 0 0.5rem; }

	.description {
		color: #4a5568;
		margin: 0 0 1rem;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.controls label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.controls select {
		padding: 0.35rem 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.btn {
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		background: #667eea;
		color: white;
	}

	.btn:hover { background: #5a6fd6; }

	.btn-secondary {
		background: #e2e8f0;
		color: #4a5568;
	}

	.btn-secondary:hover { background: #cbd5e0; }

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: 1.5rem;
	}

	@media (max-width: 900px) {
		.grid-2 { grid-template-columns: 1fr; }
	}

	.canvas-container {
		width: 100%;
		height: 550px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		background: #f8fafc;
	}

	.output {
		background: #f7fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.output-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: #4a5568;
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.output pre {
		margin: 0;
		font-size: 0.85rem;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.note {
		background: #ebf4ff;
		border: 1px solid #bee3f8;
		border-radius: 6px;
		padding: 0.75rem;
		margin-top: 0.75rem;
		font-size: 0.85rem;
	}

	.note-title {
		font-weight: 600;
		margin: 0 0 0.25rem;
		color: #2b6cb0;
	}

	.note p {
		margin: 0;
		color: #2c5282;
	}

	footer {
		text-align: center;
		padding: 2rem 0;
		color: #a0aec0;
	}

	footer a { color: #667eea; text-decoration: none; }
</style>
