<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { TreeController, LTreeNode, ClickBehavior } from '@keenmate/svelte-treeview';

	/**
	 * Minimal e2e fixture for canvas interaction (selection, focus, expand/collapse).
	 * Deliberately tiny + deterministic — the tutorial demo lives at /examples/interaction.
	 *
	 * State is surfaced as text in `.output[data-testid]` blocks so specs can assert
	 * without reading pixels. Canvas hit-testing uses `window.__canvasRect(path)` →
	 * CanvasTree.getNodeScreenRect(path), so a spec can click a node at its live centre.
	 */

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		name: string;
		hasChildren: boolean;
	}

	const sampleData: Item[] = [
		{ id: 1, path: '1', parentPath: '', name: 'Documents', hasChildren: true },
		{ id: 2, path: '1.1', parentPath: '1', name: 'Work', hasChildren: true },
		{ id: 3, path: '1.1.1', parentPath: '1.1', name: 'Reports', hasChildren: false },
		{ id: 4, path: '1.1.2', parentPath: '1.1', name: 'Presentations', hasChildren: false },
		{ id: 5, path: '1.2', parentPath: '1', name: 'Personal', hasChildren: true },
		{ id: 6, path: '1.2.1', parentPath: '1.2', name: 'Photos', hasChildren: false },
		{ id: 7, path: '2', parentPath: '', name: 'Downloads', hasChildren: true },
		{ id: 8, path: '2.1', parentPath: '2', name: 'Software', hasChildren: false }
	];

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	let canvasTreeRef = $state<CanvasTree<Item> | null>(null);
	let ctrlRef = $state<TreeController<Item> | null>(null);
	let clickBehavior = $state<ClickBehavior>('select');
	let selectedPath = $state<string | null>(null);
	let selectedPaths = $state<Set<string>>(new Set());
	let visibleCount = $state(0);
	let totalCount = $state(0);

	// Display the CONTROLLER'S state (source of truth) so both canvas clicks AND
	// programmatic ops (toolbar buttons) reflect immediately — the bound
	// selectedPath/selectedPaths props only update inside CanvasTree's own click
	// handlers, not on external controller mutations.
	let focusedDisplay = $derived(ctrlRef?.focusedNode?.path ?? '(none)');
	let highlightList = $derived(ctrlRef ? [...ctrlRef.highlightedPaths].sort() : []);

	// Expose a live screen-rect getter for coordinate-based canvas clicks in e2e.
	$effect(() => {
		if (canvasTreeRef) {
			(window as unknown as Record<string, unknown>).__canvasRect = (path: string) =>
				canvasTreeRef?.getNodeScreenRect(path) ?? null;
			(window as unknown as Record<string, unknown>).__canvasReady = true;
		}
	});
</script>

<h1>Canvas Interaction — test fixture</h1>

<div class="toolbar">
	<label>
		Click behavior:
		<select bind:value={clickBehavior} data-testid="click-behavior">
			<option value="select">select</option>
			<option value="expand">expand</option>
			<option value="expand-and-focus">expand-and-focus</option>
		</select>
	</label>
	<button onclick={() => canvasTreeRef?.expandAll()}>Expand All</button>
	<button onclick={() => canvasTreeRef?.collapseAll()}>Collapse All</button>
	<button onclick={() => canvasTreeRef?.zoomToFit()}>Fit</button>
	<button onclick={() => ctrlRef?.clearHighlight()}>Clear Selection</button>
</div>

<div class="canvas-host" data-testid="canvas-host">
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
		bind:visibleCount
		bind:totalCount
		getNodeLabelCallback={(node) => node.data?.name || node.path}
	/>
</div>

<div class="outputs">
	<div class="output">
		<p class="output-label">Focused Path</p>
		<pre data-testid="focused-path">{focusedDisplay}</pre>
	</div>
	<div class="output">
		<p class="output-label">Highlighted</p>
		<pre data-testid="highlighted-paths">{highlightList.length > 0 ? highlightList.join(', ') : '(none)'}</pre>
	</div>
	<div class="output">
		<p class="output-label">Highlighted Count</p>
		<pre data-testid="highlighted-count">{highlightList.length}</pre>
	</div>
	<div class="output">
		<p class="output-label">Visible / Total</p>
		<pre data-testid="visible-total">{visibleCount}/{totalCount}</pre>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.canvas-host {
		width: 820px;
		height: 460px;
		border: 1px solid #ccc;
	}
	.outputs {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}
	.output {
		min-width: 180px;
	}
	.output-label {
		font-weight: 600;
		margin: 0 0 0.25rem;
	}
	pre {
		margin: 0;
		padding: 0.4rem 0.6rem;
		background: #f4f4f4;
		border-radius: 4px;
		min-height: 1.2rem;
	}
</style>
