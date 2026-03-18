import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('UV Editor Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('UV Selection', () => {
    test('store tracks editing UV IDs', () => {
      const state = store.getState();
      expect(state.editingUvIds).toBeDefined();
      expect(Array.isArray(state.editingUvIds)).toBe(true);
    });
    
    test('selectUv selects a single UV', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectUv(obj.id, 0);
      
      const state = store.getState();
      expect(state.editingUvIds).toContain(`${obj.id}:0`);
    });
    
    test('selectUv clears previous UV selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectUv(obj.id, 0);
      store.selectUv(obj.id, 1);
      
      const state = store.getState();
      expect(state.editingUvIds).not.toContain(`${obj.id}:0`);
      expect(state.editingUvIds).toContain(`${obj.id}:1`);
    });
    
    test('toggleUvSelection toggles UV selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.toggleUvSelection(obj.id, 0);
      expect(store.getState().editingUvIds).toContain(`${obj.id}:0`);
      
      store.toggleUvSelection(obj.id, 0);
      expect(store.getState().editingUvIds).not.toContain(`${obj.id}:0`);
    });
    
    test('selectAllUvs selects all UVs', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.selectAllUvs(obj.id);
      
      const state = store.getState();
      expect(state.editingUvIds.length).toBe(8);
    });
  });
  
  describe('UV Position Manipulation', () => {
    test('setUvPosition updates UV position', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.setUvPosition(obj.id, 0, 0.5, 0.5);
      
      const updated = store.getObject(obj.id);
      expect(updated.geometry.uvs[0]).toBe(0.5);
      expect(updated.geometry.uvs[1]).toBe(0.5);
    });
    
    test('setUvPosition creates undo entry', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.setUvPosition(obj.id, 0, 0.5, 0.5);
      
      expect(store.canUndo()).toBe(true);
    });
    
    test('undo restores UV position', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      const originalU = obj.geometry.uvs[0];
      const originalV = obj.geometry.uvs[1];
      store.setUvPosition(obj.id, 0, 0.9, 0.9);
      store.undo();
      
      const reverted = store.getObject(obj.id);
      expect(reverted.geometry.uvs[0]).toBe(originalU);
      expect(reverted.geometry.uvs[1]).toBe(originalV);
    });
    
    test('redo reapplies UV position', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      
      store.setUvPosition(obj.id, 0, 0.7, 0.7);
      store.undo();
      store.redo();
      
      const updated = store.getObject(obj.id);
      expect(updated.geometry.uvs[0]).toBeCloseTo(0.7);
      expect(updated.geometry.uvs[1]).toBeCloseTo(0.7);
    });
  });
  
  describe('Clear Selection', () => {
    test('clearSelection clears UV selection', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      store.selectUv(obj.id, 0);
      
      store.clearSelection();
      
      expect(store.getState().editingUvIds.length).toBe(0);
    });
  });
});
