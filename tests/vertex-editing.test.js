import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('M6: Vertex Editing Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Vertex Edit Mode', () => {
    test('store tracks editing vertex IDs', () => {
      const state = store.getState();
      expect(state.editingVertexIds).toBeDefined();
      expect(Array.isArray(state.editingVertexIds)).toBe(true);
    });
  });
  
  describe('Vertex Selection', () => {
    test('selectVertex selects a single vertex', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectVertex(obj.id, 0);
      
      const state = store.getState();
      expect(state.editingVertexIds).toContain(`${obj.id}:0`);
    });
    
    test('selectVertex clears previous vertex selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectVertex(obj.id, 0);
      store.selectVertex(obj.id, 1);
      
      const state = store.getState();
      expect(state.editingVertexIds).not.toContain(`${obj.id}:0`);
      expect(state.editingVertexIds).toContain(`${obj.id}:1`);
    });
    
    test('toggleVertexSelection toggles vertex selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.toggleVertexSelection(obj.id, 0);
      expect(store.getState().editingVertexIds).toContain(`${obj.id}:0`);
      
      store.toggleVertexSelection(obj.id, 0);
      expect(store.getState().editingVertexIds).not.toContain(`${obj.id}:0`);
    });
    
    test('selectAllVertices selects all vertices', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectAllVertices(obj.id);
      
      const state = store.getState();
      // Cube has 8 vertices (shared vertices, not per-face)
      expect(state.editingVertexIds.length).toBe(8);
    });
    
    test('clearSelection clears vertex selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectVertex(obj.id, 0);
      
      store.clearSelection();
      
      expect(store.getState().editingVertexIds.length).toBe(0);
    });
  });
  
  describe('Vertex Position Manipulation', () => {
    test('setVertexPosition updates vertex position', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.setVertexPosition(obj.id, 0, [5, 5, 5]);
      
      const updatedObj = store.getObject(obj.id);
      expect(updatedObj.geometry.vertices[0]).toBe(5);
      expect(updatedObj.geometry.vertices[1]).toBe(5);
      expect(updatedObj.geometry.vertices[2]).toBe(5);
    });
    
    test('setVertexPosition creates undo entry', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.setVertexPosition(obj.id, 0, [1, 2, 3]);
      
      expect(store.canUndo()).toBe(true);
    });
    
    test('undo restores vertex position', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      const originalX = obj.geometry.vertices[0];
      store.setVertexPosition(obj.id, 0, [10, 10, 10]);
      store.undo();
      
      const reverted = store.getObject(obj.id);
      expect(reverted.geometry.vertices[0]).toBe(originalX);
    });
  });
  
  describe('Geometry with Vertices', () => {
    test('cube geometry has vertex data', () => {
      const geom = createGeometry(GeometryTypes.CUBE);
      expect(geom.vertices).toBeDefined();
      expect(geom.vertexCount).toBeGreaterThan(0);
    });
    
    test('sphere geometry has vertex data', () => {
      const geom = createGeometry(GeometryTypes.SPHERE);
      expect(geom.vertices).toBeDefined();
      expect(geom.vertexCount).toBeGreaterThan(0);
    });
  });
});
