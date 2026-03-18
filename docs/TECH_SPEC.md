# VOID - Technical Specification

## 1. Architecture Overview

### 1.1 Design Goals
- **Minimal dependencies**: Use existing libraries, implement as little as possible
- **Development ease**: Prioritize simplicity and rapid iteration
- **NodeJS stack**: Electron as desktop framework
- **TUI aesthetic**: Dark theme, monospace fonts, ASCII-style borders over 3D viewport

### 1.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Desktop Shell | Electron 28+ | Cross-platform desktop, Node.js native |
| Build Tool | Vite | Fast builds, hot reload, ESM support |
| 3D Engine | Three.js | Mature, well-documented, NPM packages |
| USD Export | Custom USDA writer | Simple text format, no heavy dependencies |
| UI Framework | Vanilla JS + CSS | Minimal overhead, full control |
| State | Custom store | Simple undo/redo, no Redux needed |

---

## 2. System Architecture

### 2.1 Process Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Window    │  │    IPC      │  │   File System       │  │
│  │  Manager    │  │   Handler   │  │   (Export/Import)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                   Electron Renderer Process                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     VOID Application                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │ │
│  │  │  Scene   │  │  State   │  │    USD Exporter      │ │ │
│  │  │  Store   │  │  Manager │  │                      │ │ │
│  │  └──────────┘  └──────────┘  └──────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Three.js Renderer                       │ │ │
│  │  │   (Viewport, Geometry, Materials, Camera, Gizmos)    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              TUI Interface Layer                     │ │ │
│  │  │  (SceneTree, Properties, CommandBar, ContextMenus)  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
src/
├── main/                      # Electron main process
│   ├── index.js              # Entry point, window creation
│   ├── ipc.js                # IPC handlers
│   └── menu.js               # Application menu
├── renderer/                  # Renderer process (web)
│   ├── index.html            # HTML entry
│   ├── main.js               # Renderer entry
│   ├── core/                 # Core application logic
│   │   ├── store.js          # Scene state + undo/redo
│   │   ├── geometry.js       # Primitive generation
│   │   ├── usd.js            # USD export writer
│   │   └── commands.js       # Command palette
│   ├── three/                # Three.js wrapper
│   │   ├── scene.js          # Three.js scene setup
│   │   ├── camera.js         # Camera controls
│   │   ├── objects.js        # Object management
│   │   ├── selection.js      # Vertex/object selection
│   │   ├── gizmos.js         # Transform gizmos
│   │   └── materials.js      # Texture/material handling
│   ├── ui/                   # TUI interface
│   │   ├── layout.js         # Panel layout
│   │   ├── tree.js           # Scene hierarchy
│   │   ├── properties.js     # Properties panel
│   │   ├── command.js        # Command bar
│   │   └── vim.js            # Vim keybindings
│   └── styles/               # CSS
│       ├── main.css          # Main styles
│       └── tui.css           # TUI aesthetics
└── preload/
    └── preload.js            # Context bridge
```

---

## 3. Data Models

### 3.1 Scene State

```javascript
// Global application state
const state = {
  version: '0.1.0',
  scene: {
    objects: Map<string, SceneObject>,  // id -> object
    selectedIds: Set<string>,            // Currently selected
    editingVertexIds: Set<string>,      // In vertex edit mode
  },
  skybox: {
    type: 'equirectangular' | 'cube' | 'hdr' | null,
    paths: string | string[],           // Single path or array of 6 cube faces
    loaded: boolean,
  },
  cameraAnchor: [x, y, z],              // Spawn position, updates on camera move/select
  ui: {
    activePanel: 'viewport' | 'tree' | 'properties',
    mode: 'object' | 'vertex',
    commandPaletteOpen: false,
  },
  camera: {
    position: [x, y, z],
    target: [x, y, z],
    fov: 45,
  },
  history: {
    undoStack: Action[],
    redoStack: Action[],
  },
};
```

### 3.2 Scene Object

```javascript
// Each object in the scene
const sceneObject = {
  id: string,                    // Unique ID (UUID)
  name: string,                  // Display name (e.g., "Cube_001")
  type: 'cube' | 'sphere' | ...| 'custom',
  
  // Transform
  transform: {
    position: [x, y, z],         // Default: [0, 0, 0]
    rotation: [x, y, z],         // Euler angles, radians
    scale: [x, y, z],            // Default: [1, 1, 1]
  },
  
  // Geometry (triangulated for USD compatibility)
  geometry: {
    vertices: Float32Array,      // Flat array [x,y,z, x,y,z, ...]
    faces: Uint16Array,         // Triangle indices [i0,i1,i2, ...]
    normals: Float32Array,      // Optional, computed if absent
    uvs: Float32Array | null,   // UV coordinates [u,v, ...]
  },
  
  // Material
  material: {
    name: string,
    diffuseTexture: string | null,   // File path
    diffuseColor: [r, g, b],         // Default: [0.8, 0.8, 0.8]
    opacity: number,                 // Default: 1.0
  },

  // Hierarchy
  parentId: string | null,      // Parent object ID (null = root)
};

