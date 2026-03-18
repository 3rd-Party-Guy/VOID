import { describe, test, expect, beforeEach } from 'vitest';
import { Store } from '../src/renderer/core/store.js';
import { createGeometry, GeometryTypes } from '../src/renderer/core/geometry.js';

describe('M9: Texture System Tests', () => {
  let store;
  
  beforeEach(() => {
    store = new Store();
  });
  
  describe('Texture Management', () => {
    test('addTexture adds a texture', () => {
      const id = store.addTexture('test.png', 'data:image/png;base64,abc123');
      expect(id).toBeDefined();
      expect(id).toContain('tex_');
    });
    
    test('getTextures returns all textures', () => {
      store.addTexture('tex1.png', 'data:image/png;base64,abc');
      store.addTexture('tex2.jpg', 'data:image/jpeg;base64,xyz');
      
      const textures = store.getTextures();
      expect(textures.length).toBe(2);
    });
    
    test('getTexture returns specific texture', () => {
      const id = store.addTexture('test.png', 'data:image/png;base64,abc123');
      const tex = store.getTexture(id);
      
      expect(tex).toBeDefined();
      expect(tex.name).toBe('test.png');
    });
  });
  
  describe('Object Texture', () => {
    test('setObjectTexture sets texture on object', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const texId = store.addTexture('test.png', 'data:image/png;base64,abc');
      
      store.setObjectTexture(obj.id, texId);
      
      const updated = store.getObject(obj.id);
      expect(updated.textureId).toBe(texId);
    });
    
    test('setObjectTexture clears face textures', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const texId = store.addTexture('test.png', 'data:image/png;base64,abc');
      
      store.setFaceTexture(obj.id, 0, texId);
      store.setObjectTexture(obj.id, texId);
      
      const updated = store.getObject(obj.id);
      expect(updated.faceTextures.size).toBe(0);
    });
  });
  
  describe('Face Texture', () => {
    test('setFaceTexture sets texture on specific face', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const texId = store.addTexture('test.png', 'data:image/png;base64,abc');
      
      store.setFaceTexture(obj.id, 0, texId);
      
      const updated = store.getObject(obj.id);
      expect(updated.faceTextures.get(0)).toBe(texId);
    });
    
    test('setFaceTexture with null removes texture', () => {
      const obj = store.addObject('cube', { geometry: createGeometry(GeometryTypes.CUBE) });
      const texId = store.addTexture('test.png', 'data:image/png;base64,abc');
      
      store.setFaceTexture(obj.id, 0, texId);
      store.setFaceTexture(obj.id, 0, null);
      
      const updated = store.getObject(obj.id);
      expect(updated.faceTextures.has(0)).toBe(false);
    });
  });
});
