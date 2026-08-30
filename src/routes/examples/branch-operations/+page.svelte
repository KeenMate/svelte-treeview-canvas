<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import { TreeController, getClipboard, clearClipboard } from '@keenmate/svelte-treeview';
	import type { LTreeNode, ContextMenuEntry, ClipboardEntry, PasteResult } from '@keenmate/svelte-treeview';
	import type { GrowthDirection, ClickBehavior } from '$lib/types.js';

	// ── Types ──────────────────────────────────────────────────────────────

	interface OrgNode {
		id: number;
		path: string;
		parentPath: string;
		level: number;
		name: string;
		hasChildren: boolean;
		isExpanded?: boolean;
	}

	// ── Data generation ───────────────────────────────────────────────────

	function createInitialData(): OrgNode[] {
		let id = 1;
		const nodes: OrgNode[] = [];

		function add(path: string, parentPath: string, level: number, name: string, hasChildren: boolean) {
			nodes.push({ id: id++, path, parentPath, level, name, hasChildren });
		}

		add('1', '', 1, 'Company HQ', true);
		add('1.1', '1', 2, 'Engineering', true);
		add('1.1.1', '1.1', 3, 'Frontend', true);
		add('1.1.1.1', '1.1.1', 4, 'Alice', false);
		add('1.1.1.2', '1.1.1', 4, 'Bob', false);
		add('1.1.1.3', '1.1.1', 4, 'Carol', false);
		add('1.1.2', '1.1', 3, 'Backend', true);
		add('1.1.2.1', '1.1.2', 4, 'Charlie', false);
		add('1.1.2.2', '1.1.2', 4, 'Dave', false);
		add('1.1.3', '1.1', 3, 'DevOps', true);
		add('1.1.3.1', '1.1.3', 4, 'Eve', false);
		add('1.2', '1', 2, 'Design', true);
		add('1.2.1', '1.2', 3, 'UX', true);
		add('1.2.1.1', '1.2.1', 4, 'Diana', false);
		add('1.2.1.2', '1.2.1', 4, 'Frank', false);
		add('1.2.2', '1.2', 3, 'Visual', true);
		add('1.2.2.1', '1.2.2', 4, 'Grace', false);
		add('2', '', 1, 'Operations', true);
		add('2.1', '2', 2, 'HR', true);
		add('2.1.1', '2.1', 3, 'Recruiting', true);
		add('2.1.1.1', '2.1.1', 4, 'Hank', false);
		add('2.1.2', '2.1', 3, 'Culture', false);
		add('2.2', '2', 2, 'Finance', true);
		add('2.2.1', '2.2', 3, 'Accounting', false);
		add('2.2.2', '2.2', 3, 'Payroll', false);
		add('3', '', 1, 'Sales', true);
		add('3.1', '3', 2, 'Enterprise', true);
		add('3.1.1', '3.1', 3, 'EMEA', false);
		add('3.1.2', '3.1', 3, 'APAC', false);
		add('3.1.3', '3.1', 3, 'Americas', false);
		add('3.2', '3', 2, 'SMB', true);
		add('3.2.1', '3.2', 3, 'Inbound', false);
		add('3.2.2', '3.2', 3, 'Outbound', false);

		return nodes;
	}

	// ── State ──────────────────────────────────────────────────────────────

	let treeData = $state.raw<OrgNode[]>(createInitialData());
	let treeKey = $state(0);
	let nextId = 200;

	let selectedPath = $state<string | null>(null);
	let selectedPaths = $state<Set<string>>(new Set());
	let ctrlRef = $state<TreeController<OrgNode> | null>(null);
	let canvasTreeRef: ReturnType<typeof CanvasTree> | undefined = $state();

	// Metrics
	let layoutTime = $state(0);
	let drawTime = $state(0);
	let visibleCount = $state(0);
	let totalCount = $state(0);

	// Config
	let growthDirection: GrowthDirection = $state('right');
	let clickBehavior: ClickBehavior = $state('select');

	// Server simulation
	let serverDelay = $state(1500);
	let isProcessing = $state(false);
	let processingMessage = $state('');

	// Activity log
	let activityLog = $state<string[]>([]);

	function addLog(message: string) {
		activityLog = [`${new Date().toLocaleTimeString()} - ${message}`, ...activityLog.slice(0, 19)];
	}

	function sortCallback(items: LTreeNode<OrgNode>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function resetTree() {
		nextId = 200;
		treeData = createInitialData();
		treeKey++;
		selectedPath = null;
		selectedPaths = new Set();
		isProcessing = false;
		activityLog = [];
	}

	// Set shouldAutoHandlePaste=false on the controller once it's available
	// so paste goes through our async server flow instead of instant tree mutation
	$effect(() => {
		if (ctrlRef) {
			ctrlRef.shouldAutoHandlePaste = false;
		}
	});

	// ── Simulated server: recalculate paths for moved branch ─────────

	function simulateServerMoveBranch(
		entries: ClipboardEntry<OrgNode>[],
		targetParentPath: string,
		targetParentLevel: number
	): Promise<OrgNode[]> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const result: OrgNode[] = [];

				for (const entry of entries) {
					const oldRootPath = entry.sourcePath;
					const newRootId = nextId++;
					const newRootPath = targetParentPath
						? `${targetParentPath}.${newRootId}`
						: `${newRootId}`;

					// Root node of this entry
					const rootData = entry.data;
					const rootLevel = targetParentLevel + 1;
					result.push({
						...rootData,
						id: nextId++,
						path: newRootPath,
						parentPath: targetParentPath,
						level: rootLevel,
						hasChildren: entry.descendants.length > 0,
					});

					// Descendants — remap paths relative to new root
					for (const desc of entry.descendants) {
						const newPath = newRootPath + desc.relativePath;
						const parentRelPath = desc.relativePath.substring(
							0, desc.relativePath.lastIndexOf('.')
						);
						const newParentPath = parentRelPath
							? newRootPath + parentRelPath
							: newRootPath;
						const descLevel = rootLevel + (desc.relativePath.split('.').length - 1);

						result.push({
							...desc.data,
							id: nextId++,
							path: newPath,
							parentPath: newParentPath,
							level: descLevel,
						});
					}
				}

				resolve(result);
			}, serverDelay);
		});
	}

	// ── Paste handler (called by built-in clipboard when shouldAutoHandlePaste=false) ──

	async function handlePaste(pasteResult: PasteResult<OrgNode>) {
		if (!pasteResult.entries || !ctrlRef) return;

		const operation = pasteResult.operation || 'copy';
		const targetPath = pasteResult.targetPath || '';
		const targetNode = targetPath ? ctrlRef.getNodeByPath(targetPath) : null;
		const targetName = targetNode?.data?.name || (targetPath || 'Root');
		const targetLevel = targetNode?.level ?? 0;

		const entryNames = pasteResult.entries.map(e => e.data?.name || e.sourcePath).join(', ');
		const nodeCount = pasteResult.entries.reduce((sum, e) => sum + 1 + e.descendants.length, 0);

		isProcessing = true;
		processingMessage = `Moving "${entryNames}" under "${targetName}"...`;
		addLog(`Sending ${operation} request to server: "${entryNames}" -> "${targetName}" (${nodeCount} nodes)`);

		const startTime = performance.now();

		try {
			// 1. Simulate server call — recalculate paths, assign new IDs
			const serverResult = await simulateServerMoveBranch(
				pasteResult.entries, targetPath, targetLevel
			);
			const serverTime = (performance.now() - startTime).toFixed(0);

			processingMessage = `Server responded (${serverTime}ms). Applying changes...`;

			// 2. If cut, delete old branches
			if (operation === 'cut') {
				for (const entry of pasteResult.entries) {
					const deleteResult = ctrlRef.deleteBranch(entry.sourcePath);
					if (!deleteResult.success) {
						addLog(`Failed to remove source "${entry.sourcePath}": ${deleteResult.error}`);
					}
				}
			}

			// 3. Insert new branch at target using server-recalculated data
			const insertResult = ctrlRef.insertBranch(targetPath, serverResult);

			const totalTime = (performance.now() - startTime).toFixed(0);

			addLog(
				`${operation === 'cut' ? 'Moved' : 'Copied'} "${entryNames}" under "${targetName}": ` +
				`inserted ${insertResult.count} nodes. ` +
				`Server: ${serverTime}ms, total: ${totalTime}ms`
			);

			// Expand the target so the pasted branch is visible
			if (targetPath) ctrlRef.expandNodes(targetPath);
		} catch (err) {
			addLog(`Server error: ${err}`);
		} finally {
			isProcessing = false;
			processingMessage = '';
		}
	}

	// Required by enableClipboard — transforms data for the clipboard snapshot
	function transformDataForPaste(data: OrgNode): OrgNode | null {
		return { ...data, id: nextId++ };
	}

	// ── Context menus ──────────────────────────────────────────────────

	function getNodeContextMenu(node: LTreeNode<OrgNode>, selectedNodes?: LTreeNode<OrgNode>[]): ContextMenuEntry[] {
		const items: ContextMenuEntry[] = [];

		// Focus
		items.push({
			icon: '\u{1F3AF}', label: 'Focus on node',
			onclick: () => canvasTreeRef?.focusOnPath(node.path)
		});

		if (node.hasChildren) {
			if (node.isExpanded) {
				items.push({ icon: '\u{1F4C1}', label: 'Collapse', onclick: () => ctrlRef?.collapseNodes(node.path) });
			} else {
				items.push({ icon: '\u{1F4C2}', label: 'Expand', onclick: () => ctrlRef?.expandNodes(node.path) });
			}
		}

		items.push({ divider: true, label: 'Move Branch' });

		// Cut — uses built-in clipboard (dims nodes, Ctrl+X also works)
		items.push({
			icon: '\u{2702}\u{FE0F}', label: 'Cut branch', shortcut: 'Ctrl+X',
			isDisabled: isProcessing,
			onclick: () => {
				ctrlRef?.cutNodes([node.path]);
				addLog(`Cut "${node.data?.name}" (ready to paste)`);
			}
		});

		// Copy
		items.push({
			icon: '\u{1F4CB}', label: 'Copy branch', shortcut: 'Ctrl+C',
			isDisabled: isProcessing,
			onclick: () => {
				ctrlRef?.copyNodes([node.path]);
				addLog(`Copied "${node.data?.name}"`);
			}
		});

		// Paste — triggers async server flow
		if (ctrlRef?.hasClipboardContent()) {
			const clipOp = ctrlRef.getClipboardOperation();
			items.push({
				icon: '\u{1F4CC}', label: `Paste as child (${clipOp})`, shortcut: 'Ctrl+V',
				isDisabled: isProcessing,
				onclick: () => {
					if (!ctrlRef) return;
					// pasteNodes with shouldAutoHandlePaste=false forwards to onPaste handler
					ctrlRef.pasteNodes(node.path, transformDataForPaste, 'child');
				}
			});
		}

		items.push({ divider: true, label: 'Branch Ops' });

		// Insert branch
		items.push({
			icon: '\u{2795}', label: 'Insert branch (7 nodes)',
			isDisabled: isProcessing,
			onclick: () => {
				if (!ctrlRef) return;
				const parentLevel = node.level ?? 0;
				const basePath = `${node.path}.${nextId}`;
				const nodes: OrgNode[] = [
					{ id: nextId++, path: basePath, parentPath: node.path, level: parentLevel + 1, name: 'New Division', hasChildren: true },
					{ id: nextId++, path: `${basePath}.1`, parentPath: basePath, level: parentLevel + 2, name: 'Team Alpha', hasChildren: true },
					{ id: nextId++, path: `${basePath}.1.1`, parentPath: `${basePath}.1`, level: parentLevel + 3, name: 'Member A', hasChildren: false },
					{ id: nextId++, path: `${basePath}.1.2`, parentPath: `${basePath}.1`, level: parentLevel + 3, name: 'Member B', hasChildren: false },
					{ id: nextId++, path: `${basePath}.2`, parentPath: basePath, level: parentLevel + 2, name: 'Team Beta', hasChildren: true },
					{ id: nextId++, path: `${basePath}.2.1`, parentPath: `${basePath}.2`, level: parentLevel + 3, name: 'Member C', hasChildren: false },
					{ id: nextId++, path: `${basePath}.2.2`, parentPath: `${basePath}.2`, level: parentLevel + 3, name: 'Member D', hasChildren: false },
				];
				const result = ctrlRef.insertBranch(node.path, nodes);
				addLog(`insertBranch: Added ${result.count} nodes under "${node.data?.name}"`);
			}
		});

		// Delete
		items.push({
			icon: '\u{1F5D1}\u{FE0F}', label: 'Delete branch', className: 'danger',
			isDisabled: isProcessing,
			onclick: () => {
				if (!ctrlRef) return;
				const result = ctrlRef.deleteBranch(node.path);
				addLog(`deleteBranch: Removed "${node.data?.name}" (${result.removedCount} nodes)`);
				selectedPath = null;
			}
		});

		if (node.hasChildren) {
			items.push({
				icon: '\u{1F9F9}', label: 'Clear children only',
				isDisabled: isProcessing,
				onclick: () => {
					if (!ctrlRef) return;
					const result = ctrlRef.deleteBranch(node.path, true);
					addLog(`Cleared ${result.removedCount} children from "${node.data?.name}"`);
				}
			});
		}

		return items;
	}

	function getGroupContextMenu(parentNode: LTreeNode<OrgNode>, childNodes: LTreeNode<OrgNode>[]): ContextMenuEntry[] {
		const items: ContextMenuEntry[] = [];

		if (parentNode.isExpanded) {
			items.push({ icon: '\u{1F4C1}', label: `Collapse "${parentNode.data?.name}"`, onclick: () => ctrlRef?.collapseNodes(parentNode.path) });
		} else {
			items.push({ icon: '\u{1F4C2}', label: `Expand "${parentNode.data?.name}"`, onclick: () => ctrlRef?.expandNodes(parentNode.path) });
		}

		items.push({ divider: true, label: `${childNodes.length} children` });

		items.push({
			icon: '\u{2702}\u{FE0F}', label: `Cut "${parentNode.data?.name}"`,
			isDisabled: isProcessing,
			onclick: () => {
				ctrlRef?.cutNodes([parentNode.path]);
				addLog(`Cut "${parentNode.data?.name}" (ready to paste)`);
			}
		});

		if (ctrlRef?.hasClipboardContent()) {
			items.push({
				icon: '\u{1F4CC}', label: `Paste into "${parentNode.data?.name}"`,
				isDisabled: isProcessing,
				onclick: () => {
					if (!ctrlRef) return;
					ctrlRef.pasteNodes(parentNode.path, transformDataForPaste, 'child');
				}
			});
		}

		return items;
	}

	function getCanvasEmptyContextMenu(): ContextMenuEntry[] {
		const items: ContextMenuEntry[] = [];

		items.push({
			icon: '\u{1F50D}', label: 'Zoom to Fit', shortcut: 'F',
			onclick: () => canvasTreeRef?.zoomToFit()
		});

		items.push({ divider: true });
		items.push({ icon: '\u{1F4C2}', label: 'Expand All', onclick: () => canvasTreeRef?.expandAll() });
		items.push({ icon: '\u{1F4C1}', label: 'Collapse All', onclick: () => canvasTreeRef?.collapseAll() });

		items.push({ divider: true });
		items.push({
			icon: '\u{1F504}', label: 'Reset tree',
			isDisabled: isProcessing,
			onclick: () => resetTree()
		});

		if (ctrlRef?.hasClipboardContent()) {
			items.push({ divider: true, label: 'Clipboard' });
			items.push({
				icon: '\u{1F4CC}', label: 'Paste at root',
				isDisabled: isProcessing,
				onclick: () => {
					if (!ctrlRef) return;
					ctrlRef.pasteNodes('', transformDataForPaste, 'child');
				}
			});
			items.push({
				icon: '\u{274C}', label: 'Cancel cut/copy',
				onclick: () => {
					clearClipboard();
					if (ctrlRef) ctrlRef.cutPaths = new Set();
					addLog('Clipboard cleared');
				}
			});
		}

		return items;
	}
