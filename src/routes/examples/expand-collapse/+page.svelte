<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { TreeController, LTreeNode } from '@keenmate/svelte-treeview';

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		name: string;
		icon: string;
		hasChildren: boolean;
		isPreSelected?: boolean;
	}

	// 17-node, 3-level tree. Matches the svelte-treeview /examples/expand-collapse fixture.
	const sampleData: Item[] = [
		{ id: 1, path: '1', parentPath: '', name: 'Documents', icon: '📁', hasChildren: true, isPreSelected: true },
		{ id: 2, path: '1.1', parentPath: '1', name: 'Work', icon: '💼', hasChildren: true },
		{ id: 3, path: '1.1.1', parentPath: '1.1', name: 'Reports', icon: '📊', hasChildren: false, isPreSelected: true },
		{ id: 4, path: '1.1.2', parentPath: '1.1', name: 'Presentations', icon: '📽️', hasChildren: false },
		{ id: 5, path: '1.2', parentPath: '1', name: 'Personal', icon: '🏠', hasChildren: true },
		{ id: 6, path: '1.2.1', parentPath: '1.2', name: 'Photos', icon: '📷', hasChildren: false },
		{ id: 7, path: '1.2.2', parentPath: '1.2', name: 'Music', icon: '🎵', hasChildren: false, isPreSelected: true },
		{ id: 8, path: '1.3', parentPath: '1', name: 'Notes', icon: '📝', hasChildren: true },
		{ id: 9, path: '1.3.1', parentPath: '1.3', name: 'Ideas', icon: '💡', hasChildren: false },
		{ id: 10, path: '2', parentPath: '', name: 'Downloads', icon: '⬇️', hasChildren: true },
		{ id: 11, path: '2.1', parentPath: '2', name: 'Software', icon: '💿', hasChildren: true },
		{ id: 12, path: '2.1.1', parentPath: '2.1', name: 'Installers', icon: '📦', hasChildren: false },
		{ id: 13, path: '2.2', parentPath: '2', name: 'Media', icon: '🎞️', hasChildren: false },
		{ id: 14, path: '3', parentPath: '', name: 'Projects', icon: '🚀', hasChildren: true, isPreSelected: true },
		{ id: 15, path: '3.1', parentPath: '3', name: 'Web App', icon: '🌐', hasChildren: true },
		{ id: 16, path: '3.1.1', parentPath: '3.1', name: 'Frontend', icon: '🎨', hasChildren: false, isPreSelected: true },
		{ id: 17, path: '3.2', parentPath: '3', name: 'Mobile App', icon: '📱', hasChildren: false }
	];

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// ── Tree A: array variants demo ─────────────────────────────────
	let treeARef = $state<CanvasTree<Item> | null>(null);
	let ctrlARef = $state<TreeController<Item> | null>(null);

	// ── Tree B: exclusive focus demo ────────────────────────────────
	let treeBRef = $state<CanvasTree<Item> | null>(null);
	let ctrlBRef = $state<TreeController<Item> | null>(null);

	// ── Tree C/D: isSelectedMember demo ─────────────────────────────
	let selectedPathsNoSeed = $state(new Set<string>());
	let selectedPathsSeeded = $state(new Set<string>());

	// Visible/expanded paths for live readouts
	let expandedA = $state<string[]>([]);
	let expandedB = $state<string[]>([]);

	function collectExpanded(ctrl: TreeController<Item> | null): string[] {
		if (!ctrl) return [];
		const out: string[] = [];
		const walk = (nodes: LTreeNode<Item>[]) => {
			for (const n of nodes) {
				if (n.isExpanded) {
					out.push(n.path);
					walk(Object.values(n.children));
				}
			}
		};
		walk(ctrl.tree.tree);
		return out.sort();
	}

	function refreshA() { expandedA = collectExpanded(ctrlARef); }
	function refreshB() { expandedB = collectExpanded(ctrlBRef); }

	$effect(() => {
		if (ctrlARef) refreshA();
	});
	$effect(() => {
		if (ctrlBRef) refreshB();
	});

	// ── Array variant actions (Tree A) ──────────────────────────────
	function expandSingle() { treeARef?.expandNodes('1.1'); refreshA(); }
	function expandArray() { treeARef?.expandNodes(['1.1', '2.1', '3.1']); refreshA(); }
	function collapseArray() { treeARef?.collapseNodes(['1.1', '2.1', '3.1']); refreshA(); }
	function expandAllUnderArray() { treeARef?.expandAll(['1', '3']); refreshA(); }
	function collapseAllUnderArray() { treeARef?.collapseAll(['1', '3']); refreshA(); }
	function collapseEverything() { treeARef?.collapseAll(); refreshA(); }

	// ── Exclusive actions (Tree B) ──────────────────────────────────
	function focusDeep() { treeBRef?.expandNodes('1.1.1', { exclusive: true }); refreshB(); }
	function focusMultiple() { treeBRef?.expandNodes(['1.1', '3.1'], { exclusive: true }); refreshB(); }
	function focusAllUnder() { treeBRef?.expandAll('2', { exclusive: true }); refreshB(); }
	function plainExpandAll() { treeBRef?.expandAll(); refreshB(); }
	function plainCollapseAll() { treeBRef?.collapseAll(); refreshB(); }
