// VOID - Main Renderer Entry Point

import * as THREE from 'three';
import { createGeometry, GeometryTypes } from './core/geometry.js';
import { store } from './core/store.js';
import { SceneManager } from './three/scene.js';

class VoidApp {
  constructor() {
    this.mode = 'normal';
    this.sceneManager = null;
    this.meshes = new Map();
    this.selectedIds = new Set();
    this.vertexPoints = [];
    this.vertexPointMeshes = new Map();
    this.edgeLines = [];
    this.edgeLineMeshes = new Map();
    this.faceMeshes = new Map();
    this.faceTextureMeshes = [];
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    
    this.init();
  }
  
  init() {
    console.log('VOID initializing...');
    this.initSceneManager();
    this.initUI();
    this.initStoreSubscription();
    this.initVim();
    this.initMenu();
    console.log('VOID ready');
  }
  
  initSceneManager() {
    const canvas = document.getElementById('three-canvas');
    const container = document.getElementById('viewport');
    
    this.sceneManager = new SceneManager(canvas);
    this.sceneManager.animate();
  }
  
  initUI() {
    this.commandInput = document.getElementById('command-input');
    this.sceneList = document.getElementById('scene-list');
    this.propertiesContent = document.getElementById('properties-content');
    this.statusEl = document.getElementById('status');
    
    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.executeCommand(this.commandInput.value);
        this.commandInput.value = '';
      }
    });
    
    // Viewport click handler for vertex selection
    const canvas = document.getElementById('three-canvas');
    canvas.addEventListener('click', (e) => {
      this.handleViewportClick(e);
    });
    
    this.updateSceneList();
    this.updateProperties();
  }
  
  initStoreSubscription() {
    store.subscribe(() => {
      this.syncFromStore();
    });
  }
  
  syncFromStore() {
    // First, remove all existing meshes from scene
    this.meshes.forEach((mesh) => {
      this.sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.meshes.clear();
    
    // Clear vertex points
    this.clearVertexPoints();
    // Clear edge lines
    this.clearEdgeLines();
    // Clear face overlays
    this.clearFaceMeshes();
    // Clear face texture meshes
    this.clearFaceTextureMeshes();
    
    const objects = store.getObjects();
    const selectedIds = store.getSelectedIds();
    const editingVertexIds = store.getState().editingVertexIds;
    
    objects.forEach(obj => {
      if (!obj || !obj.id) return; // Skip undefined/null objects
      if (obj.geometry) {
        const threeGeom = this.createThreeGeometry(obj.geometry);
        
        // Highlight selected objects with accent color
        const isSelected = selectedIds.includes(obj.id);
        
        const material = this.createMaterial(obj, isSelected);
        const mesh = new THREE.Mesh(threeGeom, material);
        
        const [px, py, pz] = obj.transform.position;
        const [rx, ry, rz] = obj.transform.rotation;
        const [sx, sy, sz] = obj.transform.scale;
        
        mesh.position.set(px, py, pz);
        mesh.rotation.set(rx, ry, rz);
        mesh.scale.set(sx, sy, sz);
        
        mesh.userData.voidId = obj.id;
        this.sceneManager.scene.add(mesh);
        this.meshes.set(obj.id, mesh);
        
        // Show vertex points in vertex edit mode
        if (this.mode === 'vertex' && isSelected) {
          this.createVertexPoints(obj);
        }
        
        // Show edge lines in edge edit mode
        if (this.mode === 'edge' && isSelected) {
          this.createEdgeLines(obj);
        }
        
        // Show face selection in face edit mode
        if (this.mode === 'face' && isSelected) {
          this.createFaceOverlay(obj);
        }
        
        // Show per-face textures
        if (obj.faceTextures && obj.faceTextures.size > 0) {
          this.createFaceTextureMeshes(obj);
        }
      }
    });
    
    this.updateSceneList();
    this.updateProperties();
  }
  
  handleViewportClick(event) {
    const selectedIds = store.getSelectedIds();
    if (selectedIds.length === 0) return;
    
    const objectId = selectedIds[0];
    const obj = store.getObject(objectId);
    if (!obj || !obj.geometry) return;
    
    // Get click position relative to canvas
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast to find closest vertex or edge
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
    raycaster.params.Points.threshold = 0.1;
    raycaster.params.Line.threshold = 0.1;
    
    const isShiftClick = event.shiftKey;
    
    if (this.mode === 'vertex') {
      const points = this.vertexPointMeshes.get(objectId);
      if (!points) return;
      
      const intersects = raycaster.intersectObject(points);
      
      if (intersects.length > 0) {
        const index = intersects[0].index;
        if (index !== undefined) {
          if (isShiftClick) {
            store.toggleVertexSelection(objectId, index);
          } else {
            store.selectVertex(objectId, index);
          }
        }
      }
    } else if (this.mode === 'edge') {
      const lines = this.edgeLineMeshes.get(objectId);
      if (!lines) return;
      
      const intersects = raycaster.intersectObject(lines);
      
      if (intersects.length > 0) {
        const segmentIndex = Math.floor(intersects[0].index / 2);
        if (segmentIndex !== undefined) {
          if (isShiftClick) {
            store.selectEdgeLoop(objectId, segmentIndex);
          } else {
            store.selectEdge(objectId, segmentIndex);
          }
        }
      }
    } else if (this.mode === 'face') {
      const mesh = this.faceMeshes.get(objectId);
      if (!mesh) return;
      
      const intersects = raycaster.intersectObject(mesh);
      
      if (intersects.length > 0) {
        const faceIndex = intersects[0].faceIndex;
        if (faceIndex !== undefined) {
          if (isShiftClick) {
            store.toggleFaceSelection(objectId, faceIndex);
          } else {
            store.selectFace(objectId, faceIndex);
          }
        }
      }
    }
  }
  
  clearVertexPoints() {
    this.vertexPoints.forEach(points => {
      this.sceneManager.scene.remove(points);
      points.geometry.dispose();
      points.material.dispose();
    });
    this.vertexPoints = [];
    this.vertexPointMeshes.clear();
  }
  
  clearEdgeLines() {
    this.edgeLines.forEach(lines => {
      this.sceneManager.scene.remove(lines);
      lines.geometry.dispose();
      lines.material.dispose();
    });
    this.edgeLines = [];
    this.edgeLineMeshes.clear();
  }
  
  clearFaceMeshes() {
    this.faceMeshes.forEach(mesh => {
      this.sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.faceMeshes.clear();
  }
  
  clearFaceTextureMeshes() {
    this.faceTextureMeshes.forEach(mesh => {
      this.sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    });
    this.faceTextureMeshes = [];
  }
  
  createFaceTextureMeshes(obj) {
    if (!obj.faceTextures || obj.faceTextures.size === 0) return;
    
    const vertices = obj.geometry.vertices;
    const faces = obj.geometry.faces;
    
    const [px, py, pz] = obj.transform.position;
    const [rx, ry, rz] = obj.transform.rotation;
    const [sx, sy, sz] = obj.transform.scale;
    
    obj.faceTextures.forEach((textureId, faceIndex) => {
      const texture = this.getTexture(textureId);
      if (!texture) return;
      
      // Create geometry for just this face
      const a = faces[faceIndex * 3];
      const b = faces[faceIndex * 3 + 1];
      const c = faces[faceIndex * 3 + 2];
      
      const faceVertices = new Float32Array([
        vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
        vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
        vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2]
      ]);
      
      // Simple UVs for the face (planar mapping)
      const faceUvs = new Float32Array([
        0, 0,
        1, 0,
        0.5, 1
      ]);
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(faceVertices, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(faceUvs, 2));
      geometry.computeVertexNormals();
      
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(sx, sy, sz);
      
      this.sceneManager.scene.add(mesh);
      this.faceTextureMeshes.push(mesh);
    });
  }
  
  createVertexPoints(obj) {
    const vertices = obj.geometry.vertices;
    const positions = [];
    const colors = [];
    const editingVertexIds = store.getState().editingVertexIds;
    
    for (let i = 0; i < vertices.length; i += 3) {
      positions.push(vertices[i], vertices[i + 1], vertices[i + 2]);
      
      const isSelected = editingVertexIds.includes(`${obj.id}:${i / 3}`);
      if (isSelected) {
        colors.push(1, 1, 0); // Yellow for selected
      } else {
        colors.push(1, 0, 1); // Magenta for unselected
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      sizeAttenuation: true
    });
    
    const points = new THREE.Points(geometry, material);
    
    // Apply object transform
    const [px, py, pz] = obj.transform.position;
    const [rx, ry, rz] = obj.transform.rotation;
    const [sx, sy, sz] = obj.transform.scale;
    points.position.set(px, py, pz);
    points.rotation.set(rx, ry, rz);
    points.scale.set(sx, sy, sz);
    
    points.userData = { objectId: obj.id };
    this.sceneManager.scene.add(points);
    this.vertexPoints.push(points);
    this.vertexPointMeshes.set(obj.id, points);
  }
  
  createEdgeLines(obj) {
    const vertices = obj.geometry.vertices;
    const faces = obj.geometry.faces;
    const editingEdgeIds = store.getState().editingEdgeIds;
    
    const positions = [];
    const colors = [];
    
    const edgeMap = new Map();
    
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i];
      const b = faces[i + 1];
      const c = faces[i + 2];
      
      const edges = [
        [a, b],
        [b, c],
        [c, a]
      ];
      
      edges.forEach(([v1, v2], edgeIdx) => {
        const minV = Math.min(v1, v2);
        const maxV = Math.max(v1, v2);
        const edgeKey = `${minV}:${maxV}`;
        
        if (!edgeMap.has(edgeKey)) {
          const edgeIndex = edgeMap.size;
          edgeMap.set(edgeKey, {
            v1: minV,
            v2: maxV,
            index: edgeIndex
          });
          
          const isSelected = editingEdgeIds.includes(`${obj.id}:${edgeIndex}`);
          
          positions.push(
            vertices[minV * 3], vertices[minV * 3 + 1], vertices[minV * 3 + 2],
            vertices[maxV * 3], vertices[maxV * 3 + 1], vertices[maxV * 3 + 2]
          );
          
          if (isSelected) {
            colors.push(1, 1, 0, 1, 1, 0);
          } else {
            colors.push(0, 1, 1, 0, 1, 1);
          }
        }
      });
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2
    });
    
    const lines = new THREE.LineSegments(geometry, material);
    
    const [px, py, pz] = obj.transform.position;
    const [rx, ry, rz] = obj.transform.rotation;
    const [sx, sy, sz] = obj.transform.scale;
    lines.position.set(px, py, pz);
    lines.rotation.set(rx, ry, rz);
    lines.scale.set(sx, sy, sz);
    
    lines.userData = { objectId: obj.id, edgeMap: edgeMap };
    this.sceneManager.scene.add(lines);
    this.edgeLines.push(lines);
    this.edgeLineMeshes.set(obj.id, lines);
  }
  
  createFaceOverlay(obj) {
    const vertices = obj.geometry.vertices;
    const faces = obj.geometry.faces;
    const editingFaceIds = store.getState().editingFaceIds;
    
    const positions = [];
    const colors = [];
    
    for (let i = 0; i < faces.length; i += 3) {
      const faceIndex = i / 3;
      const a = faces[i];
      const b = faces[i + 1];
      const c = faces[i + 2];
      
      positions.push(
        vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2],
        vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2],
        vertices[c * 3], vertices[c * 3 + 1], vertices[c * 3 + 2]
      );
      
      const isSelected = editingFaceIds.includes(`${obj.id}:${faceIndex}`);
      
      if (isSelected) {
        colors.push(1, 1, 0, 1, 1, 0, 1, 1, 0);
      } else {
        colors.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      depthTest: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    const [px, py, pz] = obj.transform.position;
    const [rx, ry, rz] = obj.transform.rotation;
    const [sx, sy, sz] = obj.transform.scale;
    mesh.position.set(px, py, pz);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    
    mesh.userData = { objectId: obj.id };
    this.sceneManager.scene.add(mesh);
    this.faceMeshes.set(obj.id, mesh);
  }
  
  createMaterial(obj, isSelected) {
    let map = null;
    if (obj.textureId) {
      map = this.getTexture(obj.textureId);
    }
    
    // Determine base color and emissive
    let baseColor = 0xffffff;
    let emissive = 0x000000;
    let emissiveIntensity = 0;
    
    // If no texture, use mode colors
    if (!map) {
      baseColor = isSelected ? 0x3fb950 : 0x58a6ff;
      emissive = isSelected ? 0x1a4d2e : 0x000000;
      emissiveIntensity = isSelected ? 0.3 : 0;
    } else {
      // Has texture - use white for accurate color reproduction
      baseColor = 0xffffff;
      // Add green tint when selected in any mode
      if (isSelected) {
        emissive = 0x1a4d2e;
        emissiveIntensity = 0.15;
      }
    }
    
    const material = new THREE.MeshStandardMaterial({ 
      color: baseColor,
      map: map,
      side: THREE.DoubleSide,
      emissive: emissive,
      emissiveIntensity: emissiveIntensity
    });
    
    return material;
  }
  
  getTexture(textureId) {
    if (this.textureCache.has(textureId)) {
      return this.textureCache.get(textureId);
    }
    
    const texture = store.getTexture(textureId);
    if (!texture) return null;
    
    const loader = new THREE.TextureLoader();
    const tex = loader.load(texture.dataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this.textureCache.set(textureId, tex);
    return tex;
  }
  
  createThreeGeometry(geometryData) {
    const vertices = geometryData.vertices;
    const faces = geometryData.faces;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(vertices), 3));
    
    if (geometryData.uvs) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from(geometryData.uvs), 2));
    }
    
    if (faces) {
      geometry.setIndex(new THREE.Uint16BufferAttribute(Array.from(faces), 1));
    }
    
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  initVim() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (this.mode) {
        case 'normal':
          this.handleNormalMode(e);
          break;
        case 'insert':
          this.handleInsertMode(e);
          break;
        case 'vertex':
          this.handleVertexMode(e);
          break;
        case 'edge':
          this.handleEdgeMode(e);
          break;
        case 'face':
          this.handleFaceMode(e);
          break;
      }
    });
  }
  
  handleNormalMode(e) {
    switch (e.key) {
      case 'h': this.sceneManager.panCamera(-0.5, 0); break;
      case 'j': this.sceneManager.panCamera(0, -0.5); break;
      case 'k': this.sceneManager.panCamera(0, 0.5); break;
      case 'l': this.sceneManager.panCamera(0.5, 0); break;
      case 'w': this.sceneManager.zoomCamera(1.1); break;
      case 's': this.sceneManager.zoomCamera(0.9); break;
      case 'q': this.sceneManager.orbitCamera(0.1, 0); break;
      case 'z': this.sceneManager.orbitCamera(-0.1, 0); break;
      case 'i': this.setMode('insert'); break;
      case 'g': this.setMode('vertex'); break;
      case 'e': this.setMode('edge'); break;
      case 'f': this.setMode('face'); break;
      case 'd': this.deleteSelected(); break;
      case 'u': this.undo(); break;
      case 'r': if (e.ctrlKey) this.redo(); break;
      case '/': this.commandInput.focus(); break;
      case '1': this.createObject('cube'); break;
      case '2': this.createObject('sphere'); break;
      case '3': this.createObject('cylinder'); break;
      case '4': this.createObject('cone'); break;
      case '5': this.createObject('pyramid'); break;
      case '6': this.createObject('plane'); break;
      case '7': this.createObject('torus'); break;
      case '8': this.createObject('triangle'); break;
      case 'Escape':
        store.clearSelection();
        this.setMode('normal');
        break;
    }
  }
  
  handleInsertMode(e) {
    if (e.key === 'Escape') {
      this.setMode('normal');
      return;
    }
    
    switch (e.key) {
      case 'c': this.createObject('cube'); break;
      case 's': this.createObject('sphere'); break;
      case 'y': this.createObject('cylinder'); break;
      case 'o': this.createObject('cone'); break;
      case 'p': this.createObject('pyramid'); break;
      case 'l': this.createObject('plane'); break;
      case 't': this.createObject('torus'); break;
      case 'r': this.createObject('triangle'); break;
    }
  }
  
  handleVertexMode(e) {
    if (e.key === 'Escape') {
      store.clearSelection();
      this.setMode('normal');
      return;
    }
    
    // Vertex movement with h/j/k/l
    const selected = store.getSelectedObjects();
    if (selected.length === 0) return;
    
    const obj = selected[0];
    const editingVertexIds = store.getState().editingVertexIds;
    
    if (editingVertexIds.length === 0) return;
    
    // Get movement amount
    let amount = e.shiftKey ? 0.1 : 0.5;
    if (e.altKey) amount = 0.01;
    
    // Apply movement based on key
    editingVertexIds.forEach(key => {
      const [objectId, vertexIndexStr] = key.split(':');
      const vertexIndex = parseInt(vertexIndexStr);
      
      if (objectId !== obj.id) return;
      
      const currentObj = store.getObject(objectId);
      if (!currentObj || !currentObj.geometry) return;
      
      const vertices = currentObj.geometry.vertices;
      let x = vertices[vertexIndex * 3];
      let y = vertices[vertexIndex * 3 + 1];
      let z = vertices[vertexIndex * 3 + 2];
      
      switch (e.key) {
        case 'h': x -= amount; break;
        case 'l': x += amount; break;
        case 'j': y -= amount; break;
        case 'k': y += amount; break;
        case 'z': z -= amount; break;
        case 'w': z += amount; break;
        case 'x': // Lock to X axis
        case 'y': // Lock to Y axis  
        case 'z': // Lock to Z axis - handled above
          break;
      }
      
      store.setVertexPosition(objectId, vertexIndex, [x, y, z]);
    });
  }
  
  handleEdgeMode(e) {
    if (e.key === 'Escape') {
      store.clearSelection();
      this.setMode('normal');
      return;
    }
    
    // Edge movement with h/j/k/l
    const selected = store.getSelectedObjects();
    if (selected.length === 0) return;
    
    const obj = selected[0];
    const editingEdgeIds = store.getState().editingEdgeIds;
    
    if (editingEdgeIds.length === 0) return;
    
    // Get movement amount
    let amount = e.shiftKey ? 0.1 : 0.5;
    if (e.altKey) amount = 0.01;
    
    // Apply movement to all vertices of selected edges
    const verticesToMove = new Set();
    
    editingEdgeIds.forEach(key => {
      const [objectId, edgeIndexStr] = key.split(':');
      const edgeIndex = parseInt(edgeIndexStr);
      
      if (objectId !== obj.id) return;
      
      const currentObj = store.getObject(objectId);
      if (!currentObj || !currentObj.geometry) return;
      
      const faces = currentObj.geometry.faces;
      const edgeMap = new Map();
      
      let eIdx = 0;
      for (let i = 0; i < faces.length; i += 3) {
        const a = faces[i];
        const b = faces[i + 1];
        const c = faces[i + 2];
        
        const edges = [
          [Math.min(a, b), Math.max(a, b)],
          [Math.min(b, c), Math.max(b, c)],
          [Math.min(c, a), Math.max(c, a)]
        ];
        
        edges.forEach(([v1, v2]) => {
          const edgeKey = `${v1}:${v2}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, eIdx);
            eIdx++;
          }
        });
      }
      
      for (const [key, idx] of edgeMap) {
        if (idx === edgeIndex) {
          const [v1, v2] = key.split(':').map(Number);
          verticesToMove.add(v1);
          verticesToMove.add(v2);
        }
      }
    });
    
    verticesToMove.forEach(vertexIndex => {
      const currentObj = store.getObject(obj.id);
      if (!currentObj || !currentObj.geometry) return;
      
      const vertices = currentObj.geometry.vertices;
      let x = vertices[vertexIndex * 3];
      let y = vertices[vertexIndex * 3 + 1];
      let z = vertices[vertexIndex * 3 + 2];
      
      switch (e.key) {
        case 'h': x -= amount; break;
        case 'l': x += amount; break;
        case 'j': y -= amount; break;
        case 'k': y += amount; break;
        case 'z': z -= amount; break;
        case 'w': z += amount; break;
      }
      
      store.setVertexPosition(obj.id, vertexIndex, [x, y, z]);
    });
  }
  
  handleFaceMode(e) {
    if (e.key === 'Escape') {
      store.clearSelection();
      this.setMode('normal');
      return;
    }
    
    // Face movement with h/j/k/l
    const selected = store.getSelectedObjects();
    if (selected.length === 0) return;
    
    const obj = selected[0];
    const editingFaceIds = store.getState().editingFaceIds;
    
    if (editingFaceIds.length === 0) return;
    
    // Get movement amount
    let amount = e.shiftKey ? 0.1 : 0.5;
    if (e.altKey) amount = 0.01;
    
    // Apply movement to all vertices of selected faces
    const verticesToMove = new Set();
    
    editingFaceIds.forEach(key => {
      const [objectId, faceIndexStr] = key.split(':');
      const faceIndex = parseInt(faceIndexStr);
      
      if (objectId !== obj.id) return;
      
      const currentObj = store.getObject(objectId);
      if (!currentObj || !currentObj.geometry) return;
      
      const faces = currentObj.geometry.faces;
      
      const a = faces[faceIndex * 3];
      const b = faces[faceIndex * 3 + 1];
      const c = faces[faceIndex * 3 + 2];
      
      verticesToMove.add(a);
      verticesToMove.add(b);
      verticesToMove.add(c);
    });
    
    verticesToMove.forEach(vertexIndex => {
      const currentObj = store.getObject(obj.id);
      if (!currentObj || !currentObj.geometry) return;
      
      const vertices = currentObj.geometry.vertices;
      let x = vertices[vertexIndex * 3];
      let y = vertices[vertexIndex * 3 + 1];
      let z = vertices[vertexIndex * 3 + 2];
      
      switch (e.key) {
        case 'h': x -= amount; break;
        case 'l': x += amount; break;
        case 'j': y -= amount; break;
        case 'k': y += amount; break;
        case 'z': z -= amount; break;
        case 'w': z += amount; break;
      }
      
      store.setVertexPosition(obj.id, vertexIndex, [x, y, z]);
    });
  }
  
  setMode(mode) {
    const oldMode = this.mode;
    this.mode = mode;
    const modeClass = mode === 'normal' ? 'normal' : mode === 'insert' ? 'insert' : mode === 'vertex' ? 'vertex' : mode === 'edge' ? 'edge' : 'face';
    this.statusEl.innerHTML = `<span class="vim-mode ${modeClass}">${mode}</span>`;
    
    // If entering vertex, edge, or face mode, refresh scene to show edit elements
    if ((mode === 'vertex' || mode === 'edge' || mode === 'face') && oldMode !== mode) {
      this.syncFromStore();
    }
  }
  
  createObject(type) {
    const geom = createGeometry(type);
    store.addObject(type, { geometry: geom });
    console.log(`Created ${type}`);
  }
  
  importTexture(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const textureId = store.addTexture(file.name, e.target.result);
      const selected = store.getSelectedObjects();
      if (selected.length > 0) {
        const obj = selected[0];
        // If in face mode with a selected face, apply to that face
        if (this.mode === 'face') {
          const editingFaceIds = store.getState().editingFaceIds;
          if (editingFaceIds.length > 0) {
            const faceKey = editingFaceIds[0];
            const [, faceIndexStr] = faceKey.split(':');
            const faceIndex = parseInt(faceIndexStr);
            store.setFaceTexture(obj.id, faceIndex, textureId);
          } else {
            store.setObjectTexture(obj.id, textureId);
          }
        } else {
          store.setObjectTexture(obj.id, textureId);
        }
      }
      this.updateProperties();
    };
    reader.readAsDataURL(file);
  }
  
  deleteSelected() {
    const selected = store.getSelectedIds();
    selected.forEach(id => {
      store.removeObject(id);
    });
  }
  
  updateSceneList() {
    const objects = store.getObjects();
    
    if (objects.length === 0) {
      this.sceneList.innerHTML = '<div class="empty-state">No objects</div>';
      return;
    }
    
    this.sceneList.innerHTML = '';
    const selectedIds = store.getSelectedIds();
    
    objects.forEach(obj => {
      if (!obj || !obj.id) return; // Skip undefined/null objects
      
      const item = document.createElement('div');
      item.className = `scene-item${selectedIds.includes(obj.id) ? ' selected' : ''}`;
      item.textContent = obj.name;
      item.addEventListener('click', () => {
        store.selectObject(obj.id);
      });
      this.sceneList.appendChild(item);
    });
  }
  
  updateProperties() {
    const selected = store.getSelectedObjects();
    
    if (selected.length === 0) {
      this.propertiesContent.innerHTML = '<div class="empty-state">Select an object</div>';
      return;
    }
    
    const obj = selected[0];
    if (!obj || !obj.transform) {
      this.propertiesContent.innerHTML = '<div class="empty-state">Select an object</div>';
      return;
    }
    
    const { position, rotation, scale } = obj.transform;
    const textures = store.getTextures();
    const currentTextureId = obj.textureId || '';
    
    this.propertiesContent.innerHTML = `
      <div class="property-group">
        <div class="property-group-title">Object</div>
        <div class="property-row">
          <span class="property-label">Name</span>
          <input type="text" class="property-input" value="${obj.name}" readonly>
        </div>
        <div class="property-row">
          <span class="property-label">Type</span>
          <input type="text" class="property-input" value="${obj.type}" readonly>
        </div>
      </div>
      
      <div class="property-group">
        <div class="property-group-title">Transform</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <input type="number" class="property-input" value="${position[0].toFixed(2)}" step="0.1" data-prop="position" data-index="0">
          <span class="property-label">Y</span>
          <input type="number" class="property-input" value="${position[1].toFixed(2)}" step="0.1" data-prop="position" data-index="1">
          <span class="property-label">Z</span>
          <input type="number" class="property-input" value="${position[2].toFixed(2)}" step="0.1" data-prop="position" data-index="2">
        </div>
      </div>
      
      <div class="property-group">
        <div class="property-group-title">Texture</div>
        <div class="property-row">
          <select class="property-input" id="texture-select">
            <option value="">None</option>
            ${textures.map(t => `<option value="${t.id}" ${t.id === currentTextureId ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="property-row">
          <input type="file" id="texture-import" accept=".png,.jpg,.jpeg,.tga,.bmp,.gif" style="display: none">
          <button class="btn" id="import-texture-btn">Import Texture</button>
        </div>
      </div>
      
      <div class="object-info">
        <div class="info-row">
          <span class="info-label">Vertices</span>
          <span class="info-value">${obj.geometry?.vertexCount || 0}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Faces</span>
          <span class="info-value">${obj.geometry?.faceCount || 0}</span>
        </div>
      </div>
      
      <button class="btn" id="delete-btn">Delete Object</button>
    `;
    
    document.getElementById('delete-btn').addEventListener('click', () => this.deleteSelected());
    
    document.getElementById('import-texture-btn').addEventListener('click', () => {
      document.getElementById('texture-import').click();
    });
    
    document.getElementById('texture-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importTexture(file);
      }
    });
    
    document.getElementById('texture-select').addEventListener('change', (e) => {
      const textureId = e.target.value;
      
      if (this.mode === 'face') {
        const editingFaceIds = store.getState().editingFaceIds;
        if (editingFaceIds.length > 0) {
          const faceKey = editingFaceIds[0];
          const [, faceIndexStr] = faceKey.split(':');
          const faceIndex = parseInt(faceIndexStr);
          store.setFaceTexture(obj.id, faceIndex, textureId || null);
        }
      } else {
        store.setObjectTexture(obj.id, textureId || null);
      }
    });
    
    const inputs = this.propertiesContent.querySelectorAll('input[data-prop]');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const prop = e.target.dataset.prop;
        const index = parseInt(e.target.dataset.index);
        const value = parseFloat(e.target.value);
        
        const newTransform = { ...obj.transform };
        newTransform[prop] = [...newTransform[prop]];
        newTransform[prop][index] = value;
        
        store.setObjectTransform(obj.id, newTransform);
      });
    });
  }
  
  executeCommand(cmd) {
    const parts = cmd.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (command) {
      case 'create':
        if (args[0]) this.createObject(args[0]);
        break;
      case 'delete':
      case 'd':
        this.deleteSelected();
        break;
      case 'export':
        if (args[0] === 'usd') this.exportUSD();
        break;
      case 'grid':
        this.sceneManager.toggleGrid();
        break;
      case 'new':
        this.newScene();
        break;
      default:
        console.log('Unknown command:', command);
    }
  }
  
  exportUSD() {
    console.log('Export USD - not yet implemented');
  }
  
  newScene() {
    this.meshes.forEach((mesh) => {
      this.sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.meshes.clear();
    store.clear();
  }
  
  undo() {
    store.undo();
  }
  
  redo() {
    store.redo();
  }
  
  initMenu() {
    // Handle dropdown menu items
    document.querySelectorAll('.menu-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        switch (action) {
          case 'new':
            this.newScene();
            break;
          case 'export':
            this.exportUSD();
            break;
          case 'quit':
            if (window.electron) window.electron.quit();
            break;
          case 'undo':
            this.undo();
            break;
          case 'redo':
            this.redo();
            break;
          case 'delete':
            this.deleteSelected();
            break;
          case 'reset-camera':
            this.sceneManager.resetCamera();
            break;
          case 'toggle-grid':
            this.sceneManager.toggleGrid();
            break;
          case 'about':
            alert('VOID - Vertex Object Interactive Designer\nVersion 0.1.0');
            break;
        }
      });
    });
    
    // Also handle Electron menu events if available
    if (window.electron) {
      window.electron.onMenuNew(() => this.newScene());
      window.electron.onMenuExport(() => this.exportUSD());
      window.electron.onMenuUndo(() => this.undo());
      window.electron.onMenuRedo(() => this.redo());
      window.electron.onMenuDelete(() => this.deleteSelected());
      window.electron.onMenuResetCamera(() => this.sceneManager.resetCamera());
      window.electron.onMenuToggleGrid(() => this.sceneManager.toggleGrid());
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new VoidApp();
});
