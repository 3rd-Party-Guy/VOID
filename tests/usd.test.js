import { describe, test, expect } from 'vitest';
import { USDExporter } from '../src/renderer/core/usd.js';

describe('USDExporter', () => {
  let exporter;
  
  beforeEach(() => {
    exporter = new USDExporter();
  });
  
  describe('exportScene', () => {
    test('generates USDA header', () => {
      const output = exporter.exportScene([]);
      
      expect(output).toContain('# USD Export from');
      expect(output).toContain('usdaVersion "2.0"');
    });
    
    test('creates World def', () => {
      const output = exporter.exportScene([]);
      
      expect(output).toContain('def "World"');
      expect(output).toContain('kind = "group"');
    });
  });
  
  describe('exportObject', () => {
    test('exports object with Xform', () => {
      const obj = {
        id: 'test-1',
        name: 'Cube_001',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1]
        },
        geometry: null,
        material: null
      };
      
      const output = exporter.exportObject(obj);
      
      expect(output).toContain('def Xform "Cube_001_Xform"');
      expect(output).toContain('kind = "component"');
    });
    
    test('exports transform values', () => {
      const obj = {
        id: 'test-1',
        name: 'TestObj',
        transform: {
          position: [1.5, 2.5, 3.5],
          rotation: [0.1, 0.2, 0.3],
          scale: [2, 2, 2]
        },
        geometry: null,
        material: null
      };
      
      const output = exporter.exportObject(obj);
      
      expect(output).toContain('xformOp:translate = (1.5, 2.5, 3.5)');
      expect(output).toContain('xformOp:scale = (2, 2, 2)');
    });
  });
  
  describe('exportMesh', () => {
    test('exports mesh with points', () => {
      const obj = {
        name: 'Cube_001',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        geometry: {
          vertices: new Float32Array([
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5
          ]),
          faces: new Uint16Array([0, 1, 2, 0, 2, 3]),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          vertexCount: 4,
          faceCount: 1
        },
        material: null
      };
      
      const output = exporter.exportMesh(obj);
      
      expect(output).toContain('def Mesh "Cube_001_Mesh"');
      expect(output).toContain('point3f[] points');
      expect(output).toContain('faceVertexCounts = [3]');
      expect(output).toContain('faceVertexIndices = [0, 1, 2, 0, 2, 3]');
    });
    
    test('exports UV coordinates as primvars', () => {
      const obj = {
        name: 'Cube_001',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        geometry: {
          vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
          faces: new Uint16Array([0, 1, 2]),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1]),
          vertexCount: 3,
          faceCount: 1
        },
        material: null
      };
      
      const output = exporter.exportMesh(obj);
      
      expect(output).toContain('texcoord2f[] primvars:st');
    });
    
    test('exports normals when provided', () => {
      const obj = {
        name: 'Cube_001',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        geometry: {
          vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
          faces: new Uint16Array([0, 1, 2]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          vertexCount: 3,
          faceCount: 1
        },
        material: null
      };
      
      const output = exporter.exportMesh(obj);
      
      expect(output).toContain('normal3f[] normals');
    });
  });
  
  describe('exportMaterial', () => {
    test('exports material with UsdPreviewSurface', () => {
      const material = {
        name: 'Material_Cube',
        diffuseColor: [0.8, 0.8, 0.8],
        opacity: 1.0
      };
      
      const output = exporter.exportMaterial(material);
      
      expect(output).toContain('def Material "Material_Cube"');
      expect(output).toContain('uniform token id = "UsdPreviewSurface"');
      expect(output).toContain('inputs:diffuseColor');
    });
    
    test('exports opacity when less than 1', () => {
      const material = {
        name: 'Material_Glass',
        diffuseColor: [1, 1, 1],
        opacity: 0.5
      };
      
      const output = exporter.exportMaterial(material);
      
      expect(output).toContain('inputs:opacity = 0.5');
    });
  });
  
  describe('sanitizeName', () => {
    test('removes special characters', () => {
      expect(exporter.sanitizeName('Cube 001')).toBe('Cube_001');
      expect(exporter.sanitizeName('Object-Test')).toBe('Object_Test');
    });
  });
  
  describe('formatNumber', () => {
    test('rounds to 4 decimal places', () => {
      expect(exporter.formatNumber(1.123456)).toBe('1.1235');
      expect(exporter.formatNumber(0.1)).toBe('0.1');
    });
  });
  
  describe('Integration', () => {
    test('exports complete scene with multiple objects', () => {
      const objects = [
        {
          id: '1',
          name: 'Cube_001',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          geometry: {
            vertices: new Float32Array([-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5]),
            faces: new Uint16Array([0, 1, 2, 0, 2, 3]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            vertexCount: 4,
            faceCount: 1
          },
          material: {
            name: 'Material_Cube',
            diffuseColor: [0.8, 0.2, 0.2],
            opacity: 1.0
          }
        },
        {
          id: '2',
          name: 'Sphere_001',
          transform: { position: [3, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          geometry: null,
          material: null
        }
      ];
      
      const output = exporter.exportScene(objects);
      
      expect(output).toContain('def "World"');
      expect(output).toContain('Cube_001_Xform');
      expect(output).toContain('Sphere_001_Xform');
      expect(output).toContain('xformOp:translate = (3, 0, 0)');
    });
  });
});

describe('USDExporter with Hierarchy', () => {
  let exporter;
  
  beforeEach(() => {
    exporter = new USDExporter();
  });
  
  test('exports objects with parentId in metadata', () => {
    const objects = [
      {
        id: 'parent-1',
        name: 'Parent',
        parentId: null,
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        geometry: {
          vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
          faces: new Uint16Array([0, 1, 2]),
          vertexCount: 3,
          faceCount: 1
        },
        material: null
      },
      {
        id: 'child-1',
        name: 'Child',
        parentId: 'parent-1',
        transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        geometry: {
          vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
          faces: new Uint16Array([0, 1, 2]),
          vertexCount: 3,
          faceCount: 1
        },
        material: null
      }
    ];
    
    const output = exporter.exportScene(objects);
    
    expect(output).toContain('def "World"');
    expect(output).toContain('def Xform "Parent_Xform"');
    expect(output).toContain('def Xform "Child_Xform"');
  });
});
