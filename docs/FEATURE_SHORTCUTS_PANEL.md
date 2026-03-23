# Feature Spec: Keyboard Shortcuts Panel

## Overview

A collapsible shortcuts reference panel in the bottom-left corner that dynamically displays relevant keyboard shortcuts based on the current mode and selection state.

## UI Specification

### Panel Design
- **Position**: Fixed to bottom-left corner, above the command bar
- **Initial State**: Expanded (open at start)
- **Dimensions**: ~280px width, dynamic height based on content (max ~200px when expanded)
- **Collapsed State**: Shows only a toggle button (~28px height)

### Visual Style
- Consistent with existing panel styling (`.panel` class patterns)
- Background: `var(--bg-secondary)` (#161b22)
- Border: 1px solid `var(--border)` (#30363d)
- Header: 28px with "Shortcuts" title and minimize/expand toggle
- Content: Scrollable shortcut list, monospace font (12px)

### Toggle Button
- Position: Within the panel header, right side
- Icon: `−` (minimize) / `+` (expand)
- Hover: Slight background highlight

## Behavior Specification

### Shortcut Display Logic

Shortcuts are grouped by category and filtered by context:

| Mode | Context | Categories Shown |
|------|---------|------------------|
| `normal` | Always | Navigation, Modes, Objects, Actions |
| `insert` | Always | Actions (cancel), Objects |
| `vertex` | Always | Movement, Actions |
| `edge` | Always | Movement, Actions |
| `face` | No face selected | Mode exit hint |
| `face` | Face selected | Movement, UV Actions |
| `uv` (editor open) | No UV selected | Mode exit hint |
| `uv` (editor open) | UV selected | UV Movement |

### Shortcut Definitions

```javascript
const SHORTCUTS = {
  normal: [
    { category: 'Navigation', items: [
      { key: 'h/j/k/l', desc: 'Pan camera' },
      { key: 'H/J', desc: 'Zoom in/out' },
      { key: 'w/s', desc: 'Zoom' },
      { key: 'q/e', desc: 'Orbit horizontal' },
      { key: 'Q/E', desc: 'Orbit vertical' },
    ]},
    { category: 'Modes', items: [
      { key: 'i', desc: 'Insert mode' },
      { key: 'g', desc: 'Vertex mode' },
      { key: 'z', desc: 'Edge mode' },
      { key: 'f', desc: 'Face mode' },
    ]},
    { category: 'Objects', items: [
      { key: '1-8', desc: 'Create primitive' },
    ]},
    { category: 'Actions', items: [
      { key: 'u', desc: 'Undo' },
      { key: 'U', desc: 'Redo' },
      { key: 'd', desc: 'Delete' },
      { key: '/', desc: 'Command input' },
      { key: 'Esc', desc: 'Clear selection' },
    ]},
  ],
  insert: [
    { category: 'Objects', items: [
      { key: '1-8', desc: 'Create primitive' },
    ]},
    { category: 'Actions', items: [
      { key: 'Esc', desc: 'Exit to normal' },
    ]},
  ],
  vertex: [
    { category: 'Movement', items: [
      { key: 'h/l', desc: 'Move X' },
      { key: 'j/k', desc: 'Move Y' },
      { key: 'z/w', desc: 'Move Z' },
      { key: 'Shift', desc: 'Fine movement' },
      { key: 'Alt', desc: 'Extra fine' },
    ]},
    { category: 'Actions', items: [
      { key: 'Esc', desc: 'Exit to normal' },
    ]},
  ],
  edge: [
    { category: 'Movement', items: [
      { key: 'h/l', desc: 'Move X' },
      { key: 'j/k', desc: 'Move Y' },
      { key: 'z/w', desc: 'Move Z' },
      { key: 'Shift', desc: 'Fine movement' },
      { key: 'Alt', desc: 'Extra fine' },
    ]},
    { category: 'Actions', items: [
      { key: 'Esc', desc: 'Exit to normal' },
    ]},
  ],
  face: {
    noSelection: [
      { category: 'Hint', items: [
        { key: 'Click', desc: 'Select face' },
        { key: 'Esc', desc: 'Exit to normal' },
      ]},
    ],
    selected: [
      { category: 'Movement', items: [
        { key: 'h/l', desc: 'Move X' },
        { key: 'j/k', desc: 'Move Y' },
        { key: 'z/w', desc: 'Move Z' },
        { key: 'Shift', desc: 'Fine movement' },
        { key: 'Alt', desc: 'Extra fine' },
      ]},
      { category: 'UV', items: [
        { key: 'Ctrl+u', desc: 'Toggle UV editor' },
      ]},
      { category: 'Actions', items: [
        { key: 'Esc', desc: 'Deselect face' },
      ]},
    ],
  },
  uv: [
    { category: 'UV Movement', items: [
      { key: 'h/l', desc: 'Move U' },
      { key: 'j/k', desc: 'Move V' },
      { key: 'Shift', desc: 'Fine movement' },
      { key: 'Alt', desc: 'Extra fine' },
    ]},
    { category: 'Actions', items: [
      { key: 'Esc', desc: 'Close UV editor' },
    ]},
  ],
};
```

## Component Architecture

### Files to Create
- `src/renderer/ui/shortcuts-panel.js` - Panel component class
- `src/renderer/core/shortcuts-registry.js` - Shortcut definitions (DRY source of truth)

### Files to Modify
- `src/renderer/index.html` - Add panel element
- `src/renderer/styles/main.css` - Panel styles
- `src/renderer/main.js` - Initialize panel, update on state change

### ShortcutsRegistry Class
```javascript
export class ShortcutsRegistry {
  getShortcuts(mode, context) { }
  getShortcutsForMode(mode) { }
}
```

### ShortcutsPanel Class
```javascript
export class ShortcutsPanel {
  constructor(container) { }
  update(mode, context) { }  // context: { hasSelection, hasFaceSelected, hasUvSelected, hasObjectSelected }
  expand() { }
  collapse() { }
  toggle() { }
}
```

## State Dependencies

The panel must update when:
1. Mode changes (`setMode()`)
2. Face selection changes (`editingFaceIds`)
3. UV selection changes (`editingUvIds`)
4. UV editor visibility changes (`toggleUVEditor()`)

## Integration Points

### In `main.js`:
1. Import and instantiate `ShortcutsPanel` in `initUI()`
2. Call `shortcutsPanel.update()` after:
   - `setMode()` 
   - Store subscription updates (when selection state changes)
   - `toggleUVEditor()`
3. Subscribe to store changes to detect face/UV selection changes

### CSS Considerations
```css
.shortcuts-panel {
  position: fixed;
  bottom: 32px;  /* Above command bar */
  left: 0;
  width: 280px;
  z-index: 50;
}

.shortcuts-panel.minimized {
  height: 28px;
  overflow: hidden;
}

.shortcuts-panel .shortcut-item {
  display: flex;
  justify-content: space-between;
  padding: 2px 8px;
  font-size: 12px;
}

.shortcuts-panel .shortcut-key {
  color: var(--accent);
  min-width: 80px;
}

.shortcuts-panel .shortcut-desc {
  color: var(--text-secondary);
}
```

## Acceptance Criteria

1. Panel opens automatically on app start
2. Panel shows correct shortcuts for current mode
3. Panel content updates when mode changes
4. Panel content updates when face/UV selection changes
5. Panel can be minimized (hides content, shows toggle button)
6. Panel can be expanded from minimized state
7. Minimized/expanded state persists during session
8. Panel renders without visual glitches or overflow
