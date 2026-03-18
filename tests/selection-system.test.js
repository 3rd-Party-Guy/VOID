import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('M5: Selection System Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Object Selection', () => {
    test('selectObject selects a single object', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectObject(obj.id);
      
      const selectedIds = store.getSelectedIds();
      expect(selectedIds).toContain(obj.id);
      expect(selectedIds.length).toBe(1);
    });
    
    test('selectObject clears previous selection', () => {
      const obj1 = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const obj2 = store.addObject('sphere', { geometry: createGeometry(GeometryTypes.SPHERE) });
      
      store.selectObject(obj1.id);
      store.selectObject(obj2.id);
      
      const selectedIds = store.getSelectedIds();
      expect(selectedIds).not.toContain(obj1.id);
      expect(selectedIds).toContain(obj2.id);
    });
    
    test('clearSelection clears all selections', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectObject(obj.id);
      
      store.clearSelection();
      
      expect(store.getSelectedIds().length).toBe(0);
    });
  });
  
  describe('Selected Objects Retrieval', () => {
    test('getSelectedObjects returns selected objects', () => {
      const obj1 = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.addObject('sphere', { geometry: createGeometry(GeometryTypes.SPHERE) });
      
      store.selectObject(obj1.id);
      
      const selected = store.getSelectedObjects();
      expect(selected.length).toBe(1);
      expect(selected[0].id).toBe(obj1.id);
    });
    
    test('getSelectedObjects returns empty array when nothing selected', () => {
      store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      const selected = store.getSelectedObjects();
      expect(selected.length).toBe(0);
    });
  });
  
  describe('Selection State', () => {
    test('selectedIds in state is array', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectObject(obj.id);
      
      const state = store.getState();
      expect(Array.isArray(state.selectedIds)).toBe(true);
    });
    
    test('selection change does not add to undo stack', () => {
      // After adding object, canUndo is true (from addObject)
      // But selecting does not create additional undo entry
      const store2 = new Store();
      store2.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const undoCountBefore = store2.undoStack.length;
      
      store2.selectObject(store2.getObjects()[0].id);
      
      // Selection should not add to undo stack
      expect(store2.undoStack.length).toBe(undoCountBefore);
    });
  });
});
