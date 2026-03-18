import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('Bug Fix: Undo Transform Operations', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  test('undo reverses setObjectTransform', () => {
    // Create an object
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    
    // Change transform
    store.setObjectTransform(obj.id, {
      position: [5, 10, 15],
      rotation: [0, 0, 0],
      scale: [2, 2, 2]
    });
    
    // Verify transform changed
    expect(store.getObject(obj.id).transform.position).toEqual([5, 10, 15]);
    
    // Undo should revert
    store.undo();
    const reverted = store.getObject(obj.id);
    expect(reverted.transform.position).toEqual([0, 0, 0]);
    expect(reverted.transform.scale).toEqual([1, 1, 1]);
  });
  
  test('redo restores transform after undo', () => {
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    
    store.setObjectTransform(obj.id, {
      position: [3, 3, 3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    });
    
    store.undo();
    expect(store.getObject(obj.id).transform.position).toEqual([0, 0, 0]);
    
    store.redo();
    expect(store.getObject(obj.id).transform.position).toEqual([3, 3, 3]);
  });
  
  test('multiple transform changes can be undone', () => {
    const geom = createGeometry(GeometryTypes.CUBE);
    const obj = store.addObject('cube', { geometry: geom });
    
    store.setObjectTransform(obj.id, { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    store.setObjectTransform(obj.id, { position: [2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    store.setObjectTransform(obj.id, { position: [3, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    
    expect(store.getObject(obj.id).transform.position).toEqual([3, 0, 0]);
    
    store.undo();
    expect(store.getObject(obj.id).transform.position).toEqual([2, 0, 0]);
    
    store.undo();
    expect(store.getObject(obj.id).transform.position).toEqual([1, 0, 0]);
  });
});
