# VOID - Vertex Object Interactive Designer

## 1. Project Overview

**Project Name:** VOID (Vertex Object Interactive Designer)  
**Type:** 3D World Editor and Creator  
**Core Philosophy:** The software shall be fully operable without a keyboard. Mouse-free operation using vim-style bindings. A TUI (Text User Interface) aesthetic with a real-time 3D rendered viewport.

---

## 2. Functional Requirements

### 2.1 Geometry Creation

| Primitive | Description | Default Parameters |
|-----------|-------------|-------------------|
| **Cube** | Six-faced rectangular box | Size: 1×1×1 |
| **Sphere** | UV sphere | Radius: 0.5, Segments: 32, Rings: 16 |
| **Cylinder** | Circular cylinder | Radius: 0.5, Height: 1, Segments: 32 |
| **Cone** | Circular cone | Radius: 0.5, Height: 1, Segments: 32 |
| **Pyramid** | Four-sided triangular pyramid | Base Size: 1, Height: 1 |
| **Plane** | Flat quadrilateral | Size: 1×1 |
| **Torus** | Ring-shaped primitive | Major Radius: 0.5, Minor Radius: 0.2 |
| **Triangle** | Single triangular face | Equilateral, Side: 1 |

**Requirements:**
- Primitives spawn at world origin (0, 0, 0)
- Unique auto-generated names (e.g., "Cube_001")
- Appears immediately in viewport and scene hierarchy

### 2.2 Vertex Editing

**Vertex Selection:**
- Individual vertex selection via click
- Multi-select via box or lasso
- Select all vertices (vim: `gg` or command)
- Selected vertices highlighted in distinct color

**Vertex Manipulation:**
- Move vertices along X, Y, or Z axis
- Free movement in 3D space
- Transform gizmos for intuitive control
- Numeric input for precise coordinates
- Real-time viewport updates

**Vertex Display:**
- Vertices displayed as points in edit mode
- Toggle vertex visibility on/off

### 2.3 Texture Management

**Texture Import:**
- PNG, JPEG, TGA formats supported
- Stored in project or alongside exported USD

**Texture Application:**
- One diffuse/albedo texture per object
- Auto-generated UV unwrapping (planar/cylindrical/spherical)
- Texture preview in viewport

**Texture Editing:**
- Basic UV editor for mapping adjustment
- Scale, rotate, translate UV coordinates
- Texture displayed as UV editor background

### 2.4 USD Export

**Export Scope:**
- All geometry objects
- Transform data (position, rotation, scale)
- Texture assignments and UV coordinates
- Materials as USD Preview Surface

**Format Support:**
- `.usd` (ASCII) - human readable
- `.usdc` (binary) - efficient
- `.usdz` (package) - standalone sharing

---

## 3. User Interface Requirements

### 3.1 Design Philosophy

The interface shall combine TUI aesthetics with 3D rendering:
- **Dark theme** with monospace fonts and ASCII-style borders
- **Command palette** (vim-like) for all operations
- **Side panels** with crisp, minimal borders
- **3D viewport** with basic lighting

### 3.2 Viewport

- **Camera:** Orbit (right-drag), Pan (middle-drag), Zoom (scroll)
- Grid floor for spatial reference
- 3D axis gizmo (RGB = XYZ)
- Basic shading and lighting
- Selection highlighting/outline

### 3.3 Navigation & Control (Keyboard-Free Primary)

**Primary Mode: Vim-Style Bindings**
| Key | Action |
|-----|--------|
| `h/j/k/l` | Pan camera left/down/up/right |
| `w/s` | Zoom in/out |
| `q/e` | Orbit camera |
| `g` | Enter vertex edit mode |
| `Escape` | Exit to default mode |
| `i` | Insert mode (create geometry) |
| `d` | Delete selected |
| `y` | Yank (copy) |
| `p` | Paste |
| `/` | Command palette |
| `:` | Direct command entry |
| `1-8` | Quick create primitives |
| `Tab` | Cycle panels |

**Mouse Alternative (Always Available)**
- All operations accessible via mouse clicks
- No operation requires keyboard
- Right-click context menus for all commands

### 3.4 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ VOID - Vertex Object Interactive Designer     [File] [?]  │
├────────────┬────────────────────────────────┬───────────────┤
│            │                                │               │
│  Scene     │                                │  Properties   │
│  Hierarchy │        3D Viewport            │               │
│            │                                │  - Transform  │
│  - Cube_01 │                                │  - Vertices   │
│  - Sphere  │                                │  - Material   │
│  - Cone    │                                │               │
│            │                                │               │
├────────────┴────────────────────────────────┴───────────────┤
│ Command: :create cube                              [Status]  │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Panels

**Scene Hierarchy (Left Panel)**
- Tree list of all objects
- Name and type displayed
- Click to select
- Delete via context menu

**Properties Panel (Right Panel)**
- Transform: Position, Rotation, Scale (X, Y, Z)
- Vertices: Selected vertex coordinates
- Material: Texture slot, path, color picker
- Info: Vertex count, face count, name

**Command Bar (Bottom)**
- Vim-style command input (`:command`)
- Command palette (`/`)

### 3.6 Menu Bar (Accessible via Mouse or Hotkey)

- **File:** New, Save, Export USD, Exit
- **Edit:** Undo, Redo, Delete, Select All
- **View:** Toggle Grid, Toggle Vertices, Reset Camera
- **Help:** About, Shortcuts

---

## 4. Data Model

```
VOID Scene
├── Global Settings
│   ├── Default Units
│   └── Coordinate System (Y-up)
├── Objects[]
│   ├── Transform (position, rotation, scale)
│   ├── Geometry (vertices, faces, UVs)
│   └── Material (texture, diffuse color, opacity)
└── Camera (position, target, FOV)
```

---

## 5. Non-Functional Requirements

- **Performance:** 100+ objects, 30+ FPS, <100ms response
- **Accessibility:** Full mouse-free operation, vim bindings optional
- **Compatibility:** Valid USD 2.0, importable by Blender/Unity/Unreal

---

## 6. Out of Scope

- Height-map/displacement
- Animation/keyframes
- Rigging/skeletons
- Physics
- Advanced shaders/node materials
- Lighting beyond viewport
- Camera animation
- USD import (export-only)
- Other 3D formats
- Terrain/particles

---

## 7. Success Criteria

1. All 8 primitive types creatable
2. Independent vertex selection and movement
3. Texture import (PNG/JPEG) and application
4. Export to valid .usd/.usdc/.usdz
5. Exported files work in Blender/importer tools
