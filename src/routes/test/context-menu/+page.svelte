<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { TreeController, LTreeNode, ContextMenuEntry } from '@keenmate/svelte-treeview';

	/**
	 * Minimal e2e fixture for the canvas context menu. The menu renders as REAL DOM
	 * (`.canvas-tree-ctx-menu` / `.canvas-tree-ctx-menu-item`), so specs query it by
	 * selector. Opening it needs a right-click at a node's screen position — exposed
	 * via `window.__canvasRect(path)` (CanvasTree.getNodeScreenRect).
	 *
	 * Last menu action is echoed into `.output[data-testid="last-action"]`.
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
		{ id: 2, path: '1.1', parentPath: '1', name: 'Work', hasChildren: false },
		{ id: 3, path: '1.2', parentPath: '1', name: 'Personal', hasChildren: false },
		{ id: 4, path: '2', parentPath: '', name: 'Downloads', hasChildren: false }
	];

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	let canvasTreeRef = $state<CanvasTree<Item> | null>(null);
	let ctrlRef = $state<TreeController<Item> | null>(null);
	let lastAction = $state('(none)');

	function getContextMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
		const name = node.data?.name ?? node.path;
		return [
			{ id: 'rename', icon: '✏️', label: 'Rename', onclick: () => { lastAction = `rename:${name}`; } },
			{ id: 'duplicate', icon: '📄', label: 'Duplicate', onclick: () => { lastAction = `duplicate:${name}`; } },
			{ divider: true, label: 'Danger zone' },
			{
				id: 'delete',
				icon: '🗑️',
				label: 'Delete',
				className: 'danger',
				onclick: () => { lastAction = `delete:${name}`; }
			}
		];
	}

	function getCanvasContextMenu(): ContextMenuEntry[] {
		return [
			{ id: 'expand-all', label: 'Expand All', onclick: () => { lastAction = 'canvas:expand-all'; } },
			{ id: 'collapse-all', label: 'Collapse All', onclick: () => { lastAction = 'canvas:collapse-all'; } }
		];
	}

	$effect(() => {
		if (canvasTreeRef) {
			(window as unknown as Record<string, unknown>).__canvasRect = (path: string) =>
				canvasTreeRef?.getNodeScreenRect(path) ?? null;
			(window as unknown as Record<string, unknown>).__canvasReady = true;
		}
	});
</script>

<h1>Canvas Context Menu — test fixture</h1>

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
		getNodeLabelCallback={(node) => node.data?.name || node.path}
		getNodeContextMenuItemsCallback={getContextMenu}
		getCanvasContextMenuItemsCallback={getCanvasContextMenu}
	/>
</div>

<div class="output">
	<p class="output-label">Last Action</p>
	<pre data-testid="last-action">{lastAction}</pre>
</div>

<style>
	.canvas-host {
		width: 820px;
		height: 460px;
		border: 1px solid #ccc;
	}
	.output {
		margin-top: 0.75rem;
		min-width: 240px;
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
