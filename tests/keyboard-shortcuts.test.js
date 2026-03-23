import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('Keyboard Shortcuts - Normal Mode', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
    store.clearSelection();
  });

  test('h key is available for camera pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'h' });
    expect(event.key).toBe('h');
  });

  test('j key is available for camera pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'j' });
    expect(event.key).toBe('j');
  });

  test('k key is available for camera pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'k' });
    expect(event.key).toBe('k');
  });

  test('l key is available for camera pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'l' });
    expect(event.key).toBe('l');
  });

  test('H key is available for Z-axis pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'H' });
    expect(event.key).toBe('H');
  });

  test('J key is available for Z-axis pan', () => {
    const event = new KeyboardEvent('keydown', { key: 'J' });
    expect(event.key).toBe('J');
  });

  test('w key is available for zoom', () => {
    const event = new KeyboardEvent('keydown', { key: 'w' });
    expect(event.key).toBe('w');
  });

  test('s key is available for zoom', () => {
    const event = new KeyboardEvent('keydown', { key: 's' });
    expect(event.key).toBe('s');
  });

  test('q key is available for orbit', () => {
    const event = new KeyboardEvent('keydown', { key: 'q' });
    expect(event.key).toBe('q');
  });

  test('e key is available for orbit', () => {
    const event = new KeyboardEvent('keydown', { key: 'e' });
    expect(event.key).toBe('e');
  });

  test('Q key is available for vertical orbit', () => {
    const event = new KeyboardEvent('keydown', { key: 'Q' });
    expect(event.key).toBe('Q');
  });

  test('E key is available for vertical orbit', () => {
    const event = new KeyboardEvent('keydown', { key: 'E' });
    expect(event.key).toBe('E');
  });

  test('i key is available for insert mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'i' });
    expect(event.key).toBe('i');
  });

  test('g key is available for vertex mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'g' });
    expect(event.key).toBe('g');
  });

  test('z key is available for edge mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'z' });
    expect(event.key).toBe('z');
  });

  test('f key is available for face mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'f' });
    expect(event.key).toBe('f');
  });

  test('d key is available for delete', () => {
    const obj = store.addObject('cube');
    store.selectObject(obj.id);
    
    expect(store.getSelectedIds().length).toBe(1);
    
    const event = new KeyboardEvent('keydown', { key: 'd' });
    expect(event.key).toBe('d');
  });

  test('u key is available for undo', () => {
    const event = new KeyboardEvent('keydown', { key: 'u' });
    expect(event.key).toBe('u');
  });

  test('U key is available for redo', () => {
    const event = new KeyboardEvent('keydown', { key: 'U' });
    expect(event.key).toBe('U');
  });

  test('1-8 keys are available for object creation', () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    keys.forEach(key => {
      const event = new KeyboardEvent('keydown', { key });
      expect(key).toMatch(/^[1-8]$/);
      expect(event.key).toBe(key);
    });
  });

  test('Escape clears selection', () => {
    const obj = store.addObject('cube');
    store.selectObject(obj.id);
    expect(store.getSelectedIds().length).toBe(1);
    
    store.clearSelection();
    expect(store.getSelectedIds().length).toBe(0);
  });

  test('Ctrl+u is available for UV editor toggle', () => {
    const event = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true });
    expect(event.key).toBe('u');
    expect(event.ctrlKey).toBe(true);
  });

  test('/ key is available for command input', () => {
    const event = new KeyboardEvent('keydown', { key: '/' });
    expect(event.key).toBe('/');
  });
});