</script>

<svelte:head>
	<title>Expand / Collapse - Canvas Treeview</title>
</svelte:head>

<div class="container">
	<header class="example-header">
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>🌳 Expand / Collapse</h1>
		<p class="subtitle">Array variants, exclusive focus mode, and <code>isSelectedMember</code> seeding</p>
	</header>

	<!-- ─────────────────────────── Array variants ─────────────────────────── -->
	<div class="card">
		<h2>Array variants</h2>
		<p class="description">
			All four expand/collapse methods accept either <code>string</code> or <code>string[]</code>. Each call is one emit
			regardless of how many paths are passed, so downstream layout/draw runs once.
		</p>

		<div class="controls">
			<button class="btn" onclick={expandSingle}>expandNodes('1.1')</button>
			<button class="btn" onclick={expandArray}>expandNodes(['1.1', '2.1', '3.1'])</button>
			<button class="btn btn-secondary" onclick={collapseArray}>collapseNodes(['1.1', '2.1', '3.1'])</button>
			<button class="btn" onclick={expandAllUnderArray}>expandAll(['1', '3'])</button>
			<button class="btn btn-secondary" onclick={collapseAllUnderArray}>collapseAll(['1', '3'])</button>
			<button class="btn btn-secondary" onclick={collapseEverything}>collapseAll()</button>
		</div>

		<div class="grid-2">
			<div class="canvas-container">
				<CanvasTree
					bind:this={treeARef}
					bind:controller={ctrlARef}
					data={sampleData}
					idMember="id"
					pathMember="path"
					parentPathMember="parentPath"
					hasChildrenMember="hasChildren"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={0}
					getNodeLabelCallback={(node) => `${node.data?.icon || ''} ${node.data?.name || node.path}`}
				/>
			</div>
			<div>
				<div class="output">
					<p class="output-label">Currently expanded paths</p>
					<pre>{expandedA.length === 0 ? '(none — all collapsed)' : expandedA.join('\n')}</pre>
				</div>
				<div class="note">
					<p class="note-title">What to look for</p>
					<p>
						Clicking the array buttons expands or collapses three subtrees in one call — the canvas redraws once,
						not three times.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ─────────────────────────── Exclusive focus ─────────────────────────── -->
	<div class="card">
		<h2>Exclusive focus mode</h2>
		<p class="description">
			Pass <code>{'{ exclusive: true }'}</code> to <code>expandNodes</code> or <code>expandAll</code> to open the target
			path(s) and collapse everything else currently expanded in a single pass. Equivalent to
			<code>collapseAll() + expandNodes(path)</code> but without the intermediate fully-collapsed frame.
		</p>

		<div class="controls">
			<button class="btn" onclick={focusDeep}>expandNodes('1.1.1', {'{ exclusive: true }'})</button>
			<button class="btn" onclick={focusMultiple}>expandNodes(['1.1', '3.1'], {'{ exclusive: true }'})</button>
			<button class="btn" onclick={focusAllUnder}>expandAll('2', {'{ exclusive: true }'})</button>
			<button class="btn btn-secondary" onclick={plainExpandAll}>expandAll()</button>
			<button class="btn btn-secondary" onclick={plainCollapseAll}>collapseAll()</button>
		</div>

		<div class="grid-2">
			<div class="canvas-container">
				<CanvasTree
					bind:this={treeBRef}
					bind:controller={ctrlBRef}
					data={sampleData}
					idMember="id"
					pathMember="path"
					parentPathMember="parentPath"
					hasChildrenMember="hasChildren"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={2}
					getNodeLabelCallback={(node) => `${node.data?.icon || ''} ${node.data?.name || node.path}`}
				/>
			</div>
			<div>
				<div class="output">
					<p class="output-label">Currently expanded paths</p>
					<pre>{expandedB.length === 0 ? '(none — all collapsed)' : expandedB.join('\n')}</pre>
				</div>
				<div class="note">
					<p class="note-title">Sunburst layout note</p>
					<p>
						In <code>layoutMode="sunburst"</code>, the canvas approximates <code>exclusive</code> by collapsing
						everything first with <code>{'{ noEmit: true }'}</code> and then running the overflow-aware sunburst
						expand pass. Other layouts forward the option to the core for true single-pass behavior.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ───────────────────── isSelectedMember seeding ─────────────────────── -->
	<div class="card">
		<h2><code>isSelectedMember</code> &mdash; pre-selected nodes from data</h2>
		<p class="description">
			Setting <code>isSelectedMember="isPreSelected"</code> tells the controller to walk the tree after
			<code>insertArray</code> and seed the bindable <code>selectedPaths</code> Set with every path where the field is
			truthy. Without it, <code>selectedPaths</code> starts empty even if your data has the field.
		</p>

		<div class="grid-2">
			<div>
				<div class="output-label" style="margin-bottom: 0.5rem;">Without <code>isSelectedMember</code></div>
				<div class="canvas-container">
					<CanvasTree
						data={sampleData}
						idMember="id"
						pathMember="path"
						parentPathMember="parentPath"
						hasChildrenMember="hasChildren"
						sortCallback={sortByName}
						isSorted={true}
						expandLevel={2}
						bind:selectedPaths={selectedPathsNoSeed}
						getNodeLabelCallback={(node) => `${node.data?.icon || ''} ${node.data?.name || node.path}${node.data?.isPreSelected ? ' ⭐' : ''}`}
					/>
				</div>
				<div class="output">
					<p class="output-label">selectedPaths ({selectedPathsNoSeed.size})</p>
					<pre>{selectedPathsNoSeed.size === 0 ? '(empty)' : [...selectedPathsNoSeed].join(', ')}</pre>
				</div>
			</div>
			<div>
				<div class="output-label" style="margin-bottom: 0.5rem;">With <code>isSelectedMember="isPreSelected"</code></div>
				<div class="canvas-container">
					<CanvasTree
						data={sampleData}
						idMember="id"
						pathMember="path"
						parentPathMember="parentPath"
						hasChildrenMember="hasChildren"
						isSelectedMember="isPreSelected"
						sortCallback={sortByName}
						isSorted={true}
						expandLevel={2}
						bind:selectedPaths={selectedPathsSeeded}
						getNodeLabelCallback={(node) => `${node.data?.icon || ''} ${node.data?.name || node.path}${node.data?.isPreSelected ? ' ⭐' : ''}`}
					/>
				</div>
				<div class="output">
					<p class="output-label">selectedPaths ({selectedPathsSeeded.size})</p>
					<pre>{selectedPathsSeeded.size === 0 ? '(empty)' : [...selectedPathsSeeded].join(', ')}</pre>
				</div>
			</div>
		</div>

		<div class="note">
			<p class="note-title">Where it's useful</p>
			<p>
				Server-rendered data that already knows which rows are checked (saved filters, persisted user selections).
				The selection round-trips without a client-side re-walk. The matching <code>isSelectableMember</code> prop
				gates whether a node can be (de)selected at all.
			</p>
		</div>
	</div>

	<!-- ───────────────────────────── API summary ──────────────────────────── -->
	<div class="card">
		<h2>API summary</h2>
		<pre class="code">// Single path (existing)
