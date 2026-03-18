// Store - State management with undo/redo

export class Store {
  constructor() {
    this.objects = new Map();
    this.selectedIds = new Set();
    this.editingVertexIds = new Set();
    this.editingEdgeIds = new Set();
    this.editingFaceIds = new Set();
    this.editingUvIds = new Set();
    this.textures = new Map(); // textureId -> { name, dataUrl }
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
    this.cameraAnchor = [0, 0, 0]; // Spawn position for new objects
    this.cameraForwardDistance = 8.66; // Initial distance from camera to anchor (camera at (5,5,5), anchor at (0,0,0))
    this.skybox = null; // { type, paths, loaded }
    this.counters = {
      cube: 0,
      sphere: 0,
      cylinder: 0,
      cone: 0,
      pyramid: 0,
      plane: 0,
      torus: 0,
      triangle: 0
    };
  }
  
  // Event subscription
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  notify() {
    this.listeners.forEach(fn => fn(this.getState()));
  }
  
  // State access
  getState() {
    return {
      objects: Array.from(this.objects.values()),
      selectedIds: Array.from(this.selectedIds),
      editingVertexIds: Array.from(this.editingVertexIds),
      editingEdgeIds: Array.from(this.editingEdgeIds),
      editingFaceIds: Array.from(this.editingFaceIds),
      editingUvIds: Array.from(this.editingUvIds),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0
    };
  }
  
  getObjects() {
    return Array.from(this.objects.values());
  }
  
  getObject(id) {
    return this.objects.get(id);
  }
  
  getSelectedIds() {
    return Array.from(this.selectedIds);
  }
  
  getSelectedObjects() {
    return Array.from(this.selectedIds).map(id => this.objects.get(id)).filter(Boolean);
  }
  
  // Camera Anchor
  getCameraAnchor() {
    return [...this.cameraAnchor];
  }
  
  getCameraForwardDistance() {
    return this.cameraForwardDistance;
  }
  
  setCameraAnchor(position) {
    this.cameraAnchor = [...position];
    this.notify();
  }
  
  // Skybox
  getSkybox() {
    return this.skybox;
  }
  
  setSkybox(type, paths) {
    this.skybox = { type, paths, loaded: false };
    this.notify();
  }
  
  clearSkybox() {
    this.skybox = null;
    this.notify();
  }
  
  // History management
  _pushUndo(action) {
    this.undoStack.push(action);
    this.redoStack = [];
    
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }
  