// Computed (not stored, derived from parentId)
const derivedChildren = [];      // Array of child object IDs
```

### 3.3 Vertex Data Structure

```javascript
// For vertex editing
const vertexData = {
  objectId: string,
  vertexIndex: number,
  position: [x, y, z],
  selected: boolean,
  uvIndex: number | null,
};
```

---

## 4. Core Interfaces

### 4.1 Store API

```javascript
// src/renderer/core/store.js

class Store {
  // State access
  getState();
  
  // Mutations (with history)
  addObject(type, params);
  removeObject(id);
  setObjectTransform(id, transform);
  setVertexPosition(objectId, vertexIndex, position);
  setMaterial(id, material);
  
  // Hierarchy
  setObjectParent(objectId, parentId);
  getObjectChildren(objectId);
  getObjectDescendants(objectId);
  getObjectParent(objectId);
  flattenObjects();  // Get all objects in flat list for rendering
  
  // Skybox
  setSkybox(type, paths);
  clearSkybox();
  getSkybox();
  
  // Camera Anchor
  getCameraAnchor();
  setCameraAnchor([x, y, z]);
  
  // Selection
  selectObject(id);
  selectVertex(objectId, vertexIndex);
  clearSelection();
  
  // History
  undo();
  redo();
  canUndo();
  canRedo();
  
  // Subscriptions
  subscribe(listener);
}
```

### 4.2 Geometry Factory

```javascript
// src/renderer/core/geometry.js

const GeometryFactory = {
  // Create primitives
  createCube(params: { size?: number }) → GeometryData;
  createSphere(params: { radius?, segments?, rings? }) → GeometryData;
  createCylinder(params: { radius?, height?, segments? }) → GeometryData;
  createCone(params: { radius?, height?, segments? }) → GeometryData;
  createPyramid(params: { baseSize?, height? }) → GeometryData;
  createPlane(params: { size?, width?, height? }) → GeometryData;
  createTorus(params: { majorRadius?, minorRadius?, segments?, sides? }) → GeometryData;
  createTriangle(params: { side? }) → GeometryData;
  
  // Utilities
  computeNormals(vertices, faces) → normals;
  generateUVs(type, vertices, faces) → uvs;
};
```

### 4.3 USD Exporter

```javascript
// src/renderer/core/usd.js

const USDExporter = {
  // Export entire scene
  exportScene(sceneObjects, options) → string;
  
  // Options
  /*
    {
      format: 'usd' | 'usdc' | 'usdz',
      outputPath: string,
      includeTextures: boolean,
    }
  */
  
  // Write to file (via IPC)
  writeFile(path, contents);
};

const USDImporter = {
  // Import USD file
  importFile(filePath) → Promise<ImportResult>;
  
  // Parse USDA text format
  parseUSDA(contents) → SceneData;
  
  // Load USDC/USDZ via Three.js
  loadViaThreeJS(filePath) → Promise<THREE.Group>;
  
  // Convert Three.js mesh to VOID geometry
  convertMeshToGeometry(threeMesh) → GeometryData;
  
  // Extract hierarchy from Three.js scene
  extractHierarchy(threeGroup) → ParentChildMap;
  
  // Result structure
  /*
    {
      objects: SceneObject[],
      hierarchy: Map<string, string>,  // childId -> parentId
      materials: Material[],
      errors: string[],  // Warnings about skipped features
    }
  */
};

