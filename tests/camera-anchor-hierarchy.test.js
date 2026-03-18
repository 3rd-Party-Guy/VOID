import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';

describe('Camera Anchor System', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  test('initial camera anchor is at origin', () => {
    const anchor = store.getCameraAnchor();
    expect(anchor).toEqual([0, 0, 0]);
  });
  
  test('initial camera forward distance is approximately 8.66', () => {
    const forwardDist = store.getCameraForwardDistance();
    expect(forwardDist).toBeCloseTo(8.66, 1);
  });
  
  test('setCameraAnchor updates anchor position', () => {
    store.setCameraAnchor([10, 20, 30]);
    const anchor = store.getCameraAnchor();
    expect(anchor).toEqual([10, 20, 30]);
  });
  
  test('selectObject updates anchor to object center', () => {
    store.addObject('cube', {
      position: [5, 5, 5],
      geometry: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
        faces: new Uint16Array([0, 1, 2, 0, 2, 3]),
        vertexCount: 4,
        faceCount: 2
      }
    });
    
    const objects = store.getObjects();
    const obj = objects[0];
    
    store.selectObject(obj.id);
    
    const anchor = store.getCameraAnchor();
    // Object center at (0.5, 0.5, 0) + position (5, 5, 5) = (5.5, 5.5, 5)
    expect(anchor[0]).toBeCloseTo(5.5, 1);
    expect(anchor[1]).toBeCloseTo(5.5, 1);
    expect(anchor[2]).toBeCloseTo(5, 1);
  });
});

describe('Object Hierarchy', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  test('objects can have parentId', () => {
    const parent = store.addObject('cube', { position: [0, 0, 0] });
    const child = store.addObject('sphere', { position: [1, 0, 0], parentId: parent.id });
    
    expect(child.parentId).toBe(parent.id);
  });
  
  test('setObjectParent updates parent relationship', () => {
    const parent1 = store.addObject('cube');
    const parent2 = store.addObject('sphere');
    const child = store.addObject('cone');
    
    store.setObjectParent(child.id, parent1.id);
    expect(child.parentId).toBe(parent1.id);
    
    store.setObjectParent(child.id, parent2.id);
    expect(child.parentId).toBe(parent2.id);
  });
  
  test('getObjectChildren returns direct children', () => {
    const parent = store.addObject('cube');
    const child1 = store.addObject('sphere');
    const child2 = store.addObject('cone');
    const grandchild = store.addObject('pyramid');
    
    store.setObjectParent(child1.id, parent.id);
    store.setObjectParent(child2.id, parent.id);
    store.setObjectParent(grandchild.id, child1.id);
    
    const children = store.getObjectChildren(parent.id);
    expect(children).toContain(child1.id);
    expect(children).toContain(child2.id);
    expect(children).not.toContain(grandchild.id);
  });
  
  test('getObjectDescendants returns all descendants', () => {
    const parent = store.addObject('cube');
    const child = store.addObject('sphere');
    const grandchild = store.addObject('cone');
    
    store.setObjectParent(child.id, parent.id);
    store.setObjectParent(grandchild.id, child.id);
    
    const descendants = store.getObjectDescendants(parent.id);
    expect(descendants).toContain(child.id);
    expect(descendants).toContain(grandchild.id);
  });
  
  test('cannot set circular parent reference', () => {
    const parent = store.addObject('cube');
    const child = store.addObject('sphere');
    
    store.setObjectParent(child.id, parent.id);
    
    // Try to make parent a child of child (circular)
    const result = store.setObjectParent(parent.id, child.id);
    
    // Should not change parent
    expect(parent.parentId).toBe(null);
  });
  
  test('cannot set object as its own parent', () => {
    const obj = store.addObject('cube');
    store.setObjectParent(obj.id, obj.id);
    expect(obj.parentId).toBe(null);
  });
  
  test('getEffectiveMaterial returns own material if set', () => {
    const obj = store.addObject('cube');
    obj.material = { diffuseTexture: 'tex1', diffuseColor: [1, 0, 0], opacity: 1 };
    
    const mat = store.getEffectiveMaterial(obj.id);
    expect(mat.diffuseTexture).toBe('tex1');
  });
  
  test('getEffectiveMaterial inherits from parent if not set', () => {
    const parent = store.addObject('cube');
    parent.material = { diffuseTexture: 'parentTex', diffuseColor: [1, 0, 0], opacity: 1 };
    
    const child = store.addObject('sphere');
    store.setObjectParent(child.id, parent.id);
    // Child has no material set
    
    const mat = store.getEffectiveMaterial(child.id);
    expect(mat.diffuseTexture).toBe('parentTex');
  });
  
  test('getEffectiveMaterial returns default if no material anywhere', () => {
    const obj = store.addObject('cube');
    
    const mat = store.getEffectiveMaterial(obj.id);
    expect(mat.diffuseColor).toEqual([0.8, 0.8, 0.8]);
  });
});
