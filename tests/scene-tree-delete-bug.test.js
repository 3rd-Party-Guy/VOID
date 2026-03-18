import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('Bug Fix: Scene Tree After Delete', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  test('after delete, scene objects should not contain undefined', () => {
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    
    // Verify object exists
    expect(store.getObjects().length).toBe(1);
    
    // Delete the object
    store.removeObject(obj.id);
    
    // Objects array should not contain undefined or null
    const objects = store.getObjects();
    objects.forEach(o => {
      expect(o).toBeDefined();
      expect(o).not.toBeNull();
      expect(o.id).toBeDefined();
    });
  });
  
  test('after delete and undo, object should be restored correctly', () => {
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    const objId = obj.id;
    
    store.removeObject(obj.id);
    expect(store.getObjects().length).toBe(0);
    
    store.undo();
    const restored = store.getObjects();
    expect(restored.length).toBe(1);
    expect(restored[0].id).toBe(objId);
    expect(restored[0]).toBeDefined();
  });
  
  test('store state should be clean after delete', () => {
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    
    store.removeObject(obj.id);
    
    const state = store.getState();
    expect(state.objects.length).toBe(0);
    
    // Selected IDs should not include deleted object
    expect(state.selectedIds).not.toContain(obj.id);
  });
});