</script>

<svelte:head>
	<title>Branch Operations - Svelte Treeview Canvas</title>
	<link rel="stylesheet" href="/examples-shared.css" />
</svelte:head>

<div class="container">
	<header>
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Branch Operations</h1>
		<p class="subtitle">
			Cut a branch, paste it onto another node. The move is processed by a simulated
			server (configurable delay), which recalculates paths and IDs. The tree updates
			via <code>deleteBranch</code> + <code>insertBranch</code> with a single emission each.
		</p>
	</header>

	<!-- How to use -->
	<div class="card workflow-card">
		<h2>Workflow</h2>
		<div class="workflow-steps">
			<div class="step">
				<span class="step-num">1</span>
				<div>
					<strong>Ctrl+X</strong> (or right-click → Cut branch).
					The cut nodes are dimmed on canvas.
				</div>
			</div>
			<div class="step">
				<span class="step-num">2</span>
				<div>
					<strong>Click a target node</strong>, then <strong>Ctrl+V</strong>
					(or right-click → Paste). Sends the move to the simulated server.
				</div>
			</div>
			<div class="step">
				<span class="step-num">3</span>
				<div>
					<strong>Server processes</strong> ({serverDelay}ms): recalculates paths,
					assigns new IDs, validates. A loading overlay is shown.
				</div>
			</div>
			<div class="step">
				<span class="step-num">4</span>
				<div>
					<strong>Tree updates</strong>: <code>deleteBranch</code> removes the source,
					<code>insertBranch</code> inserts the server result. Single emission each.
				</div>
			</div>
		</div>
	</div>

	<!-- Canvas tree -->
	<div class="card">
		<div class="tree-header">
			<h2>Org Chart</h2>

			<div class="controls">
				<span class="orientation-toggle">
					<button class="btn orient-btn" class:orient-active={growthDirection === 'right'} onclick={() => { growthDirection = 'right'; canvasTreeRef?.setGrowthDirection('right'); }}>Right</button>
					<button class="btn orient-btn" class:orient-active={growthDirection === 'down'} onclick={() => { growthDirection = 'down'; canvasTreeRef?.setGrowthDirection('down'); }}>Down</button>
				</span>
				<button class="btn secondary" onclick={() => canvasTreeRef?.zoomToFit()}>Zoom to Fit</button>
				<button class="btn secondary" onclick={resetTree} disabled={isProcessing}>Reset</button>
			</div>
		</div>

		<div class="canvas-wrapper" class:canvas-processing={isProcessing}>
			{#key treeKey}
				<CanvasTree
					bind:this={canvasTreeRef}
					data={treeData}
					idMember="id"
					pathMember="path"
					parentPathMember="parentPath"
					levelMember="level"
					hasChildrenMember="hasChildren"
					isExpandedMember="isExpanded"
					{sortCallback}
					isSorted={true}
					expandLevel={2}
					bind:selectedPath
					bind:selectedPaths
					bind:controller={ctrlRef}
					bind:layoutTime
					bind:drawTime
					bind:visibleCount
					bind:totalCount
					bind:growthDirection
					bind:clickBehavior
					groupSiblings={true}
					enableClipboard={true}
					{transformDataForPaste}
					onPaste={handlePaste}
					getNodeLabelCallback={(node) => node.data?.name || node.path}
					getNodeContextMenuItemsCallback={getNodeContextMenu}
					getGroupContextMenuItemsCallback={getGroupContextMenu}
					getCanvasContextMenuItemsCallback={getCanvasEmptyContextMenu}
				/>
			{/key}

			{#if isProcessing}
				<div class="processing-overlay">
					<div class="processing-spinner"></div>
					<p>{processingMessage}</p>
				</div>
			{/if}
		</div>

		<div class="metrics-bar">
			<span>Total: <strong>{totalCount}</strong></span>
			<span>Visible: <strong>{visibleCount}</strong></span>
			<span>Layout: <strong>{layoutTime.toFixed(1)}ms</strong></span>
			<span>Draw: <strong>{drawTime.toFixed(1)}ms</strong></span>
			{#if selectedPath}
				<span>Selected: <strong>{ctrlRef?.getNodeByPath(selectedPath)?.data?.name || selectedPath}</strong></span>
			{/if}
		</div>
	</div>

	<!-- Server config + activity log -->
	<div class="bottom-grid">
		<div class="card">
			<h3>Server Simulation</h3>
			<label class="delay-control">
				<span>Response delay:</span>
				<input type="range" min="200" max="5000" step="100" bind:value={serverDelay} disabled={isProcessing} />
				<span class="delay-value">{serverDelay}ms</span>
			</label>
			<p class="hint">
				Simulates the time a real server would take to validate the move,
				recalculate paths/IDs in the database, and return the result.
			</p>

			<div class="code-block">
				<pre><code>{`// shouldAutoHandlePaste = false → paste goes to onPaste
ctrl.shouldAutoHandlePaste = false;

// onPaste handler receives clipboard data
async function handlePaste(result) {
  showLoading();
  // Send to server for path recalculation
  const serverData = await api.moveBranch(
    result.entries, targetPath
  );
  // Apply server response
  ctrl.deleteBranch(sourcePath);
  ctrl.insertBranch(targetPath, serverData);
  hideLoading();
}`}</code></pre>
			</div>
		</div>

		<div class="card">
			<h3>Activity Log</h3>
			<div class="log-entries">
				{#if activityLog.length === 0}
					<p class="hint">
						Select a node and press <strong>Ctrl+X</strong> to cut.
						Then select a target and press <strong>Ctrl+V</strong> to paste.
						Or use the right-click context menu.
					</p>
				{:else}
					{#each activityLog as entry}
						<p class="log-entry">{entry}</p>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.canvas-wrapper {
		position: relative;
		width: 100%;
		height: 500px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 0.75rem;
		transition: border-color 0.3s;
	}

	.canvas-processing {
		border-color: #818cf8;
	}

	.processing-overlay {
		position: absolute;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		z-index: 10;
		backdrop-filter: blur(2px);
	}

	.processing-overlay p {
		color: white;
		font-size: 0.95rem;
		font-weight: 500;
		margin: 0;
		text-shadow: 0 1px 3px rgba(0,0,0,0.4);
	}

	.processing-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255,255,255,0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.tree-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tree-header h2 {
		margin: 0;
	}

	.metrics-bar {
		display: flex;
		gap: 1.5rem;
		padding: 0.5rem 0;
		font-size: 0.8rem;
		color: #64748b;
		flex-wrap: wrap;
	}

	.metrics-bar strong {
		color: #334155;
	}

	/* Workflow card */

	.workflow-card h2 {
		margin: 0 0 0.75rem;
	}

	.workflow-steps {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 0.75rem;
	}

	.step {
		display: flex;
		gap: 0.6rem;
		font-size: 0.85rem;
		color: #475569;
		line-height: 1.5;
	}

	.step-num {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: #6366f1;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		margin-top: 1px;
	}

	.step code {
		font-size: 0.8em;
		background: #f1f5f9;
		padding: 0.1em 0.3em;
		border-radius: 3px;
		color: #6366f1;
	}

	/* Bottom grid */

	.bottom-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	@media (max-width: 800px) {
		.bottom-grid {
			grid-template-columns: 1fr;
		}
	}

	.delay-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.delay-control input[type="range"] {
		flex: 1;
		accent-color: #6366f1;
	}

	.delay-value {
		min-width: 55px;
		text-align: right;
		font-weight: 600;
		color: #334155;
		font-variant-numeric: tabular-nums;
	}

	.hint {
		font-size: 0.8rem;
		color: #94a3b8;
		margin: 0 0 0.75rem;
	}

	.log-entries {
		max-height: 240px;
		overflow-y: auto;
	}

	.log-entry {
		font-size: 0.8rem;
		font-family: 'SF Mono', 'Cascadia Code', monospace;
		color: #475569;
		margin: 0.15rem 0;
		padding: 0.15rem 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.code-block {
		background: #1e293b;
		color: #e2e8f0;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.code-block pre {
		margin: 0;
	}

	.code-block code {
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
	}
</style>
