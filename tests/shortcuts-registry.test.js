import { describe, test, expect } from 'vitest';
import { SHORTCUTS, ShortcutsRegistry } from '../src/renderer/core/shortcuts-registry.js';

describe('ShortcutsRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ShortcutsRegistry();
  });

  describe('getShortcuts', () => {
    test('returns normal mode shortcuts', () => {
      const shortcuts = registry.getShortcuts('normal');
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Navigation');
      expect(categories).toContain('Modes');
      expect(categories).toContain('Objects');
      expect(categories).toContain('Actions');
    });

    test('returns insert mode shortcuts', () => {
      const shortcuts = registry.getShortcuts('insert');
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Objects');
      expect(categories).toContain('Actions');
    });

    test('returns vertex mode shortcuts', () => {
      const shortcuts = registry.getShortcuts('vertex');
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Movement');
      expect(categories).toContain('Actions');
    });

    test('returns edge mode shortcuts', () => {
      const shortcuts = registry.getShortcuts('edge');
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Movement');
      expect(categories).toContain('Actions');
    });

    test('returns face mode shortcuts without selection', () => {
      const shortcuts = registry.getShortcuts('face', { hasFaceSelected: false });
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Hint');
    });

    test('returns face mode shortcuts with selection', () => {
      const shortcuts = registry.getShortcuts('face', { hasFaceSelected: true });
      expect(shortcuts.length).toBeGreaterThan(0);
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('Movement');
      expect(categories).toContain('UV');
      expect(categories).toContain('Actions');
    });

    test('returns UV shortcuts when UV editor is visible in face mode', () => {
      const shortcuts = registry.getShortcuts('face', { 
        hasFaceSelected: true, 
        uvEditorVisible: true 
      });
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('UV Movement');
      expect(categories).toContain('Actions');
    });

    test('returns UV shortcuts in normal mode when UV editor is visible', () => {
      const shortcuts = registry.getShortcuts('normal', { uvEditorVisible: true });
      
      const categories = shortcuts.map(s => s.category);
      expect(categories).toContain('UV Movement');
      expect(categories).toContain('Actions');
    });

    test('returns empty array for unknown mode', () => {
      const shortcuts = registry.getShortcuts('unknown');
      expect(shortcuts).toEqual([]);
    });
  });

  describe('getShortcutsForMode', () => {
    test('returns shortcuts for valid mode', () => {
      const shortcuts = registry.getShortcutsForMode('normal');
      expect(shortcuts).toBeDefined();
      expect(Array.isArray(shortcuts)).toBe(true);
    });

    test('returns empty array for unknown mode', () => {
      const shortcuts = registry.getShortcutsForMode('nonexistent');
      expect(shortcuts).toEqual([]);
    });
  });

  describe('getAllShortcuts', () => {
    test('returns all shortcut definitions', () => {
      const all = registry.getAllShortcuts();
      expect(all).toBeDefined();
      expect(all.normal).toBeDefined();
      expect(all.insert).toBeDefined();
      expect(all.vertex).toBeDefined();
      expect(all.edge).toBeDefined();
      expect(all.face).toBeDefined();
      expect(all.uv).toBeDefined();
    });
  });
});

describe('SHORTCUTS Data Structure', () => {
  test('normal mode has all required categories', () => {
    const normal = SHORTCUTS.normal;
    const categories = normal.map(s => s.category);
    
    expect(categories).toContain('Navigation');
    expect(categories).toContain('Modes');
    expect(categories).toContain('Objects');
    expect(categories).toContain('Actions');
  });

  test('normal mode includes mode-switching shortcuts', () => {
    const actions = SHORTCUTS.normal.find(s => s.category === 'Modes');
    const keys = actions.items.map(i => i.key);
    
    expect(keys).toContain('i');
    expect(keys).toContain('g');
    expect(keys).toContain('z');
    expect(keys).toContain('f');
  });

  test('normal mode includes object creation shortcuts', () => {
    const objects = SHORTCUTS.normal.find(s => s.category === 'Objects');
    expect(objects.items[0].key).toBe('1-8');
  });

  test('insert mode includes letter-based object shortcuts', () => {
    const objects = SHORTCUTS.insert.find(s => s.category === 'Objects');
    const keys = objects.items.map(i => i.key);
    
    expect(keys).toContain('c');
    expect(keys).toContain('s');
    expect(keys).toContain('y');
    expect(keys).toContain('o');
    expect(keys).toContain('p');
    expect(keys).toContain('l');
    expect(keys).toContain('t');
    expect(keys).toContain('r');
  });

  test('vertex mode includes movement and modifier keys', () => {
    const movement = SHORTCUTS.vertex.find(s => s.category === 'Movement');
    const keys = movement.items.map(i => i.key);
    
    expect(keys).toContain('h/l');
    expect(keys).toContain('j/k');
    expect(keys).toContain('z/w');
    expect(keys).toContain('Shift');
    expect(keys).toContain('Alt');
  });

  test('face mode has both selection and selected states', () => {
    expect(SHORTCUTS.face.noSelection).toBeDefined();
    expect(SHORTCUTS.face.selected).toBeDefined();
  });

  test('face mode selected includes UV shortcut', () => {
    const uv = SHORTCUTS.face.selected.find(s => s.category === 'UV');
    expect(uv).toBeDefined();
    expect(uv.items[0].key).toBe('Ctrl+u');
  });
});
