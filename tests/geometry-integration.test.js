import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';
import { Store } from '../src/renderer/core/store.js';

describe('M3: Geometry System Integration', () => {
  describe('GeometryFactory - All Primitives', () => {
    test('creates cube geometry', () => {
      const geom = createGeometry(GeometryTypes.CUBE);
      expect(geom).toBeDefined();
      expect(geom.vertexCount).toBeGreaterThan(0);
      expect(geom.faceCount).toBeGreaterThan(0);
    });
    
    test('creates sphere geometry', () => {
      const geom = createGeometry(GeometryTypes.SPHERE);
      expect(geom).toBeDefined();
      expect(geom.vertexCount).toBeGreaterThan(0);
    });
    
    test('creates cylinder geometry', () => {
      const geom = createGeometry(GeometryTypes.CYLINDER);
      expect(geom).toBeDefined();
    });
    
    test('creates cone geometry', () => {
      const geom = createGeometry(GeometryTypes.CONE);
      expect(geom).toBeDefined();
    });
    
    test('creates pyramid geometry', () => {
      const geom = createGeometry(GeometryTypes.PYRAMID);
      expect(geom).toBeDefined();
    });
    
    test('creates plane geometry', () => {
      const geom = createGeometry(GeometryTypes.PLANE);
      expect(geom).toBeDefined();
    });
    
    test('creates torus geometry', () => {
      const geom = createGeometry(GeometryTypes.TORUS);
      expect(geom).toBeDefined();
    });
    
    test('creates triangle geometry', () => {
      const geom = createGeometry(GeometryTypes.TRIANGLE);
      expect(geom).toBeDefined();
    });
  });
  
  describe('Store Object Management', () => {
    let store;
    
    beforeEach(() => {
      store = new Store();
    });
    
    test('addObject creates object with geometry', () => {
      const geom = createGeometry(GeometryTypes.CUBE);
      const obj = store.addObject('cube', { geometry: geom });
      
      expect(obj).toBeDefined();
      expect(obj.type).toBe('cube');
      expect(obj.geometry).toBe(geom);
    });
    
    test('addObject auto-generates unique names', () => {
      store.addObject('cube');
      store.addObject('cube');
      store.addObject('sphere');
      
      const objects = store.getObjects();
      const names = objects.map(o => o.name);
      
      expect(names).toContain('Cube_001');
      expect(names).toContain('Cube_002');
      expect(names).toContain('Sphere_001');
    });
    
    test('getObject returns object by id', () => {
      const obj = store.addObject('cube');
      const found = store.getObject(obj.id);
      
      expect(found).toBe(obj);
    });
    
    test('removeObject deletes object', () => {
      const obj = store.addObject('cube');
      store.removeObject(obj.id);
      
      expect(store.getObject(obj.id)).toBeUndefined();
    });
    
    test('updateObject modifies properties', () => {
      const obj = store.addObject('cube');
      store.updateObject(obj.id, { name: 'CustomName' });
      
      expect(store.getObject(obj.id).name).toBe('CustomName');
    });
  });
  
  describe('Object Transform', () => {
    let store;
    
    beforeEach(() => {
      store = new Store();
    });
    
    test('setObjectTransform updates position', () => {
      const obj = store.addObject('cube');
      store.setObjectTransform(obj.id, {
        position: [1, 2, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      });
      
      const updated = store.getObject(obj.id);
      expect(updated.transform.position).toEqual([1, 2, 3]);
    });
    
    test('setObjectTransform updates scale', () => {
      const obj = store.addObject('cube');
      store.setObjectTransform(obj.id, {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2]
      });
      
      const updated = store.getObject(obj.id);
      expect(updated.transform.scale).toEqual([2, 2, 2]);
    });
  });
  
  describe('State Subscriptions', () => {
    test('store notifies subscribers on changes', () => {
      const store = new Store();
      let notified = false;
      
      store.subscribe(() => {
        notified = true;
      });
      
      store.addObject('cube');
      expect(notified).toBe(true);
    });
  });
  
  describe('Scene Hierarchy Data', () => {
    test('store provides scene hierarchy structure', () => {
      const store = new Store();
      store.addObject('cube');
      store.addObject('sphere');
      
      const state = store.getState();
      
      expect(state.objects).toBeDefined();
      expect(Array.isArray(state.objects)).toBe(true);
      expect(state.objects.length).toBe(2);
    });
  });
});
