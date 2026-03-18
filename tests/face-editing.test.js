import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('M8: Face Editing Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Face Edit Mode', () => {
    test('store tracks editing face IDs', () => {
      const state = store.getState();
      expect(state.editingFaceIds).toBeDefined();
      expect(Array.isArray(state.editingFaceIds)).toBe(true);
    });
  });
  
  describe('Face Selection', () => {
    test('selectFace selects a single face', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectFace(obj.id, 0);
      
      const state = store.getState();
      expect(state.editingFaceIds).toContain(`${obj.id}:0`);
    });
    
    test('selectFace clears previous face selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectFace(obj.id, 0);
      store.selectFace(obj.id, 1);
      
      const state = store.getState();
      expect(state.editingFaceIds).not.toContain(`${obj.id}:0`);
      expect(state.editingFaceIds).toContain(`${obj.id}:1`);
    });
    
    test('toggleFaceSelection toggles face selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.toggleFaceSelection(obj.id, 0);
      expect(store.getState().editingFaceIds).toContain(`${obj.id}:0`);
      
      store.toggleFaceSelection(obj.id, 0);
      expect(store.getState().editingFaceIds).not.toContain(`${obj.id}:0`);
    });
    
    test('selectAllFaces selects all faces', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectAllFaces(obj.id);
      
      const state = store.getState();
      expect(state.editingFaceIds.length).toBe(12);
    });
    
    test('clearSelection clears face selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectFace(obj.id, 0);
      
      store.clearSelection();
      
      expect(store.getState().editingFaceIds.length).toBe(0);
    });
  });
});