### 4.4 Three.js Scene Manager

```javascript
// src/renderer/three/scene.js

class SceneManager {
  constructor(canvasElement);
  
  // Rendering
  render();
  setSize(width, height);
  
  // Object management
  addObject(sceneObject);
  removeObject(id);
  updateObject(id, changes);
  
  // Hierarchy
  updateObjectHierarchy();  // Apply parent transforms to children
  
  // Selection rendering
  setOutline(objectIds);
  showVertexPoints(objectId, visible);
  highlightVertices(indices, color);
  
  // Camera
  setCamera(position, target);
  getCamera();
  getCameraPosition() → [x, y, z];
  getCameraTarget() → [x, y, z];
  
  // Skybox
  setSkybox(type, paths) → Promise;
  clearSkybox();
  
  // Raycasting
  raycastObject(x, y) → hitResult;
  raycastVertex(x, y) → vertexHit;
};
```

### 4.5 Command System

```javascript
// src/renderer/core/commands.js

const Commands = {
  // Registration
  register(name, handler, options);
  
  // Execution
  execute(commandName, args);
  
  // Built-in commands
  ':create cube',
  ':create sphere',
  ':delete',
  ':export usd',
  ':toggle grid',
  ':reset camera',
};
```

---

## 5. Technology Constraints

### 5.1 Dependency Constraints

| Constraint | Rationale |
|------------|-----------|
| No heavy 3D frameworks beyond Three.js | Keep bundle small |
| No state management library | Simple app, custom store sufficient |
| No React/Vue/Angular | Vanilla JS simpler for this scope |
| No USD libraries requiring WASM | USDA is text, can write manually |
| Must work offline | No cloud dependencies |

### 5.2 Performance Constraints

| Target | Constraint |
|--------|------------|
| Startup time | < 3 seconds |
| Scene objects | Support 100+ objects |
| FPS | Maintain 30+ FPS |
| Vertex edit latency | < 100ms response |

### 5.3 Export Constraints

| Constraint | Detail |
|------------|--------|
| Format | USDA (text) for simplicity |
| Features | Basic meshes, transforms, UVs, materials |
| Textures | Embed as file references (USDZ bundles separately) |
| Compatibility | Must work with Blender USD import |

---

## 6. USD Export Implementation

### 6.1 USDA Format (ASCII)

Since USDA is a text format, we'll write it directly:

```python
# Example USDA output structure
def "Cube_001" (
    kind = "component"
)
{
    def Xform "Cube_001_Xform"
    {
        double3 xformOp:translate = (0, 0, 0)
        double3 xformOp:rotateXYZ = (0, 0, 0)
        double3 xformOp:scale = (1, 1, 1)
        
        def Mesh "Mesh"
        {
            int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]
            int[] faceVertexIndices = [0, 1, 2, 3, 4, 5, 6, 7, ...]
            point3f[] points = [(x,y,z), ...]
            normal3f[] normals = [(0,0,1), ...]
            texcoord2f[] primvars:st = [(u,v), ...]
            
            def Material "Material"
            {
                prepend shader "PreviewSurface"
                {
                    uniform token id = "UsdPreviewSurface"
                    color3f inputs:diffuseColor = (0.8, 0.8, 0.8)
                    float inputs:roughness = 0.5
                }
            }
        }
    }
}
```

### 6.2 Export Flow

```
User clicks Export → Command palette or menu
       ↓
Show save dialog (native Electron dialog)
       ↓
Gather all scene objects
       ↓
Generate USDA text for each object
       ↓
If USDC: Convert USDA → USDC (or skip, use USDA)
       ↓
If USDZ: Zip USDA + textures
       ↓
Write to file
       ↓
Show success notification
```

---

## 7. UI Implementation

### 7.1 TUI Styling

```css
/* Core TUI aesthetics */
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --text-primary: #c9d1d9;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
  --border: #30363d;
  --success: #3fb950;
  --warning: #d29922;
  --error: #f85149;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

.panel {
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  font-family: var(--font-mono);
}

.panel-header {
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  padding: 4px 8px;
  font-weight: bold;
}

/* ASCII-style borders */
.border-ascii {
  border: 1px solid var(--border);
  box-shadow: none;
}
```