canvasTree.expandNodes('1.2.3');
canvasTree.collapseNodes('1.2.3');

// Array of paths — single emit (rc04)
canvasTree.expandNodes(['1.2.3', '2.1', '3.1.1']);
canvasTree.collapseNodes(['1.2.3', '2.1', '3.1.1']);

// Exclusive focus — collapse others, expand target spine, single pass
canvasTree.expandNodes('1.2.3', {'{ exclusive: true }'});
canvasTree.expandAll('1', {'{ exclusive: true }'});

// noEmit — batch multiple ops, emit once at the end
canvasTree.expandNodes(['1', '2'], {'{ noEmit: true }'});
canvasTree.collapseNodes('3', {'{ noEmit: true }'});
controller.tree.refresh();

// Initial selection from data
&lt;CanvasTree {'{data}'} isSelectedMember="isPreSelected" /&gt;</pre>
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
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.btn {
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.82rem;
		background: #667eea;
		color: white;
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace;
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
		height: 480px;
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

	.code {
		background: #1a202c;
		color: #e2e8f0;
		border-radius: 6px;
		padding: 1rem;
		font-size: 0.85rem;
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace;
		overflow-x: auto;
		line-height: 1.5;
	}

	code {
		background: #edf2f7;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-size: 0.85em;
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
