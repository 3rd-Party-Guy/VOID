import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes, computeEdgeCount } from '../src/renderer/core/geometry.js';

describe('M7: Edge Editing Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Edge Edit Mode', () => {
    test('store tracks editing edge IDs', () => {
      const state = store.getState();
      expect(state.editingEdgeIds).toBeDefined();
      expect(Array.isArray(state.editingEdgeIds)).toBe(true);
    });
  });
  
  describe('Edge Selection', () => {
    test('selectEdge selects a single edge', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectEdge(obj.id, 0);
      
      const state = store.getState();
      expect(state.editingEdgeIds).toContain(`${obj.id}:0`);
    });
    
    test('selectEdge clears previous edge selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectEdge(obj.id, 0);
      store.selectEdge(obj.id, 1);
      
      const state = store.getState();
      expect(state.editingEdgeIds).not.toContain(`${obj.id}:0`);
      expect(state.editingEdgeIds).toContain(`${obj.id}:1`);
    });
    
    test('toggleEdgeSelection toggles edge selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.toggleEdgeSelection(obj.id, 0);
      expect(store.getState().editingEdgeIds).toContain(`${obj.id}:0`);
      
      store.toggleEdgeSelection(obj.id, 0);
      expect(store.getState().editingEdgeIds).not.toContain(`${obj.id}:0`);
    });
    
    test('selectAllEdges selects all edges', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectAllEdges(obj.id);
      
      const state = store.getState();
      expect(state.editingEdgeIds.length).toBeGreaterThan(0);
    });
    
    test('clearSelection clears edge selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectEdge(obj.id, 0);
      
      store.clearSelection();
      
      expect(store.getState().editingEdgeIds.length).toBe(0);
    });
    
    test('selectEdgeLoop selects edges on same face', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectEdgeLoop(obj.id, 0);
      
      const state = store.getState();
      expect(state.editingEdgeIds.length).toBeGreaterThan(1);
    });
  });
  
  describe('Geometry Edge Count', () => {
    test('cube geometry has correct edge count', () => {
      const geom = createGeometry(GeometryTypes.CUBE);
      expect(geom.edgeCount).toBe(12);
    });
    
    test('plane geometry has correct edge count', () => {
      const geom = createGeometry(GeometryTypes.PLANE);
      expect(geom.edgeCount).toBe(4);
    });
    
    test('computeEdgeCount works correctly', () => {
      const faces = new Uint16Array([0, 1, 2, 2, 3, 0]);
      expect(computeEdgeCount(faces)).toBe(5);
    });
  });
});
