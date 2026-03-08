# Context Menu Comparison: web-treeview (prod) vs svelte-treeview (v5) vs canvas-tree

## ContextMenuItem Interface

Each package has its own version of the interface. web-treeview has diverged significantly.

### web-treeview (prod)

```typescript
interface ContextMenuItem {
  id?: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  visible?: boolean;
  danger?: boolean;
  dividerBefore?: boolean;
  className?: string;
  onclick?: () => void | Promise<void>;
  children?: ContextMenuItem[];   // nested submenus, any depth
}
```

### svelte-treeview (v5)

```typescript
interface ContextMenuItem {
  icon?: string;
  title: string;
  isDisabled?: boolean;
  callback: () => void | Promise<void>;
  isDivider?: boolean;
  className?: string;
}
```

### canvas-tree

Re-exports svelte-treeview's `ContextMenuItem` type.

## Interface Field Comparison

| Feature | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|---------|:-------------------:|:--------------------:|:-----------:|
| **Text field** | `label` | `title` | `title` (re-export) |
| **Action field** | `onclick` | `callback` | `callback` (re-export) |
| **Disabled field** | `disabled` | `isDisabled` | `isDisabled` (re-export) |
| **Icon** | `icon` — `<span>` element, fixed 16px width | `icon` — `<span>` element, fixed 16px width | `icon` — inline string concat (`${icon} ${title}`) |
| **Divider** | `dividerBefore: true` (divider above item) | `isDivider: true` (item IS a divider) | `isDivider: true` (re-export) |
| **Danger styling** | `danger: true` — red text + red hover bg | `className: 'danger'` — manual | Not supported |
| **Visibility** | `visible: false` hides item | Not supported | Not supported |
| **Keyboard shortcut** | `shortcut` — rendered right-aligned in muted text | Not supported | Not supported |
| **Custom class** | `className` | `className` | **Not used** |
| **Item ID** | `id` — for `renderContextMenuItemCallback` targeting | Not supported | Not supported |
| **Nested submenus** | `children: ContextMenuItem[]` — any depth, submenu arrow (▸), hover to open | Not supported | Not supported |

## Callback Signature

| Package | Prop name | Signature |
|---------|-----------|-----------|
| web-treeview (prod) | `contextMenuCallback` | `(node, closeMenuCallback) => ContextMenuItem[]` |
| svelte-treeview (v5) | `contextMenuCallback` | `(node, closeMenuCallback) => ContextMenuItem[]` |
| canvas-tree | `onNodeContextMenu` | `(node) => ContextMenuItem[]` — no `closeMenu` param |

## Custom Item Rendering

| Feature | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|---------|:-------------------:|:--------------------:|:-----------:|
| **Per-item custom render** | `renderContextMenuItemCallback(item, node, container)` — fill container for custom markup, leave empty for default | Not supported | Not supported |
| **Full menu override** | Not supported | `{#snippet contextMenu}` — replaces entire menu | Not supported |

web-treeview example:
```typescript
tree.renderContextMenuItemCallback = (item, node, container) => {
  if (item.id === 'profile') {
    container.innerHTML = `
      <span class="avatar">${node.data.name[0]}</span>
      <span>${node.data.name}</span>
      <small>${node.data.role}</small>`;
    return; // custom
  }
  // leave empty → default icon + label + shortcut rendering
};
```

## Rendering

| Aspect | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|--------|:-------------------:|:--------------------:|:-----------:|
| **Item element** | `<div>` | `<div>` | `<button>` |
| **`role="menuitem"`** | Yes | Yes | No |
| **`tabindex`** | Yes (0 or -1 based on disabled) | Same | No |
| **Keyboard (Enter/Space)** | `onkeydown` handler | Same | No (native `<button>` Enter only) |
| **Node label header** | No | No | Yes (muted header above items) |
| **Submenu support** | Yes — `children` items show ▸ arrow, hover opens nested menu | No | No |

## Auto-Close Behavior

| Trigger | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|---------|:-------------------:|:--------------------:|:-----------:|
| Click outside | `document click` + `contextmenu` | Same (TreeController) | TreeController |
| Scroll | `window scroll`, `document scroll`, `window wheel` | Same (TreeController) | **Missing** |
| Escape key | Yes (`_updateContextMenuListeners()`, cleaned up via `_contextMenuCleanup`) | Not implemented | Yes |
| After item click | Callback responsible for `closeMenu()` | Same | Always auto-closes |

## Positioning & Configuration

| Config | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|--------|:-------------------:|:--------------------:|:-----------:|
| `contextMenuXOffset` | Prop (default 8) | Same | Hardcoded 8 (passed to TreeController) |
| `contextMenuYOffset` | Prop (default 0) | Same | Hardcoded 4 |
| Debug mode | `shouldDisplayContextMenuInDebugMode` | Same | No |

## Styling

| Aspect | web-treeview (prod) | svelte-treeview (v5) | canvas-tree |
|--------|:-------------------:|:--------------------:|:-----------:|
| **Default theme** | Light (white bg) | Same | Dark (slate bg) |
| **CSS class prefix** | `.ltree-context-menu*` | Same | `.canvas-tree-ctx-menu*` |
| **CSS variables** | `--ltree-border`, `--ltree-body-color`, `--ltree-light`, `--ltree-danger` | Same | `--ct-menu-bg`, `--ct-menu-text`, `--ct-menu-hover`, `--ct-menu-radius` |
| **Min width** | 150px | 150px | 160px |
| **Border radius** | 4px | 4px | 8px (via `--ct-menu-radius`) |
| **Shadow** | `0 2px 10px rgba(0,0,0,0.1)` | Same | `0 8px 24px rgba(0,0,0,0.25)` |
| **`.danger` support** | `danger: true` field — red text + red hover bg | `className: 'danger'` — manual class | Not supported |

## Gaps Summary

### svelte-treeview (v5) vs web-treeview

- No `id` field on items
- No `shortcut` display
- No `visible` toggle
- No `danger` as first-class field (requires manual className)
- No `dividerBefore` (divider is a separate item, not a flag)
- No nested submenus (`children`)
- No per-item custom render callback (`renderContextMenuItemCallback`)
- No Escape key close

### canvas-tree vs web-treeview

- No `closeMenu` callback param — callers can't control when menu closes
- No `className` support on items
- No `await`/try-catch on async callbacks
- No accessibility attributes (`role`, `tabindex`, keyboard navigation)
- No scroll-close listeners
- No icon element — icons concatenated as text (no fixed-width alignment)
- No snippet/slot fallback for fully custom menu HTML
- No debug mode
- No configurable X/Y offset props
- No `id`, `shortcut`, `visible`, `danger`, `dividerBefore` fields
- No nested submenus (`children`)
- No per-item custom render callback
