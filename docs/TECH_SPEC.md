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
    selectedIds: Set<string>,           // Currently selected
    editingVertexIds: Set<string>,       // In vertex edit mode
  },
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
    normals: Float32Array,       // Optional, computed if absent
    uvs: Float32Array | null,   // UV coordinates [u,v, ...]
  },
  
  // Material
  material: {
    name: string,
    diffuseTexture: string | null,   // File path
    diffuseColor: [r, g, b],          // Default: [0.8, 0.8, 0.8]
    opacity: number,                  // Default: 1.0
  },
};
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
```

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
  
  // Selection rendering
  setOutline(objectIds);
  showVertexPoints(objectId, visible);
  highlightVertices(indices, color);
  
  // Camera
  setCamera(position, target);
  getCamera();
  
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

## 11. Future Considerations (Out of Scope)

- USD import capability
- glTF export
- Advanced materials (PBR)
- Animation
- Multi-file projects
- Plugin system
