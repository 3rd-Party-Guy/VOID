export const SHORTCUTS = {
  normal: [
    {
      category: 'Navigation',
      items: [
        { key: 'h/j/k/l', desc: 'Pan camera (X/Y)' },
        { key: 'H/J', desc: 'Pan camera (Z axis)' },
        { key: 'w/s', desc: 'Zoom' },
        { key: 'q/e', desc: 'Orbit horizontal' },
        { key: 'Q/E', desc: 'Orbit vertical' },
      ],
    },
    {
      category: 'Modes',
      items: [
        { key: 'i', desc: 'Insert mode' },
        { key: 'g', desc: 'Vertex mode' },
        { key: 'z', desc: 'Edge mode' },
        { key: 'f', desc: 'Face mode' },
      ],
    },
    {
      category: 'Objects',
      items: [
        { key: '1-8', desc: 'Create primitive' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'u', desc: 'Undo' },
        { key: 'U', desc: 'Redo' },
        { key: 'd', desc: 'Delete' },
        { key: 'Ctrl+u', desc: 'Toggle UV editor' },
        { key: '/', desc: 'Command input' },
        { key: 'Esc', desc: 'Clear selection' },
      ],
    },
  ],
  insert: [
    {
      category: 'Objects',
      items: [
        { key: 'c', desc: 'Cube' },
        { key: 's', desc: 'Sphere' },
        { key: 'y', desc: 'Cylinder' },
        { key: 'o', desc: 'Cone' },
        { key: 'p', desc: 'Pyramid' },
        { key: 'l', desc: 'Plane' },
        { key: 't', desc: 'Torus' },
        { key: 'r', desc: 'Triangle' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'Esc', desc: 'Exit to normal' },
      ],
    },
  ],
  vertex: [
    {
      category: 'Movement',
      items: [
        { key: 'h/l', desc: 'Move X' },
        { key: 'j/k', desc: 'Move Y' },
        { key: 'z/w', desc: 'Move Z' },
        { key: 'Shift', desc: 'Fine movement' },
        { key: 'Alt', desc: 'Extra fine' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'Esc', desc: 'Exit to normal' },
      ],
    },
  ],
  edge: [
    {
      category: 'Movement',
      items: [
        { key: 'h/l', desc: 'Move X' },
        { key: 'j/k', desc: 'Move Y' },
        { key: 'z/w', desc: 'Move Z' },
        { key: 'Shift', desc: 'Fine movement' },
        { key: 'Alt', desc: 'Extra fine' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'Esc', desc: 'Exit to normal' },
      ],
    },
  ],
  face: {
    noSelection: [
      {
        category: 'Hint',
        items: [
          { key: 'Click', desc: 'Select face' },
          { key: 'Esc', desc: 'Exit to normal' },
        ],
      },
    ],
    selected: [
      {
        category: 'Movement',
        items: [
          { key: 'h/l', desc: 'Move X' },
          { key: 'j/k', desc: 'Move Y' },
          { key: 'z/w', desc: 'Move Z' },
          { key: 'Shift', desc: 'Fine movement' },
          { key: 'Alt', desc: 'Extra fine' },
        ],
      },
      {
        category: 'UV',
        items: [
          { key: 'Ctrl+u', desc: 'Toggle UV editor' },
        ],
      },
      {
        category: 'Actions',
        items: [
          { key: 'Esc', desc: 'Deselect face' },
        ],
      },
    ],
  },
  uv: [
    {
      category: 'UV Movement',
      items: [
        { key: 'h/l', desc: 'Move U' },
        { key: 'j/k', desc: 'Move V' },
        { key: 'Shift', desc: 'Fine movement' },
        { key: 'Alt', desc: 'Extra fine' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'Esc', desc: 'Close UV editor' },
      ],
    },
  ],
};

export class ShortcutsRegistry {
  getShortcuts(mode, context = {}) {
    const { hasFaceSelected = false, hasUvSelected = false, uvEditorVisible = false } = context;

    if (mode === 'face' && uvEditorVisible) {
      return SHORTCUTS.uv;
    }

    if (mode === 'face') {
      return hasFaceSelected ? SHORTCUTS.face.selected : SHORTCUTS.face.noSelection;
    }

    if (mode === 'normal' && uvEditorVisible) {
      return SHORTCUTS.uv;
    }

    return SHORTCUTS[mode] || [];
  }

  getShortcutsForMode(mode) {
    return SHORTCUTS[mode] || [];
  }

  getAllShortcuts() {
    return SHORTCUTS;
  }
}
