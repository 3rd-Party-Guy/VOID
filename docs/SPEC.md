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
- Primitives spawn at **camera anchor** position (not world origin)
- Unique auto-generated names (e.g., "Cube_001")
- Appears immediately in viewport and scene hierarchy

### 2.2 Object Hierarchy (Parent/Child)

**Hierarchy Features:**
- Objects can have parent objects
- Children inherit parent transforms (position, rotation, scale)
- Root-level objects have no parent
- Unlimited nesting depth

**Requirements:**
- Scene hierarchy panel displays tree structure with indentation
- Parent-child relationships visible in tree view
- Selecting parent selects all children (optional, configurable)
- Transform changes to parent affect all descendants
- Material inheritance: children inherit parent's material only if child has no material assigned

### 2.3 Vertex Editing

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
- PNG, JPEG, TGA, BMP, GIF formats supported
- Stored in project or alongside exported USD

**Texture Application:**
- One diffuse/albedo texture per object
- Auto-generated UV unwrapping (planar/cylindrical/spherical)
- Texture preview in viewport
- Per-face texture support

**Texture Editing:**
- Basic UV editor for mapping adjustment
- Scale, rotate, translate UV coordinates
- Texture displayed as UV editor background

### 2.4 Skybox/Environment

**Supported Formats:**
- Equirectangular (single 360° image) - **primary**
- Cube texture (6 images: px, nx, py, ny, pz, nz)
- HDR (.hdr files)

**Requirements:**
- Applied to scene background and environment map
- Affects lighting and reflections on metallic surfaces
- Can be cleared/removed
- Shown in viewport immediately upon loading

### 2.5 USD Import

**Supported Formats:**
- USDA (ASCII text format)
- USDC (binary crate format)
- USDZ (zip package with textures)

**Import Scope:**
- Geometry (vertices, faces, normals, UVs)
- Transform hierarchy (parent-child relationships preserved)
- Materials and textures
- Basic UsdPreviewSurface materials

**Unsupported Features (silently ignored):**
- Particles, hair, fur
- Skeletons, skinning, animations
- Complex shaders (non-UsdPreviewSurface)
- Cameras and lights (only geometry imported)
- Variants, instancing, payloads
- Morph targets

**Requirements:**
- File open dialog for selection
- Progress indication for large files
- Errors reported gracefully (invalid files, unsupported features)

### 2.6 Camera Anchor

**Purpose:**
- Objects spawn at camera's current position
- Provides intuitive spawning near selected objects or camera location

**Requirements:**
- Anchor position starts at world origin (0, 0, 0)
- Anchor updates on every camera movement (pan, orbit, zoom)
- When object is selected, anchor updates to object center
- Current anchor position displayed in status bar
- New objects spawn at anchor position (offset forward from camera look direction)

### 2.7 USD Export

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
│   ├── Coordinate System (Y-up)
│   └── Camera Anchor [x, y, z]
├── Skybox
│   ├── Type (equirectangular | cube | hdr)
│   └── Path(s)
├── Objects[]
│   ├── Transform (position, rotation, scale)
│   ├── Geometry (vertices, faces, UVs)
│   ├── Material (texture, diffuse color, opacity)
│   ├── Parent Reference (parentId | null)
│   └── Children Reference (children[] - derived)
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
- Other 3D formats (glTF, OBJ import)
- Terrain/particles

---

## 7. Success Criteria

1. All 8 primitive types creatable
2. Independent vertex selection and movement
3. Texture import (PNG/JPEG/TGA/BMP/GIF) and application
4. Export to valid .usd/.usdc/.usdz
5. Import from .usd/.usdc/.usdz with hierarchy preserved
6. Skybox/environment support (equirectangular, cube, HDR)
7. Camera anchor updates on movement/selection
8. Parent-child hierarchy with transform inheritance
9. Exported files work in Blender/importer tools