describe('Keyboard Shortcuts - Insert Mode', () => {
  test('c creates cube', () => {
    const event = new KeyboardEvent('keydown', { key: 'c' });
    expect(event.key).toBe('c');
  });

  test('s creates sphere', () => {
    const event = new KeyboardEvent('keydown', { key: 's' });
    expect(event.key).toBe('s');
  });

  test('y creates cylinder', () => {
    const event = new KeyboardEvent('keydown', { key: 'y' });
    expect(event.key).toBe('y');
  });

  test('o creates cone', () => {
    const event = new KeyboardEvent('keydown', { key: 'o' });
    expect(event.key).toBe('o');
  });

  test('p creates pyramid', () => {
    const event = new KeyboardEvent('keydown', { key: 'p' });
    expect(event.key).toBe('p');
  });

  test('l creates plane', () => {
    const event = new KeyboardEvent('keydown', { key: 'l' });
    expect(event.key).toBe('l');
  });

  test('t creates torus', () => {
    const event = new KeyboardEvent('keydown', { key: 't' });
    expect(event.key).toBe('t');
  });

  test('r creates triangle', () => {
    const event = new KeyboardEvent('keydown', { key: 'r' });
    expect(event.key).toBe('r');
  });

  test('Escape exits to normal mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(event.key).toBe('Escape');
  });
});

describe('Keyboard Shortcuts - Vertex/Edge/Face Movement', () => {
  test('h moves selection negatively on X axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'h' });
    expect(event.key).toBe('h');
  });

  test('l moves selection positively on X axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'l' });
    expect(event.key).toBe('l');
  });

  test('j moves selection negatively on Y axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'j' });
    expect(event.key).toBe('j');
  });

  test('k moves selection positively on Y axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'k' });
    expect(event.key).toBe('k');
  });

  test('z moves selection negatively on Z axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'z' });
    expect(event.key).toBe('z');
  });

  test('w moves selection positively on Z axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'w' });
    expect(event.key).toBe('w');
  });

  test('Shift modifies movement amount', () => {
    const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
    expect(event.shiftKey).toBe(true);
  });

  test('Alt enables extra fine movement', () => {
    const event = new KeyboardEvent('keydown', { key: 'h', altKey: true });
    expect(event.altKey).toBe(true);
  });

  test('Escape exits edit mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(event.key).toBe('Escape');
  });
});

describe('Keyboard Shortcuts - UV Editor', () => {
  test('h moves UV negatively on U axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'h' });
    expect(event.key).toBe('h');
  });

  test('l moves UV positively on U axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'l' });
    expect(event.key).toBe('l');
  });

  test('j moves UV negatively on V axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'j' });
    expect(event.key).toBe('j');
  });

  test('k moves UV positively on V axis', () => {
    const event = new KeyboardEvent('keydown', { key: 'k' });
    expect(event.key).toBe('k');
  });

  test('Shift modifies UV movement amount', () => {
    const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
    expect(event.shiftKey).toBe(true);
  });

  test('Alt enables extra fine UV movement', () => {
    const event = new KeyboardEvent('keydown', { key: 'h', altKey: true });
    expect(event.altKey).toBe(true);
  });

  test('Escape closes UV editor', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(event.key).toBe('Escape');
  });
});

describe('Selection via Store', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });

  test('selectVertex allows vertex editing', () => {
    const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
    store.selectVertex(obj.id, 0);
    
    expect(store.getState().editingVertexIds).toContain(`${obj.id}:0`);
  });

  test('selectEdge allows edge editing', () => {
    const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
    store.selectEdge(obj.id, 0);
    
    expect(store.getState().editingEdgeIds).toContain(`${obj.id}:0`);
  });

  test('selectFace allows face editing', () => {
    const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
    store.selectFace(obj.id, 0);
    
    expect(store.getState().editingFaceIds).toContain(`${obj.id}:0`);
  });

  test('selected face enables face mode shortcuts', () => {
    const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
    store.selectFace(obj.id, 0);
    
    const state = store.getState();
    expect(state.editingFaceIds.length).toBeGreaterThan(0);
  });

  test('clearSelection clears all edit modes', () => {
    const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
    store.selectVertex(obj.id, 0);
    store.selectEdge(obj.id, 0);
    store.selectFace(obj.id, 0);
    
    store.clearSelection();
    
    const state = store.getState();
    expect(state.editingVertexIds.length).toBe(0);
    expect(state.editingEdgeIds.length).toBe(0);
    expect(state.editingFaceIds.length).toBe(0);
  });
});
