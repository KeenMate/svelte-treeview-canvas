# @keenmate/svelte-treeview-canvas

Canvas 2D rendering plugin for [`@keenmate/svelte-treeview`](https://github.com/keenmate/svelte-treeview). Renders trees on an HTML Canvas with pan, zoom, multiple layout modes, and full interactivity.

This package was originally part of `@keenmate/svelte-treeview` but has been extracted into its own package to separate concerns — the core package handles tree data, expand/collapse, search, drag & drop logic, while this package provides a high-performance canvas renderer on top of the same core. **You still need `@keenmate/svelte-treeview` installed** — it is a required peer dependency.

## What's New in v1.0.0-rc03

- **Multi-select**: Ctrl+click toggle, Shift+click range, Shift+drag rectangle selection. New `selectedPaths` bindable, `onSelectionChanged` event, `rangeSelectionMode` prop (`'visual'` 2D bounding-box vs `'logical'` tree-order).
- **Double-click expand**: `clickBehavior="select"` mode — single click selects, double-click expands. Ideal for multi-select workflows.
- **4-level context menu**: Node, selection, group box (`onGroupContextMenu`), and canvas (`onCanvasContextMenu`). Selection-aware menus via `selectedNodes` parameter.
- **Canvas Dendrogram example**: Full demo of all multi-select features with localStorage-persisted config.

### v1.0.0-rc02

- **`onCanvasContextMenu` prop**: Right-click empty canvas space (no node) for a canvas-level context menu. Returns `ContextMenuEntry[]`, renders the same styled menu without a node header.
- **Unified Context Menu API**: Shares `ContextMenuEntry` / `ContextMenuDivider` / `ContextMenuItem` types from `@keenmate/svelte-treeview`. Full support for icons, keyboard shortcuts, nested submenus, named dividers, `isVisible`, `isDisabled`, `className="danger"`, and async `onclick`.
- **Context menu keyboard shortcuts**: When either menu is open, pressing a shortcut key (e.g. `V`, `Ctrl+C`) triggers the matching item. Escape closes the menu.
- **Submenu alignment fix**: Submenus now align with their parent item instead of the menu top edge.
- **Context Menu example page**: Interactive demo at `/examples/context-menu` with 7 presets showcasing all menu features, plus canvas-level menu demo.

## Installation

```bash
npm install @keenmate/svelte-treeview @keenmate/svelte-treeview-canvas
```

Both packages are required. `@keenmate/svelte-treeview` provides the core tree logic; this package provides the canvas renderer.

## Quick Start

```svelte
<script lang="ts">
  import { CanvasTree } from '@keenmate/svelte-treeview-canvas';
  import type { LTreeNode } from '@keenmate/svelte-treeview';

  const data = [
    { id: 1, path: '1', parentPath: '', name: 'Root', hasChildren: true },
    { id: 2, path: '1.1', parentPath: '1', name: 'Child A', hasChildren: false },
    { id: 3, path: '1.2', parentPath: '1', name: 'Child B', hasChildren: false },
  ];

  function sortByName(items: LTreeNode<any>[]) {
    return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
  }
</script>

<div style="height: 500px;">
  <CanvasTree
    {data}
    idMember="id"
    pathMember="path"
    sortCallback={sortByName}
    isSorted={true}
    expandLevel={3}
    getNodeLabelCallback={(node) => node.data?.name || node.path}
  />
</div>
```

## Features

- **Layout modes**: Tree, balanced, fishbone, radial, box, and sunburst
- **Pan & zoom**: Mouse wheel zoom, click-drag pan, minimap navigation
- **Level-of-detail (LOD)**: Three zoom tiers (full, medium, simple) for progressive detail reduction
- **Custom node rendering**: Override individual render slots (background, color bar, body, chevron, badge) or the entire node via callbacks
- **CSS variable theming**: `--base-*` shared design tokens flow into `--ct-*` component variables. Priority chain: `theme` prop > `--ct-*` > `--base-*` > hardcoded default
- **Multi-select**: Ctrl+click toggle, Shift+click range (visual 2D or logical tree-order), Shift+drag rectangle selection
- **Drag and drop**: Canvas-native with drop zone overlays (before/after/child)
- **Context menu**: 4 levels — node, selection, group box, canvas. Icons, shortcuts, submenus, dividers, danger styling
- **Tooltip**: DOM-based tooltip snippet over hovered nodes
- **Search integration**: Dimming, match highlighting, and result navigation
- **Focus API**: `focusOnPath()` / `focusOnNode()` with anchor, zoom, and animation options
- **Depth colors**: 10-level cycling palette, configurable per-level via `levelConfig`
- **Per-level overrides**: Height, width, gap, color per depth level

## Layout Modes

| Mode | Description |
|------|-------------|
| `tree` | Classic hierarchical dendrogram |
| `balanced` | Balanced horizontal tree |
| `fishbone` | Alternating top/bottom branches |
| `radial` | Radial/sunburst circular layout |
| `box` | Grid-based box layout |
| `sunburst` | Accordion sunburst with arc rendering |

```svelte
<CanvasTree {data} layoutMode="fishbone" growthDirection="right" ... />
```

## Theming

Set shared design tokens on any ancestor element:

```html
<div style="--base-accent-color: #e11d48; --base-main-bg: #fff1f2;">
  <CanvasTree {data} ... />
</div>
```

Or use the `theme` prop for direct overrides:

```svelte
<CanvasTree {data} theme={{ bg: '#1a1a2e', nodeText: '#e2e8f0' }} ... />
```

Key CSS variables: `--base-accent-color`, `--base-main-bg`, `--base-elevated-bg`, `--base-text-color-1`, `--base-border-color`, `--base-font-family`. Component-specific: `--ct-node-radius`, `--ct-conn-color`, `--ct-menu-bg`, etc.

## Context Menu

```typescript
import type { LTreeNode, ContextMenuEntry } from '@keenmate/svelte-treeview';

function getContextMenu(node: LTreeNode<Item>): ContextMenuEntry[] {
  return [
    { icon: '👤', label: 'View', shortcut: 'V', onclick: () => view(node) },
    { divider: true, label: 'Actions' },
    { icon: '✏️', label: 'Edit', isDisabled: node.data.readonly, onclick: () => edit(node) },
    { icon: '📋', label: 'Copy...', children: [
      { label: 'Name', onclick: () => copyName(node) },
      { label: 'Email', onclick: () => copyEmail(node) },
    ]},
    { divider: true, label: 'Danger zone' },
    { icon: '🗑️', label: 'Delete', className: 'danger', onclick: () => del(node) },
  ];
}
```

```svelte
<CanvasTree {data} onNodeContextMenu={getContextMenu} ... />
```

## Custom Node Rendering

Override individual render slots or the entire node:

```typescript
import type { CanvasRenderContext } from '@keenmate/svelte-treeview-canvas';

function renderBody(rctx: CanvasRenderContext<Item>) {
  const { ctx, node, bounds, config, theme } = rctx;
  ctx.font = config.fontBold;
  ctx.fillStyle = theme.nodeText;
  ctx.fillText(node.data?.name || '', bounds.x + 10, bounds.y + bounds.h / 2);
}
```

```svelte
<CanvasTree {data} renderBodyCallback={renderBody} ... />
```

## Examples

Run the dev server to browse interactive examples:

```bash
npm run dev
```

- **Canvas Dendrogram** — 5000+ nodes with pan, zoom, drag-drop, multi-select, 4-level context menus
- **Org Chart** — Business card nodes with avatars and status indicators
- **NHL Playoff Bracket** — Custom matchup card rendering
- **Theming** — CSS variable presets and geometry controls
- **Context Menu** — All context menu features with 7 preset configurations

## License

MIT - [KeenMate](https://github.com/keenmate)
