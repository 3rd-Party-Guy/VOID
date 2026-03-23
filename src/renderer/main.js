// VOID - Main Renderer Entry Point

import * as THREE from 'three';
import { createGeometry, GeometryTypes } from './core/geometry.js';
import { store } from './core/store.js';
import { usdImporter, usdExporter } from './core/usd.js';
import { SceneManager } from './three/scene.js';
import { ShortcutsPanel } from './ui/shortcuts-panel.js';

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
    this.shortcutsPanel = null;
    this.uvEditorVisible = false;
    
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
    
    // Set up camera anchor tracking (only updates on pan)
    this.sceneManager.onCameraMove = () => {
      // Calculate anchor: camera position + (forward direction * forward distance)
      const cameraPos = this.sceneManager.getCameraPosition();
      const cameraDir = new THREE.Vector3();
      this.sceneManager.camera.getWorldDirection(cameraDir);
      const forwardDist = store.getCameraForwardDistance();
      
      const anchor = [
        cameraPos[0] + cameraDir.x * forwardDist,
        cameraPos[1] + cameraDir.y * forwardDist,
        cameraPos[2] + cameraDir.z * forwardDist
      ];
      store.setCameraAnchor(anchor);
      this.updateStatusBar();
    };
  }
  
  initUI() {
    this.commandInput = document.getElementById('command-input');
    this.sceneList = document.getElementById('scene-list');
    this.propertiesContent = document.getElementById('properties-content');
    this.statusEl = document.getElementById('status');
    this.updateStatusBar();
    
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
    
    this.shortcutsPanel = new ShortcutsPanel();
    this.shortcutsPanel.update(this.mode, this.getShortcutsContext());
    
    this.updateSceneList();
    this.updateProperties();
  }
  
  initStoreSubscription() {
    store.subscribe(() => {
      this.syncFromStore();
      if (this.shortcutsPanel) {
        this.shortcutsPanel.update(this.mode, this.getShortcutsContext());
      }
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
    
    // Build a map for quick parent lookup
    const objectMap = new Map(objects.map(obj => [obj.id, obj]));
    
    // Get world transform accounting for parent hierarchy
    const getWorldTransform = (obj) => {
      if (!obj.parentId) {
        return { ...obj.transform };
      }
      
      const parent = objectMap.get(obj.parentId);
      if (!parent) {
        return { ...obj.transform };
      }
      
      const parentWorld = getWorldTransform(parent);
      
      // Combine transforms (child relative to parent)
      return {
        position: [
          parentWorld.position[0] + obj.transform.position[0],
          parentWorld.position[1] + obj.transform.position[1],
          parentWorld.position[2] + obj.transform.position[2]
        ],
        rotation: [
          parentWorld.rotation[0] + obj.transform.rotation[0],
          parentWorld.rotation[1] + obj.transform.rotation[1],
          parentWorld.rotation[2] + obj.transform.rotation[2]
        ],
        scale: [
          parentWorld.scale[0] * obj.transform.scale[0],
          parentWorld.scale[1] * obj.transform.scale[1],
          parentWorld.scale[2] * obj.transform.scale[2]
        ]
      };
    };
    
    objects.forEach(obj => {
      if (!obj || !obj.id) return; // Skip undefined/null objects
      if (obj.geometry) {
        const threeGeom = this.createThreeGeometry(obj.geometry);
        
        // Highlight selected objects with accent color
        const isSelected = selectedIds.includes(obj.id);
        
        // Get effective material (with inheritance)
        const effectiveMaterial = store.getEffectiveMaterial(obj.id);
        const material = this.createMaterial(obj, isSelected, effectiveMaterial);
        const mesh = new THREE.Mesh(threeGeom, material);
        
        const worldTransform = getWorldTransform(obj);
        const [px, py, pz] = worldTransform.position;
        const [rx, ry, rz] = worldTransform.rotation;
        const [sx, sy, sz] = worldTransform.scale;
        
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
    
    // Update UV editor if visible
    const uvEditor = document.getElementById('uv-editor');
    if (uvEditor && uvEditor.classList.contains('visible')) {
      this.initUVEditor();
    }
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
    
    obj.faceTextures.forEach((faceData, faceIndex) => {
      if (!faceData || !faceData.textureId) return;
      
      const texture = this.getTexture(faceData.textureId, true);
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
      
      // Apply texture transform
      if (faceData.transform) {
        const tt = faceData.transform;
        texture.repeat.set(tt.repeatX || 1, tt.repeatY || 1);
        texture.offset.set(tt.offsetX || 0, tt.offsetY || 0);
        if (tt.rotation) {
          texture.rotation = tt.rotation * (Math.PI / 180);
        }
      }
      
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
  
  createMaterial(obj, isSelected, effectiveMaterial = null) {
    // Use effective material if provided (for hierarchy inheritance)
    const mat = effectiveMaterial || obj.material || {};
    
    let map = null;
    if (obj.textureId) {
      map = this.getTexture(obj.textureId);
    }
    
    // Determine base color and emissive
    let baseColor = 0xffffff;
    let emissive = 0x000000;
    let emissiveIntensity = 0;
    
    // If no texture, use material color or mode colors
    if (!map) {
      if (mat.diffuseColor) {
        baseColor = new THREE.Color(mat.diffuseColor[0], mat.diffuseColor[1], mat.diffuseColor[2]).getHex();
      } else {
        baseColor = isSelected ? 0x3fb950 : 0x58a6ff;
      }
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
    
    // Apply texture transform if present
    if (map && obj.textureTransform) {
      const tt = obj.textureTransform;
      map.repeat.set(tt.repeatX || 1, tt.repeatY || 1);
      map.offset.set(tt.offsetX || 0, tt.offsetY || 0);
      if (tt.rotation) {
        map.rotation = tt.rotation * (Math.PI / 180);
      }
    }
    
    return material;
  }
  
  getTexture(textureId, clone = false) {
    const cacheKey = clone ? `${textureId}_clone_${Date.now()}` : textureId;
    
    if (!clone && this.textureCache.has(textureId)) {
      return this.textureCache.get(textureId);
    }
    
    if (clone && this.textureCloneCache && this.textureCloneCache.has(textureId)) {
      return this.textureCloneCache.get(textureId).clone();
    }
    
    const texture = store.getTexture(textureId);
    if (!texture) return null;
    
    const loader = new THREE.TextureLoader();
    const tex = loader.load(texture.dataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    
    if (!clone) {
      this.textureCache.set(textureId, tex);
    } else {
      if (!this.textureCloneCache) this.textureCloneCache = new Map();
      this.textureCloneCache.set(textureId, tex);
    }
    
    return clone ? tex.clone() : tex;
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
      
      // Handle UV editor keys if visible
      const uvEditor = document.getElementById('uv-editor');
      if (uvEditor && uvEditor.classList.contains('visible')) {
        this.handleUVMode(e);
        return;
      }
      
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
      case 'H': this.sceneManager.panCamera(0, 0, -0.5); break;
      case 'J': this.sceneManager.panCamera(0, 0, 0.5); break;
      case 'w': this.sceneManager.zoomCamera(1.1); break;
      case 's': this.sceneManager.zoomCamera(0.9); break;
      case 'q': this.sceneManager.orbitCamera(0.1, 0); break;
      case 'e': this.sceneManager.orbitCamera(-0.1, 0); break;
      case 'Q': this.sceneManager.orbitCamera(0, -0.1); break;
      case 'E': this.sceneManager.orbitCamera(0, 0.1); break;
      case 'i': this.setMode('insert'); break;
      case 'g': this.setMode('vertex'); break;
      case 'z': this.setMode('edge'); break;
      case 'f': this.setMode('face'); break;
      case 'd': this.deleteSelected(); break;
      case 'u': (e.ctrlKey) ? this.toggleUVEditor() : this.undo(); break;
      case 'U': this.redo(); break;
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
  
  handleUVMode(e) {
    if (e.key === 'Escape') {
      this.toggleUVEditor();
      return;
    }
    
    const editingUvIds = store.getState().editingUvIds;
    if (editingUvIds.length === 0) return;
    
    const selected = store.getSelectedObjects();
    if (selected.length === 0) return;
    
    const obj = selected[0];
    
    let amount = e.shiftKey ? 0.01 : 0.05;
    if (e.altKey) amount = 0.001;
    
    editingUvIds.forEach(key => {
      const [objectId, uvIndexStr] = key.split(':');
      const uvIndex = parseInt(uvIndexStr);
      
      if (objectId !== obj.id) return;
      
      const currentObj = store.getObject(objectId);
      if (!currentObj || !currentObj.geometry || !currentObj.geometry.uvs) return;
      
      const uvs = currentObj.geometry.uvs;
      let u = uvs[uvIndex * 2];
      let v = uvs[uvIndex * 2 + 1];
      
      switch (e.key) {
        case 'h': u -= amount; break;
        case 'l': u += amount; break;
        case 'j': v -= amount; break;
        case 'k': v += amount;
      }
      
      if (u < 0) u = 0;
      if (u > 1) u = 1;
      if (v < 0) v = 0;
      if (v > 1) v = 1;
      
      store.setUvPosition(objectId, uvIndex, u, v);
    });
  }
  
  setMode(mode) {
    const oldMode = this.mode;
    this.mode = mode;
    const modeClass = mode === 'normal' ? 'normal' : mode === 'insert' ? 'insert' : mode === 'vertex' ? 'vertex' : mode === 'edge' ? 'edge' : 'face';
    const anchor = store.getCameraAnchor();
    this.statusEl.innerHTML = `
      <span class="vim-mode ${modeClass}">${mode}</span>
      <span class="anchor">Anchor: (${anchor[0].toFixed(1)}, ${anchor[1].toFixed(1)}, ${anchor[2].toFixed(1)})</span>
    `;
    
    // If entering vertex, edge, or face mode, refresh scene to show edit elements
    if ((mode === 'vertex' || mode === 'edge' || mode === 'face') && oldMode !== mode) {
      this.syncFromStore();
    }
    
    this.shortcutsPanel.update(mode, this.getShortcutsContext());
  }
  
  getShortcutsContext() {
    const state = store.getState();
    const hasFaceSelected = state.editingFaceIds.length > 0;
    const hasUvSelected = state.editingUvIds.length > 0;
    return { hasFaceSelected, hasUvSelected, uvEditorVisible: this.uvEditorVisible };
  }
  
  updateStatusBar() {
    const anchor = store.getCameraAnchor();
    const modeClass = this.mode === 'normal' ? 'normal' : this.mode === 'insert' ? 'insert' : this.mode === 'vertex' ? 'vertex' : this.mode === 'edge' ? 'edge' : 'face';
    this.statusEl.innerHTML = `
      <span class="vim-mode ${modeClass}">${this.mode}</span>
      <span class="anchor">Anchor: (${anchor[0].toFixed(1)}, ${anchor[1].toFixed(1)}, ${anchor[2].toFixed(1)})</span>
    `;
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
    
    // Build hierarchy tree
    const getChildren = (parentId) => {
      return objects.filter(obj => obj.parentId === parentId);
    };
    
    const renderItem = (obj, depth = 0) => {
      if (!obj || !obj.id) return;
      
      const item = document.createElement('div');
      item.className = `scene-item${selectedIds.includes(obj.id) ? ' selected' : ''}`;
      item.style.paddingLeft = `${depth * 16 + 8}px`;
      
      // Add expand/collapse indicator if has children
      const children = getChildren(obj.id);
      const hasChildren = children.length > 0;
      const prefix = hasChildren ? (depth > 0 ? '├─ ' : '┬─ ') : (depth > 0 ? '└─ ' : '');
      item.textContent = prefix + obj.name;
      
      item.addEventListener('click', () => {
        store.selectObject(obj.id);
        
        // Jump camera to look at the selected object
        const newAnchor = store.getCameraAnchor();
        this.sceneManager.jumpCameraToAnchor(newAnchor);
        
        // Update status bar
        this.updateStatusBar();
      });
      
      this.sceneList.appendChild(item);
      
      // Render children
      children.forEach(child => renderItem(child, depth + 1));
    };
    
    // Render root objects first
    const rootObjects = objects.filter(obj => !obj.parentId);
    rootObjects.forEach(obj => renderItem(obj, 0));
    
    // Also render any orphaned objects (objects whose parent doesn't exist)
    const allParentIds = new Set(objects.map(o => o.parentId).filter(Boolean));
    objects.forEach(obj => {
      if (obj.parentId && !allParentIds.has(obj.id) === false && !objects.find(o => o.id === obj.parentId)) {
        renderItem(obj, 0);
      }
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
    const editingFaceIds = store.getState().editingFaceIds;
    const isFaceMode = this.mode === 'face' && editingFaceIds.length > 0;
    
    let currentTextureId = '';
    let tt = { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0, rotation: 0 };
    let textureTitle = 'Texture';
    let selectedFaceCount = 0;
    
    if (isFaceMode) {
      selectedFaceCount = editingFaceIds.length;
      const faceTextureIds = new Set();
      const faceTransforms = [];
      
      editingFaceIds.forEach(faceKey => {
        const [, faceIndexStr] = faceKey.split(':');
        const faceIndex = parseInt(faceIndexStr);
        const faceData = obj.faceTextures?.get(faceIndex);
        if (faceData?.textureId) {
          faceTextureIds.add(faceData.textureId);
          if (faceData.transform) {
            faceTransforms.push(faceData.transform);
          }
        }
      });
      
      const allSameTexture = faceTextureIds.size === 1 && faceTextureIds.size === selectedFaceCount;
      
      if (faceTransforms.length === 0) {
        currentTextureId = faceTextureIds.size > 0 ? Array.from(faceTextureIds)[0] : '';
        tt = { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0, rotation: 0 };
      } else if (allSameTexture) {
        currentTextureId = Array.from(faceTextureIds)[0];
        const first = faceTransforms[0];
        const allSame = faceTransforms.every(t => 
          t.repeatX === first.repeatX && 
          t.repeatY === first.repeatY && 
          t.offsetX === first.offsetX && 
          t.offsetY === first.offsetY && 
          t.rotation === first.rotation
        );
        tt = allSame ? first : { repeatX: '---', repeatY: '---', offsetX: '---', offsetY: '---', rotation: '---' };
      } else {
        currentTextureId = faceTextureIds.size > 1 ? '---' : (faceTextureIds.size === 1 ? Array.from(faceTextureIds)[0] : '');
        const getCommonValue = (prop) => {
          const values = faceTransforms.map(t => t[prop]);
          const first = values[0];
          return values.every(v => v === first) ? first : '---';
        };
        tt = {
          repeatX: getCommonValue('repeatX'),
          repeatY: getCommonValue('repeatY'),
          offsetX: getCommonValue('offsetX'),
          offsetY: getCommonValue('offsetY'),
          rotation: getCommonValue('rotation')
        };
      }
      textureTitle = `Face Texture (${selectedFaceCount} selected)`;
    } else if (this.mode !== 'face') {
      currentTextureId = obj.textureId || '';
      tt = obj.textureTransform || tt;
    } else {
      currentTextureId = '';
      textureTitle = 'Face Texture (no faces selected)';
    }
    
    const formatValue = (v) => v === '---' ? '---' : (typeof v === 'number' ? v.toString() : '1');
    
    const objects = store.getObjects();
    const parentOptions = objects
      .filter(o => o.id !== obj.id && !store.getObjectDescendants(obj.id).includes(o.id))
      .map(o => `<option value="${o.id}" ${o.id === obj.parentId ? 'selected' : ''}>${o.name}</option>`)
      .join('');
    const parentName = obj.parentId ? (store.getObject(obj.parentId)?.name || 'None') : 'None';
    
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
        <div class="property-row">
          <span class="property-label">Parent</span>
          <select class="property-input" id="parent-select">
            <option value="">None</option>
            ${parentOptions}
          </select>
        </div>
        ${obj.parentId ? `
        <div class="property-row">
          <button class="btn" id="unparent-btn">Unparent</button>
        </div>
        ` : ''}
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
        <div class="property-group-title">${textureTitle}</div>
        <div class="property-row">
          <select class="property-input" id="texture-select">
            <option value="">None</option>
            ${textures.map(t => `<option value="${t.id}" ${t.id === currentTextureId ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="property-row">
          <input type="file" id="texture-import" accept=".png,.jpg,.jpeg,.tga,.bmp,.gif" style="display: none">
          <button class="btn" id="import-texture-btn">Import</button>
        </div>
        ${(currentTextureId && currentTextureId !== '---') || (currentTextureId === '---') || isFaceMode ? `
        <div class="property-group-title" style="margin-top: 8px;">Texture Transform${currentTextureId === '---' ? ' (mixed values)' : ''}</div>
        <div class="property-row">
          <span class="property-label">Repeat X</span>
          <input type="number" class="property-input" id="texture-repeat-x" value="${formatValue(tt.repeatX)}" step="0.1" min="0.1">
        </div>
        <div class="property-row">
          <span class="property-label">Repeat Y</span>
          <input type="number" class="property-input" id="texture-repeat-y" value="${formatValue(tt.repeatY)}" step="0.1" min="0.1">
        </div>
        <div class="property-row">
          <span class="property-label">Offset X</span>
          <input type="number" class="property-input" id="texture-offset-x" value="${formatValue(tt.offsetX)}" step="0.1">
        </div>
        <div class="property-row">
          <span class="property-label">Offset Y</span>
          <input type="number" class="property-input" id="texture-offset-y" value="${formatValue(tt.offsetY)}" step="0.1">
        </div>
        <div class="property-row">
          <span class="property-label">Rotation°</span>
          <input type="number" class="property-input" id="texture-rotation" value="${formatValue(tt.rotation)}" step="15">
        </div>
        ` : ''}
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
    
    const parentSelect = document.getElementById('parent-select');
    if (parentSelect) {
      parentSelect.addEventListener('change', (e) => {
        store.setObjectParent(obj.id, e.target.value || null);
      });
    }
    
    const unparentBtn = document.getElementById('unparent-btn');
    if (unparentBtn) {
      unparentBtn.addEventListener('click', () => {
        store.setObjectParent(obj.id, null);
      });
    }
    
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
      
      if (isFaceMode) {
        editingFaceIds.forEach(faceKey => {
          const [, faceIndexStr] = faceKey.split(':');
          const faceIndex = parseInt(faceIndexStr);
          store.setFaceTexture(obj.id, faceIndex, textureId || null);
        });
      } else {
        store.setObjectTexture(obj.id, textureId || null);
      }
    });
    
    // Texture transform listeners
    const repeatXInput = document.getElementById('texture-repeat-x');
    const repeatYInput = document.getElementById('texture-repeat-y');
    const offsetXInput = document.getElementById('texture-offset-x');
    const offsetYInput = document.getElementById('texture-offset-y');
    const rotationInput = document.getElementById('texture-rotation');
    
    const updateTextureTransform = () => {
      if (!repeatXInput) return;
      
      const val = repeatXInput.value;
      
      if (isFaceMode) {
        const parseVal = (v) => {
          if (v === '---' || v === '') return null;
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        };
        
        const newRepeatX = parseVal(repeatXInput.value);
        const newRepeatY = parseVal(repeatYInput.value);
        const newOffsetX = parseVal(offsetXInput.value);
        const newOffsetY = parseVal(offsetYInput.value);
        const newRotation = parseVal(rotationInput.value);
        
        if (newRepeatX === null && newRepeatY === null && newOffsetX === null && newOffsetY === null && newRotation === null) return;
        
        editingFaceIds.forEach(faceKey => {
          const [, faceIndexStr] = faceKey.split(':');
          const faceIndex = parseInt(faceIndexStr);
          const existingData = obj.faceTextures?.get(faceIndex);
          const existingTransform = existingData?.transform || { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0, rotation: 0 };
          
          const transform = {
            repeatX: newRepeatX ?? existingTransform.repeatX,
            repeatY: newRepeatY ?? existingTransform.repeatY,
            offsetX: newOffsetX ?? existingTransform.offsetX,
            offsetY: newOffsetY ?? existingTransform.offsetY,
            rotation: newRotation ?? existingTransform.rotation
          };
          store.setFaceTextureTransform(obj.id, faceIndex, transform);
        });
      } else {
        store.setObjectTextureTransform(obj.id, {
          repeatX: parseFloat(repeatXInput.value) || 1,
          repeatY: parseFloat(repeatYInput.value) || 1,
          offsetX: parseFloat(offsetXInput.value) || 0,
          offsetY: parseFloat(offsetYInput.value) || 0,
          rotation: parseFloat(rotationInput.value) || 0
        });
      }
    };
    
    if (repeatXInput) {
      repeatXInput.addEventListener('change', updateTextureTransform);
      repeatYInput.addEventListener('change', updateTextureTransform);
      offsetXInput.addEventListener('change', updateTextureTransform);
      offsetYInput.addEventListener('change', updateTextureTransform);
      rotationInput.addEventListener('change', updateTextureTransform);
    }
    
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
    const objects = store.getObjects();
    if (objects.length === 0) {
      alert('No objects to export');
      return;
    }
    
    const content = usdExporter.exportScene(objects);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.usda';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async importUSD() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.usd,.usda,.usdc,.usdz';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const result = await usdImporter.importFile(file);
        
        if (result.errors && result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
        
        result.objects.forEach(obj => {
          store.addObject(obj.type || 'custom', {
            geometry: obj.geometry,
            material: obj.material,
            position: obj.transform?.position,
            rotation: obj.transform?.rotation,
            scale: obj.transform?.scale,
            parentId: obj.parentId
          });
        });
        
        console.log(`Imported ${result.objects.length} objects`);
      } catch (error) {
        console.error('Failed to import USD:', error);
        alert(`Failed to import USD: ${error.message}`);
      }
    });
    
    input.click();
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
          case 'import':
            this.importUSD();
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
          case 'skybox-equirectangular':
            this.importSkybox('equirectangular');
            break;
          case 'skybox-cube':
            this.importSkybox('cube');
            break;
          case 'skybox-hdr':
            this.importSkybox('hdr');
            break;
          case 'skybox-clear':
            this.sceneManager.clearSkybox();
            store.clearSkybox();
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
  
  importSkybox(type) {
    const acceptTypes = {
      equirectangular: '.hdr,.jpg,.jpeg,.png,.tga',
      cube: '.jpg,.jpeg,.png,.tga',
      hdr: '.hdr'
    };
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptTypes[type];
    input.multiple = type === 'cube';
    
    input.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      if (type === 'cube') {
        // Need 6 images for cube map
        if (files.length !== 6) {
          alert('Cube skybox requires exactly 6 images (px, nx, py, ny, pz, nz)');
          return;
        }
        const paths = Array.from(files).map(f => URL.createObjectURL(f));
        store.setSkybox('cube', paths);
        await this.sceneManager.setSkybox('cube', paths);
      } else {
        const file = files[0];
        const path = URL.createObjectURL(file);
        store.setSkybox(type, path);
        await this.sceneManager.setSkybox(type, path);
      }
    });
    
    input.click();
  }
  
  toggleUVEditor() {
    const uvEditor = document.getElementById('uv-editor');
    if (uvEditor.classList.contains('visible')) {
      uvEditor.classList.remove('visible');
      this.uvEditorVisible = false;
    } else {
      uvEditor.classList.add('visible');
      this.uvEditorVisible = true;
      this.initUVEditor();
    }
    this.shortcutsPanel.update(this.mode, this.getShortcutsContext());
  }
  
  initUVEditor() {
    const canvas = document.getElementById('uv-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 280;
    canvas.height = 200;
    
    const selected = store.getSelectedObjects();
    if (selected.length === 0) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select an object', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const obj = selected[0];
    if (!obj.geometry || !obj.geometry.uvs) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No UV data', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    this.renderUVEditor(ctx, canvas.width, canvas.height, obj);
    
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const uvs = obj.geometry.uvs;
      const uScale = canvas.width;
      const vScale = canvas.height;
      
      let closestIdx = -1;
      let closestDist = 10;
      
      for (let i = 0; i < uvs.length; i += 2) {
        const uvX = uvs[i] * uScale;
        const uvY = (1 - uvs[i + 1]) * vScale;
        const dist = Math.sqrt((x - uvX) ** 2 + (y - uvY) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i / 2;
        }
      }
      
      if (closestIdx >= 0) {
        if (e.shiftKey) {
          store.toggleUvSelection(obj.id, closestIdx);
        } else {
          store.selectUv(obj.id, closestIdx);
        }
      }
    };
  }
  
  renderUVEditor(ctx, width, height, obj) {
    const uvs = obj.geometry.uvs;
    const faces = obj.geometry.faces;
    const editingUvIds = store.getState().editingUvIds;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i];
      const b = faces[i + 1];
      const c = faces[i + 2];
      
      const au = uvs[a * 2] * width;
      const av = (1 - uvs[a * 2 + 1]) * height;
      const bu = uvs[b * 2] * width;
      const bv = (1 - uvs[b * 2 + 1]) * height;
      const cu = uvs[c * 2] * width;
      const cv = (1 - uvs[c * 2 + 1]) * height;
      
      ctx.beginPath();
      ctx.moveTo(au, av);
      ctx.lineTo(bu, bv);
      ctx.lineTo(cu, cv);
      ctx.closePath();
      ctx.stroke();
    }
    
    for (let i = 0; i < uvs.length; i += 2) {
      const uvIndex = i / 2;
      const x = uvs[i] * width;
      const y = (1 - uvs[i + 1]) * height;
      const isSelected = editingUvIds.includes(`${obj.id}:${uvIndex}`);
      
      ctx.fillStyle = isSelected ? '#f0c644' : '#58a6ff';
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new VoidApp();
});
