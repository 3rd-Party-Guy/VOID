import { describe, test, expect } from 'vitest';
import {
  createCube,
  createSphere,
  createCylinder,
  createCone,
  createPyramid,
  createPlane,
  createTorus,
  createTriangle,
  createGeometry,
  GeometryTypes,
  computeNormals
} from '../src/renderer/core/geometry.js';

describe('GeometryFactory', () => {
  describe('createCube', () => {
    test('creates cube with correct vertex count', () => {
      const cube = createCube({ size: 1 });
      expect(cube.vertexCount).toBe(8);
    });
    
    test('creates cube with correct face count', () => {
      const cube = createCube({ size: 1 });
      expect(cube.faceCount).toBe(12); // 12 triangles = 6 faces
    });
    
    test('creates cube with correct UV count', () => {
      const cube = createCube({ size: 1 });
      expect(cube.uvs.length).toBe(16); // 8 vertices * 2 UV coords
    });
    
    test('scales correctly based on size parameter', () => {
      const cube = createCube({ size: 2 });
      const min = Math.min(...cube.vertices);
      const max = Math.max(...cube.vertices);
      expect(min).toBe(-1);
      expect(max).toBe(1);
    });
  });
  
  describe('createSphere', () => {
    test('creates sphere with triangulated faces', () => {
      const sphere = createSphere({ radius: 0.5, segments: 16, rings: 8 });
      expect(sphere.faceCount).toBe(256); // 16 segments * 8 rings * 2 triangles
    });
    
    test('has UV coordinates', () => {
      const sphere = createSphere();
      expect(sphere.uvs.length).toBeGreaterThan(0);
    });
  });
  
  describe('createCylinder', () => {
    test('creates cylinder with correct structure', () => {
      const cyl = createCylinder({ radius: 0.5, height: 1, segments: 32 });
      expect(cyl.vertexCount).toBe(66); // 32 segments + 1 center * 2 (top/bottom)
    });
  });
  
  describe('createCone', () => {
    test('creates cone with tip and base', () => {
      const cone = createCone({ radius: 0.5, height: 1, segments: 32 });
      expect(cone.vertexCount).toBeGreaterThanOrEqual(32); // tip + base vertices
    });
  });
  
  describe('createPyramid', () => {
    test('creates pyramid with 5 vertices', () => {
      const pyramid = createPyramid({ baseSize: 1, height: 1 });
      expect(pyramid.vertexCount).toBe(5);
    });
    
    test('creates pyramid with 5 faces (4 sides + 1 base)', () => {
      const pyramid = createPyramid();
      expect(pyramid.faceCount).toBe(5);
    });
  });
  
  describe('createPlane', () => {
    test('creates plane with 4 vertices', () => {
      const plane = createPlane({ size: 1 });
      expect(plane.vertexCount).toBe(4);
    });
    
    test('creates plane with triangulated faces', () => {
      const plane = createPlane();
      expect(plane.faceCount).toBe(1);
    });
  });
  
  describe('createTorus', () => {
    test('creates torus with correct structure', () => {
      const torus = createTorus({ majorRadius: 0.5, minorRadius: 0.2, segments: 48, sides: 12 });
      expect(torus.vertexCount).toBeGreaterThan(0);
    });
  });
  
  describe('createTriangle', () => {
    test('creates triangle with 3 vertices', () => {
      const tri = createTriangle({ side: 1 });
      expect(tri.vertexCount).toBe(3);
    });
    
    test('creates triangle with 1 face', () => {
      const tri = createTriangle();
      expect(tri.faceCount).toBe(1);
    });
  });
  
  describe('createGeometry', () => {
    test('creates cube via factory', () => {
      const cube = createGeometry(GeometryTypes.CUBE);
      expect(cube.vertexCount).toBe(8);
    });
    
    test('creates sphere via factory', () => {
      const sphere = createGeometry(GeometryTypes.SPHERE);
      expect(sphere.vertexCount).toBeGreaterThan(0);
    });
    
    test('throws on unknown type', () => {
      expect(() => createGeometry('unknown')).toThrow();
    });
  });
  
  describe('computeNormals', () => {
    test('computes normals for cube', () => {
      const cube = createCube({ size: 1 });
      const normals = computeNormals(cube.vertices, cube.faces);
      expect(normals.length).toBe(cube.vertices.length);
    });
    
    test('returns unit normals', () => {
      const cube = createCube({ size: 1 });
      const normals = computeNormals(cube.vertices, cube.faces);
      
      for (let i = 0; i < normals.length; i += 3) {
        const len = Math.sqrt(normals[i]**2 + normals[i+1]**2 + normals[i+2]**2);
        expect(len).toBeCloseTo(1, 5);
      }
    });
  });
});
