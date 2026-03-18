# VOID Implementation Plan

## Milestones Overview

| Milestone | Description | Key Deliverables |
|-----------|-------------|------------------|
| **M1** | Project Initialization | Electron app runs, basic window |
| **M2** | Core Foundation | Three.js viewport, camera, grid |
| **M3** | Geometry System | All 8 primitives, scene tree |
| **M4** | UI Framework | TUI panels, command bar |
| **M5** | Selection System | Object/vertex selection, highlighting |
| **M6** | Vertex Editing | Vertex manipulation, gizmos |
| **M7** | Edge Editing | Edge selection, edge loop selection |
| **M8** | Face Editing | Face selection, face manipulation |
| **M9** | Texture System | Import, apply, UV editor |
| **M10** | USD Export | USDA writer, file export |
| **M11** | Vim Integration | All keybindings, modes |
| **M12** | Build & Release | Packaged .exe/.app |

---

## Detailed Tasks by Milestone

### M1: Project Initialization

- [x] Initialize npm project with package.json
- [x] Install dependencies (Electron, Vite, Three.js, electron-builder)
- [x] Create Electron main process with window management
- [x] Set up Vite configuration for Electron
- [x] Create preload script with IPC bridge
- [x] Verify `npm run dev` launches empty window

### M2: Core Foundation

- [x] Set up Three.js renderer with WebGL canvas
- [x] Implement camera with orbit/pan/zoom controls
- [x] Add grid floor visualization
- [x] Add axis gizmo (RGB = XYZ)
- [x] Add basic lighting (ambient + directional)
- [x] Implement render loop with 30+ FPS target

### M3: Geometry System

- [x] Implement GeometryFactory with all 8 primitives
  - [x] Cube, Sphere, Cylinder, Cone, Pyramid, Plane, Torus, Triangle
- [x] Generate unique auto-named objects (Cube_001, etc.)
- [x] Create store.js with state management
- [x] Connect object creation to viewport rendering
- [x] Build scene hierarchy panel (left panel)

### M4: UI Framework

- [x] Create TUI layout with CSS variables (dark theme)
- [x] Build three-panel layout (tree | viewport | properties)
- [x] Implement command bar (bottom)
- [x] Create command palette system
- [x] Add menu bar with File/Edit/View/Help
- [x] Style with monospace fonts, ASCII borders

### M5: Selection System

- [x] Implement object selection (click to select)
- [x] Add selection outline/highlighting in viewport
- [x] Connect selection to properties panel
- [x] Display object transform in properties panel
- [x] Implement delete functionality (d key)

### M6: Vertex Editing

- [x] Toggle vertex edit mode (g key)
- [x] Display vertices as points in edit mode
- [x] Implement vertex selection (click)
- [x] Add vertex highlighting (distinct color)
- [x] Implement vertex movement with h/j/k/l keys
- [x] Real-time viewport updates during editing

### M7: Edge Editing

- [x] Toggle edge edit mode (e key)
- [x] Display edges as lines in edit mode
- [x] Implement edge selection (click)
- [x] Add edge highlighting (distinct color)
- [x] Implement edge selection loop (shift+click)
- [x] Edge movement with h/j/k/l keys

### M8: Face Editing

- [x] Toggle face edit mode (f key)
- [x] Display faces with face overlay
- [x] Implement face selection (click)
- [x] Add face highlighting (distinct color)
- [x] Face selection (shift+click for multiple)
- [x] Face movement with h/j/k/l keys

### M9: Texture System

- [x] Implement texture import (PNG, JPEG, TGA, BMP, GIF)
- [x] Add texture to material system
- [x] Apply texture to geometry
- [x] Display texture in viewport
- [x] Build properties panel texture slot
- [x] Per-face texture support
- [ ] Implement basic UV editor

### M10: USD Export

- [ ] Implement USDA format writer
- [ ] Export geometry (vertices, faces, normals)
- [ ] Export transforms (position, rotation, scale)
- [ ] Export UV coordinates
- [ ] Export materials as USD Preview Surface
- [ ] Implement file save dialog (Electron)
- [ ] Export to .usd format

### M11: Vim Integration

- [x] Implement vim mode system (normal/insert/vertex/edge/face)
- [x] Map h/j/k/l to camera pan
- [x] Map w/s to zoom
- [x] Map q/z to orbit
- [x] Map i to insert mode (create)
- [x] Map g to vertex mode
- [x] Map e to edge mode
- [x] Map f to face mode
- [x] Map 1-8 to quick create primitives
- [x] Map / to command palette
- [x] Map u to undo, Ctrl+r to redo
- [x] Map d to delete
- [x] Escape exits edit modes
- [x] Ensure mouse alternatives always work

### M12: Build & Release

- [ ] Configure electron-builder
- [ ] Test production build
- [ ] Verify .exe/.app runs standalone
- [ ] Final acceptance testing

---

## Implementation Order

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12

M1: Electron base
M2: Viewport
M3: Geometry
M4: UI framework
M5: Selection
M6: Vertex edit
M7: Edge edit
M8: Face edit
M9: Texture system
M10: USD export
M11: Vim bindings
M12: Build
```

---

## Acceptance Criteria

1. **Build**: `npm run build` produces working output
2. **Create**: All 8 primitives spawn correctly
3. **Edit**: Vertices, edges, and faces can be selected and moved
4. **Texture**: PNG/JPEG/GIF/TGA/BMP can be loaded and applied to objects and individual faces
5. **Export**: Valid .usd file exports and opens in Blender
6. **Vim**: All keybindings functional (h/j/k/l/w/s/q/z/g/e/f/u/d/Escape)
7. **Performance**: 30+ FPS with 50 objects
