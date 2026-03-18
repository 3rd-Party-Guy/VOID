// USD Exporter - Generates USDA format

import * as THREE from 'three';
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js';

export class USDExporter {
  constructor() {
    this.version = 'VOID-0.1.0';
  }
  
  exportScene(objects, options = {}) {
    const lines = [];
    
    lines.push(`# USD Export from ${this.version}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('usdaVersion "2.0"');
    lines.push('');
    lines.push('def "World" (');
    lines.push('    kind = "group"');
    lines.push(') {');
    
    for (const obj of objects) {
      const objBlock = this.exportObject(obj);
      lines.push(objBlock);
    }
    
    lines.push('}');
    
    return lines.join('\n');
  }
  
  exportObject(obj) {
    const lines = [];
    const safeName = this.sanitizeName(obj.name);
    
    lines.push(`    def Xform "${safeName}_Xform" (`);
    lines.push('        kind = "component"');
    lines.push('    ) {');
    
    // Transform
    const { position, rotation, scale } = obj.transform;
    lines.push(`        double3 xformOp:translate = (${this.formatNumber(position[0])}, ${this.formatNumber(position[1])}, ${this.formatNumber(position[2])})`);
    lines.push(`        double3 xformOp:rotateXYZ = (${this.formatNumber(rotation[0])}, ${this.formatNumber(rotation[1])}, ${this.formatNumber(rotation[2])})`);
    lines.push(`        double3 xformOp:scale = (${this.formatNumber(scale[0])}, ${this.formatNumber(scale[1])}, ${this.formatNumber(scale[2])})`);
    
    lines.push('');
    
    // Geometry
    if (obj.geometry) {
      const meshBlock = this.exportMesh(obj);
      lines.push(meshBlock);
    }
    
    lines.push('    }');
    
    return lines.join('\n');
  }
  
  exportMesh(obj) {
    const lines = [];
    const safeName = this.sanitizeName(obj.name);
    const { geometry } = obj;
    
    lines.push(`        def Mesh "${safeName}_Mesh" {`);
    
    // Face vertex counts (assuming triangulated)
    const faceCounts = [];
    for (let i = 0; i < geometry.faceCount; i++) {
      faceCounts.push('3');
    }
    lines.push(`            int[] faceVertexCounts = [${faceCounts.join(', ')}]`);
    
    // Face vertex indices
    const indices = [];
    for (let i = 0; i < geometry.faces.length; i++) {
      indices.push(geometry.faces[i]);
    }
    lines.push(`            int[] faceVertexIndices = [${indices.join(', ')}]`);
    
    // Points (vertices)
    const points = [];
    for (let i = 0; i < geometry.vertices.length; i += 3) {
      points.push(`(${this.formatNumber(geometry.vertices[i])}, ${this.formatNumber(geometry.vertices[i+1])}, ${this.formatNumber(geometry.vertices[i+2])})`);
    }
    lines.push(`            point3f[] points = [${points.join(', ')}]`);
    
    // Normals (if available)
    if (geometry.normals && geometry.normals.length > 0) {
      const normals = [];
      for (let i = 0; i < geometry.normals.length; i += 3) {
        normals.push(`(${this.formatNumber(geometry.normals[i])}, ${this.formatNumber(geometry.normals[i+1])}, ${this.formatNumber(geometry.normals[i+2])})`);
      }
      lines.push(`            normal3f[] normals = [${normals.join(', ')}]`);
    }
    
    // UVs
    if (geometry.uvs && geometry.uvs.length > 0) {
      const uvs = [];
      for (let i = 0; i < geometry.uvs.length; i += 2) {
        uvs.push(`(${this.formatNumber(geometry.uvs[i])}, ${this.formatNumber(geometry.uvs[i+1])})`);
      }
      lines.push(`            texcoord2f[] primvars:st = [${uvs.join(', ')}]`);
    }
    
    lines.push('            uniform token subdivisionScheme = "none"');
    lines.push('            uniform bool doubleSided = true');
    lines.push('');
    
    // Material
    if (obj.material) {
      const matBlock = this.exportMaterial(obj.material);
      lines.push(matBlock);
    }
    
    lines.push('        }');
    
    return lines.join('\n');
  }
  
  exportMaterial(material) {
    const lines = [];
    const safeName = this.sanitizeName(material.name);
    
    lines.push('');
    lines.push(`            def Material "${safeName}" {`);
    lines.push('                token outputs:surface.connect = </World/' + safeName + '_Xform/' + safeName + '_Mesh/PreviewSurface>');
    lines.push('');
    lines.push('                def Shader "PreviewSurface" {');
    lines.push('                    uniform token id = "UsdPreviewSurface"');
    
    const { diffuseColor, opacity, diffuseTexture } = material;
    lines.push(`                    color3f inputs:diffuseColor = (${this.formatNumber(diffuseColor[0])}, ${this.formatNumber(diffuseColor[1])}, ${this.formatNumber(diffuseColor[2])})`);
    lines.push(`                    float inputs:roughness = 0.5`);
    lines.push(`                    float inputs:metallic = 0.0`);
    
    if (opacity !== undefined && opacity < 1.0) {
      lines.push(`                    float inputs:opacity = ${this.formatNumber(opacity)}`);
    }
    
    lines.push('                }');
    lines.push('            }');
    lines.push('');
    lines.push(`            rel material:binding = </World/${safeName}_Xform/${safeName}_Mesh/${safeName}>`);
    
    return lines.join('\n');
  }
  
  sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  formatNumber(n) {
    if (typeof n !== 'number') return '0';
    const rounded = Math.round(n * 10000) / 10000;
    return rounded.toString();
  }
}

export class USDImporter {
  constructor() {
    this.loader = new USDZLoader();
    this.errors = [];
  }
  
  async importFile(file) {
    this.errors = [];
    
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop().toLowerCase();
    
    try {
      if (ext === 'usda') {
        return await this.importUSDA(url, file.name);
      } else if (ext === 'usdc' || ext === 'usdz') {
        return await this.importViaThreeJS(url, file.name);
      } else {
        throw new Error(`Unsupported USD format: ${ext}`);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  
  async importUSDA(url, filename) {
    const response = await fetch(url);
    const text = await response.text();
    return this.parseUSDA(text, filename);
  }
  
  parseUSDA(text, filename) {
    const objects = [];
    const hierarchy = new Map(); // childId -> parentId
    const materials = [];
    
    // Simple USDA parser
    const lines = text.split('\n');
    const stack = []; // Stack of Xform names for hierarchy
    
    let currentXform = null;
    let currentMesh = null;
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Track hierarchy
      if (line.match(/^def\s+Xform\s+"/)) {
        const nameMatch = line.match(/def\s+Xform\s+"([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          
          // Pop stack until we find parent
          while (stack.length > 0 && !line.includes(stack[stack.length - 1])) {
            stack.pop();
          }
          
          const parentName = stack.length > 0 ? stack[stack.length - 1] : null;
          const objId = crypto.randomUUID();
          
          currentXform = {
            id: objId,
            name: name.replace(/_Xform$/, ''),
            type: 'custom',
            parentId: null,
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            geometry: null,
            material: { name: `Material_${name}`, diffuseTexture: null, diffuseColor: [0.8, 0.8, 0.8], opacity: 1.0 }
          };
          
          if (parentName) {
            hierarchy.set(objId, parentName);
          }
          
          stack.push(name);
        }
      }
      
      // Extract transform
      if (currentXform) {
        if (line.includes('xformOp:translate')) {
          const match = line.match(/=\s*\(([^)]+)\)/);
          if (match) {
            const [x, y, z] = match[1].split(',').map(Number);
            currentXform.transform.position = [x || 0, y || 0, z || 0];
          }
        } else if (line.includes('xformOp:rotateXYZ')) {
          const match = line.match(/=\s*\(([^)]+)\)/);
          if (match) {
            const [rx, ry, rz] = match[1].split(',').map(Number);
            currentXform.transform.rotation = [rx || 0, ry || 0, rz || 0];
          }
        } else if (line.includes('xformOp:scale')) {
          const match = line.match(/=\s*\(([^)]+)\)/);
          if (match) {
            const [sx, sy, sz] = match[1].split(',').map(Number);
            currentXform.transform.scale = [sx || 1, sy || 1, sz || 1];
          }
        }
      }
      
      // Extract mesh data
      if (line.match(/^def\s+Mesh\s+"/)) {
        const meshNameMatch = line.match(/def\s+Mesh\s+"([^"]+)"/);
        currentMesh = {
          name: meshNameMatch ? meshNameMatch[1] : 'Mesh',
          vertices: [],
          faces: [],
          uvs: [],
          faceCount: 0
        };
      }
      
      if (currentMesh) {
        // Points
        if (line.includes('point3f[] points')) {
          const match = line.match(/=\s*\[([^\]]+)\]/);
          if (match) {
            const pointsStr = match[1];
            const points = pointsStr.match(/\(([^)]+)\)/g);
            if (points) {
              points.forEach(p => {
                const [x, y, z] = p.slice(1, -1).split(',').map(Number);
                currentMesh.vertices.push(x || 0, y || 0, z || 0);
              });
            }
          }
        }
        
        // Face vertex indices
        if (line.includes('faceVertexIndices')) {
          const match = line.match(/=\s*\[([^\]]+)\]/);
          if (match) {
            const indices = match[1].split(',').map(s => parseInt(s.trim()));
            currentMesh.faces = new Uint16Array(indices);
            currentMesh.faceCount = indices.length / 3;
          }
        }
        
        // UVs
        if (line.includes('primvars:st') || line.includes('texcoord2f[]')) {
          const match = line.match(/=\s*\[([^\]]+)\]/);
          if (match) {
            const uvsStr = match[1];
            const uvs = uvsStr.match(/\(([^)]+)\)/g);
            if (uvs) {
                uvs.forEach(uv => {
                const [uVal, vVal] = uv.slice(1, -1).split(',').map(Number);
                currentMesh.uvs.push(uVal || 0, vVal || 0);
              });
            }
          }
        }
        
        // End of mesh definition
        if (line === '}' && currentMesh && currentMesh.vertices.length > 0 && currentXform) {
          currentXform.geometry = {
            vertices: new Float32Array(currentMesh.vertices),
            faces: currentMesh.faces,
            uvs: currentMesh.uvs.length > 0 ? new Float32Array(currentMesh.uvs) : null,
            vertexCount: currentMesh.vertices.length / 3,
            faceCount: currentMesh.faceCount
          };
          currentMesh = null;
        }
      }
      
      // End of Xform block
      if (line === '}' && currentXform && currentXform.geometry) {
        objects.push(currentXform);
        if (stack.length > 0) {
          stack.pop();
        }
        currentXform = null;
      }
      
      i++;
    }
    
    // Build parent relationships from hierarchy
    this.resolveHierarchy(objects, hierarchy);
    
    return {
      objects,
      materials,
      errors: this.errors
    };
  }
  
  resolveHierarchy(objects, hierarchy) {
    const nameToId = new Map();
    objects.forEach(obj => nameToId.set(obj.name, obj.id));
    
    hierarchy.forEach((parentName, childId) => {
      const parentId = nameToId.get(parentName);
      if (parentId) {
        const child = objects.find(o => o.id === childId);
        if (child) {
          child.parentId = parentId;
        }
      }
    });
  }
  
  async importViaThreeJS(url, filename) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (group) => {
          const result = this.convertThreeGroup(group);
          resolve(result);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }
  
  convertThreeGroup(group) {
    const objects = [];
    const materials = [];
    const hierarchy = new Map();
    
    const processObject = (threeObj, parentThreeObj = null) => {
      if (threeObj instanceof THREE.Mesh) {
        const obj = this.convertMeshToObject(threeObj);
        
        if (parentThreeObj) {
          const parentId = this.getObjectId(parentThreeObj);
          if (parentId) {
            hierarchy.set(obj.id, parentId);
          }
        }
        
        objects.push(obj);
      }
      
      threeObj.children.forEach(child => processObject(child, threeObj));
    };
    
    // Assign IDs to all objects first
    const idMap = new Map();
    const assignIds = (obj) => {
      const id = crypto.randomUUID();
      idMap.set(obj, id);
      obj.children.forEach(assignIds);
    };
    assignIds(group);
    
    // Store ID on each object for later reference
    group.traverse((obj) => {
      obj.userData.voidId = idMap.get(obj);
    });
    
    this.getObjectId = (obj) => obj.userData?.voidId || null;
    
    processObject(group);
    
    // Build parent relationships
    this.resolveHierarchyFromThree(objects, group);
    
    return {
      objects,
      materials,
      errors: this.errors
    };
  }
  
  resolveHierarchyFromThree(objects, group) {
    const idMap = new Map();
    group.traverse((obj) => {
      if (obj.userData.voidId) {
        idMap.set(obj.userData.voidId, obj);
      }
    });
    
    // For each VOID object, find its Three.js parent
    objects.forEach(obj => {
      const threeObj = idMap.get(obj.id);
      if (threeObj && threeObj.parent && threeObj.parent !== group) {
        const parentId = threeObj.parent.userData?.voidId;
        if (parentId) {
          const parentObj = objects.find(o => o.id === parentId);
          if (parentObj) {
            obj.parentId = parentId;
          }
        }
      }
    });
  }
  
  convertMeshToObject(mesh) {
    const geometry = mesh.geometry;
    const material = mesh.material;
    
    let vertices = null;
    let faces = null;
    let uvs = null;
    
    if (geometry.attributes.position) {
      const pos = geometry.attributes.position;
      vertices = new Float32Array(pos.array);
    }
    
    if (geometry.index) {
      faces = geometry.index.array;
    } else if (vertices) {
      // Create faces for non-indexed geometry
      const faceCount = vertices.length / 3;
      faces = new Uint16Array(faceCount * 3);
      for (let i = 0; i < faceCount * 3; i++) {
        faces[i] = i;
      }
    }
    
    if (geometry.attributes.uv) {
      uvs = new Float32Array(geometry.attributes.uv.array);
    }
    
    let mat = {
      name: 'ImportedMaterial',
      diffuseTexture: null,
      diffuseColor: [0.8, 0.8, 0.8],
      opacity: 1.0
    };
    
    if (material) {
      if (material.color) {
        mat.diffuseColor = [material.color.r, material.color.g, material.color.b];
      }
      if (material.map) {
        // Texture would need to be loaded separately
        mat.diffuseTexture = null;
      }
      if (material.opacity !== undefined) {
        mat.opacity = material.opacity;
      }
    }
    
    const obj = {
      id: crypto.randomUUID(),
      name: mesh.name || 'ImportedObject',
      type: 'custom',
      parentId: null,
      transform: {
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
        scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z]
      },
      geometry: vertices ? {
        vertices,
        faces,
        uvs,
        vertexCount: vertices.length / 3,
        faceCount: faces ? faces.length / 3 : 0
      } : null,
      material: mat
    };
    
    return obj;
  }
}

export const usdExporter = new USDExporter();
export const usdImporter = new USDImporter();