  // Object management
  addObject(type, params = {}) {
    const id = crypto.randomUUID();
    this.counters[type]++;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)}_${String(this.counters[type]).padStart(3, '0')}`;
    
    const obj = {
      id,
      name,
      type,
      parentId: params.parentId || null,
      transform: {
        position: params.position || [...this.cameraAnchor],
        rotation: params.rotation || [0, 0, 0],
        scale: params.scale || [1, 1, 1]
      },
      geometry: params.geometry || null,
      material: params.material || {
        name: `Material_${name}`,
        diffuseTexture: null,
        diffuseColor: [0.8, 0.8, 0.8],
        opacity: 1.0
      }
    };
    
    this._pushUndo({
      type: 'ADD_OBJECT',
      objectId: id,
      objectData: { ...obj }
    });
    
    this.objects.set(id, obj);
    this.notify();
    
    return obj;
  }
  
  removeObject(id) {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    this._pushUndo({
      type: 'REMOVE_OBJECT',
      objectId: id,
      objectData: { ...obj }
    });
    
    this.objects.delete(id);
    this.selectedIds.delete(id);
    this.notify();
  }
  
  updateObject(id, updates) {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    const oldData = { ...obj };
    Object.assign(obj, updates);
    
    this._pushUndo({
      type: 'UPDATE_OBJECT',
      objectId: id,
      oldData,
      newData: { ...obj }
    });
    
    this.notify();
  }
  
  // Hierarchy management
  setObjectParent(objectId, parentId) {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    
    // Prevent circular references
    if (parentId && this._isDescendant(parentId, objectId)) {
      console.warn('Cannot set parent: would create circular reference');
      return;
    }
    
    // Prevent self-parenting
    if (parentId === objectId) {
      console.warn('Cannot set object as its own parent');
      return;
    }
    
    const oldParentId = obj.parentId;
    obj.parentId = parentId || null;
    
    this._pushUndo({
      type: 'SET_PARENT',
      objectId,
      oldParentId,
      newParentId: parentId || null
    });
    
    this.notify();
  }
  
  _isDescendant(potentialDescendantId, ancestorId) {
    let current = this.objects.get(potentialDescendantId);
    while (current) {
      if (current.parentId === ancestorId) {
        return true;
      }
      current = current.parentId ? this.objects.get(current.parentId) : null;
    }
    return false;
  }
  
  getObjectParent(objectId) {
    const obj = this.objects.get(objectId);
    return obj ? obj.parentId : null;
  }
  
  getObjectChildren(objectId) {
    const children = [];
    this.objects.forEach(obj => {
      if (obj.parentId === objectId) {
        children.push(obj.id);
      }
    });
    return children;
  }
  
  getObjectDescendants(objectId) {
    const descendants = [];
    const collectDescendants = (id) => {
      const children = this.getObjectChildren(id);
      children.forEach(childId => {
        descendants.push(childId);
        collectDescendants(childId);
      });
    };
    collectDescendants(objectId);
    return descendants;
  }
  
  getRootObjects() {
    const rootObjects = [];
    this.objects.forEach(obj => {
      if (!obj.parentId) {
        rootObjects.push(obj.id);
      }
    });
    return rootObjects;
  }
  
  flattenObjects() {
    return Array.from(this.objects.values());
  }
  
  setObjectTransform(id, transform) {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    this._pushUndo({
      type: 'SET_TRANSFORM',
      objectId: id,
      oldTransform: { ...obj.transform },
      newTransform: { ...transform }
    });
    
    obj.transform = { ...transform };
    this.notify();
  }
  
  setVertexPosition(objectId, vertexIndex, position) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const oldVertices = new Float32Array(obj.geometry.vertices);
    
    obj.geometry.vertices[vertexIndex * 3] = position[0];
    obj.geometry.vertices[vertexIndex * 3 + 1] = position[1];
    obj.geometry.vertices[vertexIndex * 3 + 2] = position[2];
    
    this._pushUndo({
      type: 'SET_VERTEX_POSITION',
      objectId,
      vertexIndex,
      oldPosition: [oldVertices[vertexIndex * 3], oldVertices[vertexIndex * 3 + 1], oldVertices[vertexIndex * 3 + 2]],
      newPosition: position
    });
    
    this.notify();
  }
  
  setMaterial(id, material) {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    this._pushUndo({
      type: 'SET_MATERIAL',
      objectId: id,
      oldMaterial: { ...obj.material },
      newMaterial: { ...material }
    });
    
    obj.material = { ...material };
    this.notify();
  }
  
  getEffectiveMaterial(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj) return null;
    
    // If object has its own texture, return it
    if (obj.material && obj.material.diffuseTexture) {
      return obj.material;
    }
    
    // Otherwise, inherit from parent
    if (obj.parentId) {
      return this.getEffectiveMaterial(obj.parentId);
    }
    
    // Return own material (either default or user-set without texture)
    return obj.material || {
      name: 'Default',
      diffuseTexture: null,
      diffuseColor: [0.8, 0.8, 0.8],
      opacity: 1.0
    };
  }
  
  // Selection
  selectObject(id) {
    this.selectedIds.clear();
    if (id) {
      this.selectedIds.add(id);
      // Update camera anchor to object center (offset remains unchanged)
      const obj = this.objects.get(id);
      if (obj && obj.geometry) {
        const center = this._calculateObjectCenter(obj);
        this.cameraAnchor = center;
      }
    }
    this.notify();
  }
  
  _calculateObjectCenter(obj) {
    if (!obj.geometry || !obj.geometry.vertices) {
      return [...this.cameraAnchor];
    }
    
    const vertices = obj.geometry.vertices;
    let cx = 0, cy = 0, cz = 0;
    const count = vertices.length / 3;
    
    for (let i = 0; i < vertices.length; i += 3) {
      cx += vertices[i];
      cy += vertices[i + 1];
      cz += vertices[i + 2];
    }
    
    if (count > 0) {
      return [
        cx / count + obj.transform.position[0],
        cy / count + obj.transform.position[1],
        cz / count + obj.transform.position[2]
      ];
    }
    
    return [...this.cameraAnchor];
  }
  
  selectVertex(objectId, vertexIndex) {
    this.editingVertexIds.clear();
    this.editingVertexIds.add(`${objectId}:${vertexIndex}`);
    this.notify();
  }
  
  toggleVertexSelection(objectId, vertexIndex) {
    const key = `${objectId}:${vertexIndex}`;
    if (this.editingVertexIds.has(key)) {
      this.editingVertexIds.delete(key);
    } else {
      this.editingVertexIds.add(key);
    }
    this.notify();
  }
  
  selectAllVertices(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const count = obj.geometry.vertexCount;
    for (let i = 0; i < count; i++) {
      this.editingVertexIds.add(`${objectId}:${i}`);
    }
    this.notify();
  }
  
  selectEdge(objectId, edgeIndex) {
    this.editingEdgeIds.clear();
    this.editingEdgeIds.add(`${objectId}:${edgeIndex}`);
    this.notify();
  }
  
  toggleEdgeSelection(objectId, edgeIndex) {
    const key = `${objectId}:${edgeIndex}`;
    if (this.editingEdgeIds.has(key)) {
      this.editingEdgeIds.delete(key);
    } else {
      this.editingEdgeIds.add(key);
    }
    this.notify();
  }
  
  selectAllEdges(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const count = obj.geometry.edgeCount || 0;
    for (let i = 0; i < count; i++) {
      this.editingEdgeIds.add(`${objectId}:${i}`);
    }
    this.notify();
  }
  
  selectEdgeLoop(objectId, clickedEdgeIndex) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const faces = obj.geometry.faces;
    const edgeMap = new Map();
    const edgeToFace = new Map();
    
    let edgeIdx = 0;
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
        const key = `${v1}:${v2}`;
        if (!edgeMap.has(key)) {
          edgeMap.set(key, edgeIdx);
          edgeToFace.set(edgeIdx, Math.floor(i / 3));
          edgeIdx++;
        }
      });
    }
    
    const faceIdx = edgeToFace.get(clickedEdgeIndex);
    if (faceIdx === undefined) return;
    
    edgeToFace.forEach((fIdx, eIdx) => {
      if (fIdx === faceIdx) {
        this.editingEdgeIds.add(`${objectId}:${eIdx}`);
      }
    });
    
    this.notify();
  }
  
  selectFace(objectId, faceIndex) {
    this.editingFaceIds.clear();
    this.editingFaceIds.add(`${objectId}:${faceIndex}`);
    this.notify();
  }
  
  toggleFaceSelection(objectId, faceIndex) {
    const key = `${objectId}:${faceIndex}`;
    if (this.editingFaceIds.has(key)) {
      this.editingFaceIds.delete(key);
    } else {
      this.editingFaceIds.add(key);
    }
    this.notify();
  }
  
  selectAllFaces(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const count = obj.geometry.faceCount || 0;
    for (let i = 0; i < count; i++) {
      this.editingFaceIds.add(`${objectId}:${i}`);
    }
    this.notify();
  }
  
  selectUv(objectId, uvIndex) {
    this.editingUvIds.clear();
    this.editingUvIds.add(`${objectId}:${uvIndex}`);
    this.notify();
  }
  
  toggleUvSelection(objectId, uvIndex) {
    const key = `${objectId}:${uvIndex}`;
    if (this.editingUvIds.has(key)) {
      this.editingUvIds.delete(key);
    } else {
      this.editingUvIds.add(key);
    }
    this.notify();
  }
  
  selectAllUvs(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry) return;
    
    const count = obj.geometry.vertexCount || 0;
    for (let i = 0; i < count; i++) {
      this.editingUvIds.add(`${objectId}:${i}`);
    }
    this.notify();
  }
  
  setUvPosition(objectId, uvIndex, u, v) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.geometry || !obj.geometry.uvs) return;
    
    const oldU = obj.geometry.uvs[uvIndex * 2];
    const oldV = obj.geometry.uvs[uvIndex * 2 + 1];
    
    this._pushUndo({
      type: 'SET_UV_POSITION',
      objectId,
      uvIndex,
      oldU,
      oldV,
      newU: u,
      newV: v
    });
    
    obj.geometry.uvs[uvIndex * 2] = u;
    obj.geometry.uvs[uvIndex * 2 + 1] = v;
    this.notify();
  }
  
  addTexture(name, dataUrl) {
    const id = `tex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.textures.set(id, { id, name, dataUrl });
    this.notify();
    return id;
  }
  
  getTextures() {
    return Array.from(this.textures.values());
  }
  
  getTexture(textureId) {
    return this.textures.get(textureId);
  }
  
  setObjectTexture(objectId, textureId) {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    
    this._pushUndo({
      type: 'SET_OBJECT_TEXTURE',
      objectId,
      oldTextureId: obj.textureId,
      oldFaceTextures: obj.faceTextures ? new Map(obj.faceTextures) : new Map(),
      newTextureId: textureId
    });
    
    obj.textureId = textureId;
    if (obj.faceTextures) {
      obj.faceTextures.clear();
    }
    this.notify();
  }
  
  setFaceTexture(objectId, faceIndex, textureId) {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    
    if (!obj.faceTextures) {
      obj.faceTextures = new Map();
    }
    
    this._pushUndo({
      type: 'SET_FACE_TEXTURE',
      objectId,
      faceIndex,
      oldTextureId: obj.faceTextures.get(faceIndex) || null,
      newTextureId: textureId
    });
    
    if (textureId) {
      obj.faceTextures.set(faceIndex, { textureId });
    } else {
      obj.faceTextures.delete(faceIndex);
    }
    this.notify();
  }
  
  setObjectTextureTransform(objectId, transform) {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    
    const oldTransform = obj.textureTransform || { scaleX: 1, scaleY: 1, rotation: 0, repeatX: 1, repeatY: 1 };
    
    this._pushUndo({
      type: 'SET_OBJECT_TEXTURE_TRANSFORM',
      objectId,
      oldTransform: { ...oldTransform },
      newTransform: { ...transform }
    });
    
    obj.textureTransform = { ...transform };
    this.notify();
  }
  
  setFaceTextureTransform(objectId, faceIndex, transform) {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.faceTextures) return;
    
    const faceData = obj.faceTextures.get(faceIndex);
    if (!faceData) return;
    
    const oldTransform = faceData.transform || { scaleX: 1, scaleY: 1, rotation: 0, repeatX: 1, repeatY: 1 };
    
    this._pushUndo({
      type: 'SET_FACE_TEXTURE_TRANSFORM',
      objectId,
      faceIndex,
      oldTransform: { ...oldTransform },
      newTransform: { ...transform }
    });
    
    faceData.transform = { ...transform };
    this.notify();
  }
  
  clearSelection() {
    this.selectedIds.clear();
    this.editingVertexIds.clear();
    this.editingEdgeIds.clear();
    this.editingFaceIds.clear();
    this.editingUvIds.clear();
    this.notify();
  }
  
  // History
  undo() {
    const action = this.undoStack.pop();
    if (!action) return;
    
    switch (action.type) {
      case 'ADD_OBJECT':
        this.objects.delete(action.objectId);
        break;
        
      case 'REMOVE_OBJECT':
        this.objects.set(action.objectId, action.objectData);
        break;
        
      case 'UPDATE_OBJECT':
        this.objects.set(action.objectId, action.oldData);
        break;
        
      case 'SET_TRANSFORM': {
        const existingObj = this.objects.get(action.objectId);
        if (existingObj) {
          existingObj.transform = { ...action.oldTransform };
        }
        break;
      }
        
      case 'SET_MATERIAL':
        const matObj = this.objects.get(action.objectId);
        if (matObj) {
          matObj.material = { ...action.oldMaterial };
        }
        break;
        
      case 'SET_VERTEX_POSITION':
        const obj = this.objects.get(action.objectId);
        if (obj && obj.geometry) {
          obj.geometry.vertices[action.vertexIndex * 3] = action.oldPosition[0];
          obj.geometry.vertices[action.vertexIndex * 3 + 1] = action.oldPosition[1];
          obj.geometry.vertices[action.vertexIndex * 3 + 2] = action.oldPosition[2];
        }
        break;
        
      case 'SET_UV_POSITION': {
        const uvObj = this.objects.get(action.objectId);
        if (uvObj && uvObj.geometry && uvObj.geometry.uvs) {
          uvObj.geometry.uvs[action.uvIndex * 2] = action.oldU;
          uvObj.geometry.uvs[action.uvIndex * 2 + 1] = action.oldV;
        }
        break;
      }
        
      case 'SET_OBJECT_TEXTURE': {
        const texObj = this.objects.get(action.objectId);
        if (texObj) {
          texObj.textureId = action.oldTextureId;
          if (action.oldFaceTextures) {
            texObj.faceTextures = action.oldFaceTextures;
          }
        }
        break;
      }
        
      case 'SET_OBJECT_TEXTURE_TRANSFORM': {
        const transformObj = this.objects.get(action.objectId);
        if (transformObj) {
          transformObj.textureTransform = action.oldTransform;
        }
        break;
      }
        
      case 'SET_FACE_TEXTURE': {
        const faceObj = this.objects.get(action.objectId);
        if (faceObj) {
          if (!faceObj.faceTextures) {
            faceObj.faceTextures = new Map();
          }
          if (action.oldTextureId) {
            faceObj.faceTextures.set(action.faceIndex, { textureId: action.oldTextureId });
          } else {
            faceObj.faceTextures.delete(action.faceIndex);
          }
        }
        break;
      }
        
      case 'SET_FACE_TEXTURE_TRANSFORM': {
        const faceObj = this.objects.get(action.objectId);
        if (faceObj && faceObj.faceTextures) {
          const faceData = faceObj.faceTextures.get(action.faceIndex);
          if (faceData) {
            faceData.transform = action.oldTransform;
          }
        }
        break;
      }
    }
    
    this.redoStack.push(action);
    this.notify();
  }
  
  redo() {
    const action = this.redoStack.pop();
    if (!action) return;
    
    switch (action.type) {
      case 'ADD_OBJECT':
        this.objects.set(action.objectId, action.objectData);
        break;
        
      case 'REMOVE_OBJECT':
        this.objects.delete(action.objectId);
        break;
        
      case 'UPDATE_OBJECT':
        this.objects.set(action.objectId, action.newData);
        break;
        
      case 'SET_TRANSFORM': {
        const existingObj = this.objects.get(action.objectId);
        if (existingObj) {
          existingObj.transform = { ...action.newTransform };
        }
        break;
      }
        
      case 'SET_MATERIAL': {
        const matObj = this.objects.get(action.objectId);
        if (matObj) {
          matObj.material = { ...action.newMaterial };
        }
        break;
      }
        
      case 'SET_VERTEX_POSITION':
        const obj = this.objects.get(action.objectId);
        if (obj && obj.geometry) {
          obj.geometry.vertices[action.vertexIndex * 3] = action.newPosition[0];
          obj.geometry.vertices[action.vertexIndex * 3 + 1] = action.newPosition[1];
          obj.geometry.vertices[action.vertexIndex * 3 + 2] = action.newPosition[2];
        }
        break;
        
      case 'SET_UV_POSITION': {
        const uvObj = this.objects.get(action.objectId);
        if (uvObj && uvObj.geometry && uvObj.geometry.uvs) {
          uvObj.geometry.uvs[action.uvIndex * 2] = action.newU;
          uvObj.geometry.uvs[action.uvIndex * 2 + 1] = action.newV;
        }
        break;
      }
        
      case 'SET_OBJECT_TEXTURE': {
        const texObj = this.objects.get(action.objectId);
        if (texObj) {
          texObj.textureId = action.newTextureId;
          texObj.faceTextures = new Map();
        }
        break;
      }
        
      case 'SET_OBJECT_TEXTURE_TRANSFORM': {
        const transformObj = this.objects.get(action.objectId);
        if (transformObj) {
          transformObj.textureTransform = action.newTransform;
        }
        break;
      }
        
      case 'SET_FACE_TEXTURE': {
        const faceObj = this.objects.get(action.objectId);
        if (faceObj) {
          if (!faceObj.faceTextures) {
            faceObj.faceTextures = new Map();
          }
          if (action.newTextureId) {
            faceObj.faceTextures.set(action.faceIndex, { textureId: action.newTextureId });
          } else {
            faceObj.faceTextures.delete(action.faceIndex);
          }
        }
        break;
      }
        
      case 'SET_FACE_TEXTURE_TRANSFORM': {
        const faceObj = this.objects.get(action.objectId);
        if (faceObj && faceObj.faceTextures) {
          const faceData = faceObj.faceTextures.get(action.faceIndex);
          if (faceData) {
            faceData.transform = action.newTransform;
          }
        }
        break;
      }
    }
    
    this.undoStack.push(action);
    this.notify();
  }
  
  canUndo() {
    return this.undoStack.length > 0;
  }
  
  canRedo() {
    return this.redoStack.length > 0;
  }
  
  clear() {
    this.objects.clear();
    this.selectedIds.clear();
    this.editingVertexIds.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

export const store = new Store();