### 7.2 Layout Grid

```html
<!-- Main layout -->
<div id="app">
  <!-- Menu bar -->
  <header class="menu-bar">...</header>
  
  <!-- Main content -->
  <div class="main-content">
    <!-- Left: Scene tree -->
    <aside class="panel scene-tree">...</aside>
    
    <!-- Center: Viewport -->
    <main class="viewport">
      <canvas id="three-canvas"></canvas>
    </main>
    
    <!-- Right: Properties -->
    <aside class="panel properties">...</aside>
  </div>
  
  <!-- Bottom: Command bar -->
  <footer class="command-bar">...</footer>
</div>
```

---

## 8. Vim Keybindings

### 8.1 Mode: Normal (Default)

| Key | Action |
|-----|--------|
| `h/j/k/l` | Camera pan left/down/up/right |
| `w/s` | Camera zoom in/out |
| `q/e` | Camera orbit |
| `g` | Enter vertex edit mode |
| `i` | Enter insert mode (create) |
| `d` | Delete selected |
| `y` | Yank (copy) |
| `p` | Paste |
| `v` | Visual mode (select) |
| `/` | Command palette |
| `:` | Command entry |
| `1-8` | Quick create primitives |
| `Tab` | Cycle panels |
| `Escape` | Cancel / Exit mode |
| `u` | Undo |
| `Ctrl+r` | Redo |

### 8.2 Mode: Insert (Geometry Creation)

| Key | Action |
|-----|--------|
| `c` | Create cube |
| `s` | Create sphere |
| `cy` | Create cylinder |
| `co` | Create cone |
| `p` | Create pyramid |
| `pl` | Create plane |
| `t` | Create torus |
| `tr` | Create triangle |
| `Escape` | Return to normal mode |

### 8.3 Mode: Vertex Edit

| Key | Action |
|-----|--------|
| `h/j/k/l` | Move selected vertex -X/+Y/-Z/+Z (or use gizmo) |
| `x/y/z` | Lock to axis |
| `Escape` | Exit vertex edit |
| `d` | Delete selected vertices |

---

## 9. Development Workflow

### 9.1 Project Setup

```bash
# Initialize
npm init -y

# Install dependencies
npm install electron --save-dev
npm install three --save
npm install vite --save-dev
npm install electron-builder --save-dev

# Project structure
mkdir -p src/main src/renderer/core src/renderer/three src/renderer/ui src/renderer/styles src/preload
```

### 9.2 Commands

```bash
# Development
npm run dev          # Start Vite + Electron

# Build
npm run build        # Build renderer
npm run electron     # Package Electron app

# Export
npm run dist         # Create distributable
```

### 9.3 File Structure

```
void/
├── package.json
├── vite.config.js
├── electron-builder.json
├── src/
│   ├── main/
│   │   └── index.js
│   ├── preload/
│   │   └── preload.js
│   └── renderer/
│       ├── index.html
│       ├── main.js
│       ├── core/
│       ├── three/
│       ├── ui/
│       └── styles/
├── docs/
│   └── SPEC.md
└── tests/
    └── usd.test.js
```

---

## 10. Acceptance Criteria

1. **Build**: `npm run dist` produces working .exe/.app
2. **Create**: All 8 primitives spawn correctly
3. **Edit**: Vertices can be selected and moved independently
4. **Texture**: PNG/JPEG can be loaded and applied
5. **Export**: Valid .usd file exports and opens in Blender
6. **Vim**: All keybindings functional without mouse
7. **Performance**: 30+ FPS with 50 objects

---

## 11. USD Import Implementation

### 11.1 USDA Parser (Text Format)

USDA is human-readable and can be parsed manually:

```python
# Example USDA structure
def "Cube_001" (
    kind = "component"
)
{
    def Xform "Cube_001_Xform"
    {
        double3 xformOp:translate = (0, 0, 0)
        double3 xformOp:rotateXYZ = (0, 0, 0)
        double3 xformOp:scale = (1, 1, 1)
        
        def Mesh "Mesh"
        {
            int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]
            int[] faceVertexIndices = [0, 1, 2, 3, ...]
            point3f[] points = [(x,y,z), ...]
            normal3f[] normals = [(0,0,1), ...]
            texcoord2f[] primvars:st = [(u,v), ...]
            
            def Material "Material" { ... }
        }
    }
}
```

