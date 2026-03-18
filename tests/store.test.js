import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';

describe('Store', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Object Management', () => {
    test('addObject creates object with correct properties', () => {
      const obj = store.addObject('cube');
      
      expect(obj).toBeDefined();
      expect(obj.type).toBe('cube');
      expect(obj.name).toMatch(/^Cube_\d{3}$/);
      expect(obj.transform).toEqual({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      });
    });
    
    test('addObject increments counter for each type', () => {
      store.addObject('cube');
      store.addObject('cube');
      store.addObject('sphere');
      
      const cubes = store.getObjects().filter(o => o.type === 'cube');
      const spheres = store.getObjects().filter(o => o.type === 'sphere');
      
      expect(cubes.length).toBe(2);
      expect(spheres.length).toBe(1);
    });
    
    test('removeObject removes object from store', () => {
      const obj = store.addObject('cube');
      store.removeObject(obj.id);
      
      expect(store.getObject(obj.id)).toBeUndefined();
    });
    
    test('updateObject updates object properties', () => {
      const obj = store.addObject('cube');
      store.updateObject(obj.id, { name: 'NewName' });
      
      expect(store.getObject(obj.id).name).toBe('NewName');
    });
    
    test('setObjectTransform updates transform', () => {
      const obj = store.addObject('cube');
      store.setObjectTransform(obj.id, {
        position: [1, 2, 3],
        rotation: [0, 0, 0],
        scale: [2, 2, 2]
      });
      
      const updated = store.getObject(obj.id);
      expect(updated.transform.position).toEqual([1, 2, 3]);
      expect(updated.transform.scale).toEqual([2, 2, 2]);
    });
  });
  
  describe('Selection', () => {
    test('selectObject selects single object', () => {
      const obj1 = store.addObject('cube');
      store.addObject('sphere');
      
      store.selectObject(obj1.id);
      
      expect(store.getSelectedIds()).toContain(obj1.id);
      expect(store.getSelectedIds().length).toBe(1);
    });
    
    test('selectObject clears previous selection', () => {
      const obj1 = store.addObject('cube');
      const obj2 = store.addObject('sphere');
      
      store.selectObject(obj1.id);
      store.selectObject(obj2.id);
      
      expect(store.getSelectedIds()).not.toContain(obj1.id);
      expect(store.getSelectedIds()).toContain(obj2.id);
    });
    
    test('clearSelection clears all selections', () => {
      store.addObject('cube');
      store.addObject('sphere');
      store.selectObject(store.getObjects()[0].id);
      
      store.clearSelection();
      
      expect(store.getSelectedIds().length).toBe(0);
    });
  });
  
  describe('History (Undo/Redo)', () => {
    test('undo reverses addObject', () => {
      store.addObject('cube');
      store.undo();
      
      expect(store.getObjects().length).toBe(0);
    });
    
    test('redo restores undone action', () => {
      store.addObject('cube');
      store.undo();
      store.redo();
      
      expect(store.getObjects().length).toBe(1);
    });
    
    test('undo reverses removeObject', () => {
      const obj = store.addObject('cube');
      store.removeObject(obj.id);
      store.undo();
      
      expect(store.getObjects().length).toBe(1);
    });
    
    test('undo reverses setObjectTransform', () => {
      const obj = store.addObject('cube');
      store.setObjectTransform(obj.id, { position: [5, 5, 5], rotation: [0, 0, 0], scale: [1, 1, 1] });
      store.undo();
      
      expect(store.getObject(obj.id).transform.position).toEqual([0, 0, 0]);
    });
    
    test('canUndo returns true when stack not empty', () => {
      expect(store.canUndo()).toBe(false);
      store.addObject('cube');
      expect(store.canUndo()).toBe(true);
    });
    
    test('canRedo returns true when redo stack not empty', () => {
      store.addObject('cube');
      store.undo();
      expect(store.canRedo()).toBe(true);
    });
    
    test('limits undo stack to 50 items', () => {
      for (let i = 0; i < 60; i++) {
        store.addObject('cube');
      }
      
      store.undo();
      store.undo();
      
      expect(store.getObjects().length).toBe(58);
    });
  });
  
  describe('Vertex Editing', () => {
    test('setVertexPosition updates vertex position', () => {
      const obj = store.addObject('cube');
      obj.geometry = { vertices: new Float32Array([0, 0, 0, 1, 1, 1]), vertexCount: 2 };
      store.objects.set(obj.id, obj);
      
      store.setVertexPosition(obj.id, 1, [5, 5, 5]);
      
      const updated = store.getObject(obj.id);
      expect(updated.geometry.vertices[3]).toBe(5);
      expect(updated.geometry.vertices[4]).toBe(5);
      expect(updated.geometry.vertices[5]).toBe(5);
    });
    
    test('selectVertex selects single vertex', () => {
      const obj = store.addObject('cube');
      obj.geometry = { vertices: new Float32Array([0, 0, 0, 1, 1, 1]), vertexCount: 2 };
      store.objects.set(obj.id, obj);
      
      store.selectVertex(obj.id, 1);
      
      const state = store.getState();
      expect(state.editingVertexIds).toContain(`${obj.id}:1`);
    });
    
    test('toggleVertexSelection toggles vertex', () => {
      const obj = store.addObject('cube');
      obj.geometry = { vertices: new Float32Array([0, 0, 0, 1, 1, 1]), vertexCount: 2 };
      store.objects.set(obj.id, obj);
      
      store.toggleVertexSelection(obj.id, 0);
      expect(store.getState().editingVertexIds).toContain(`${obj.id}:0`);
      
      store.toggleVertexSelection(obj.id, 0);
      expect(store.getState().editingVertexIds).not.toContain(`${obj.id}:0`);
    });
  });
  
  describe('Subscriptions', () => {
    test('subscribe notifies on state change', () => {
      let callCount = 0;
      store.subscribe(() => callCount++);
      
      store.addObject('cube');
      expect(callCount).toBe(1);
      
      store.addObject('sphere');
      expect(callCount).toBe(2);
    });
    
    test('unsubscribe stops notifications', () => {
      let callCount = 0;
      const unsubscribe = store.subscribe(() => callCount++);
      
      store.addObject('cube');
      unsubscribe();
      store.addObject('sphere');
      
      expect(callCount).toBe(1);
    });
  });
  
  describe('clear', () => {
    test('clears all state', () => {
      store.addObject('cube');
      store.addObject('sphere');
      store.selectObject(store.getObjects()[0].id);
      
      store.clear();
      
      expect(store.getObjects().length).toBe(0);
      expect(store.getSelectedIds().length).toBe(0);
      expect(store.canUndo()).toBe(false);
    });
  });
});