**Parser Approach:**
1. Read file as text
2. Find all `def Xform` blocks (objects)
3. Extract `xformOp:translate`, `xformOp:rotateXYZ`, `xformOp:scale`
4. Find nested `def Mesh` blocks
5. Extract `points`, `faceVertexCounts`, `faceVertexIndices`, `primvars:st`
6. Build hierarchy from nested Xform relationships

### 11.2 USDC/USDZ (Binary/Archive)

Three.js USDLoader handles these formats:
- Use `THREE.USDLoader` from examples/jsm/loaders/USDLoader.js
- Load returns a `THREE.Group` with nested structure
- Traverse the group hierarchy to extract meshes
- Convert Three.js geometry to VOID format
- Preserve parent-child relationships from scene graph

### 11.3 Unsupported Features

The following are silently skipped during import:

| Feature | Handling |
|---------|----------|
| Particles | Skip entirely |
| Skeletons/Skinning | Skip, import static mesh only |
| Animations | Skip |
| Variants | Skip, use default |
| Instancing | Convert to individual objects |
| Cameras | Skip |
| Lights | Skip |
| Non-PreviewSurface shaders | Skip material, use default |

---

## 12. Skybox Implementation

### 12.1 Supported Formats

| Format | Loader | Description |
|--------|--------|-------------|
| Equirectangular | THREE.TextureLoader + EquirectangularReflectionMapping | Single 360° image |
| Cube Map | THREE.CubeTextureLoader | 6 separate images |
| HDR | RGBELoader | High dynamic range |

### 12.2 Implementation

```javascript
// Equirectangular
const loader = new THREE.TextureLoader();
loader.load(path, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;
});

// Cube texture
const cubeLoader = new THREE.CubeTextureLoader();
scene.background = cubeLoader.load([
  'px.jpg', 'nx.jpg',
  'py.jpg', 'ny.jpg', 
  'pz.jpg', 'nz.jpg'
]);
scene.environment = scene.background;

// HDR
const rgbeLoader = new RGBELoader();
rgbeLoader.load(path, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = scene.background;
});
```

### 12.3 UI Integration

- View menu: "Skybox > Import Equirectangular...", "Skybox > Import Cube...", "Skybox > Clear"
- File dialogs for image selection
- Progress indicator for large files

---

## 13. Camera Anchor Implementation

### 13.1 Overview

The camera anchor determines where new objects spawn. It provides intuitive placement by tracking camera position and selected objects.

### 13.2 Anchor Behavior

| Trigger | Anchor Update |
|---------|---------------|
| App start | [0, 0, 0] |
| Camera pan (h/j/k/l) | Camera position |
| Camera orbit (q/e) | Camera position |
| Camera zoom (w/s) | Camera position |
| Mouse orbit/pan/zoom | Camera position |
| Object selection | Object center |
| Object spawn | New position becomes anchor |

### 13.3 Spawn Position Calculation

```javascript
// Spawn in front of camera, at anchor position
const getSpawnPosition = (camera, anchor) => {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  
  // Position 2 units in front of camera from anchor
  const spawnPos = [
    anchor[0] + direction.x * 2,
    anchor[1] + direction.y * 2,
    anchor[2] + direction.z * 2
  ];
  
  return spawnPos;
};
```

### 13.4 Object Center Calculation

```javascript
// Calculate center of selected object for anchor
const getObjectCenter = (object) => {
  const vertices = object.geometry.vertices;
  let cx = 0, cy = 0, cz = 0;
  
  for (let i = 0; i < vertices.length; i += 3) {
    cx += vertices[i];
    cy += vertices[i + 1];
    cz += vertices[i + 2];
  }
  
  const count = vertices.length / 3;
  return [
    cx / count + object.transform.position[0],
    cy / count + object.transform.position[1],
    cz / count + object.transform.position[2]
  ];
};
```

### 13.5 UI Display

- Status bar shows: `Anchor: (x, y, z)`
- Updates in real-time with camera movement

---

## 14. Future Considerations (Out of Scope)

- glTF export
- Advanced materials (PBR)
- Animation
- Multi-file projects
- Plugin system
