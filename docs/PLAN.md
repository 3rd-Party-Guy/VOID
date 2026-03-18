# VOID Implementation Plan

## Milestones Overview

| Milestone | Description | Key Deliverables |
|-----------|-------------|-----------------|
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
| **M13** | Object Hierarchy | Parent/child relationships, tree view |
| **M14** | USD Import | USDA/USDC/USDZ loading, hierarchy |
| **M15** | Skybox Support | Equirectangular, cube, HDR |
| **M16** | Camera Anchor | Spawn at anchor, anchor updates |

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
- [x] Implement basic UV editor (Ctrl+U to toggle, h/j/k/l to move, click to select)

### M10: USD Export

- [x] Implement USDA format writer
- [x] Export geometry (vertices, faces, normals)
- [x] Export transforms (position, rotation, scale)
- [x] Export UV coordinates
- [x] Export materials as USD Preview Surface
- [x] Implement file download (browser blob)
- [x] Export to .usda format

### M11: Vim Integration

- [x] Implement vim mode system (normal/insert/vertex/edge/face)
- [x] Map h/j/k/l to camera pan (XZ plane)
- [x] Map H/J to camera pan up/down (Y axis)
- [x] Map w/s to zoom
- [x] Map q/e to orbit left/right
- [x] Map Q/E to orbit up/down
- [x] Map i to insert mode (create)
- [x] Map g to vertex mode
- [x] Map z to edge mode
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

### M13: Object Hierarchy

- [x] Add parentId field to object structure in store.js
- [x] Add children array to object structure
- [x] Implement setObjectParent(objectId, parentId) method
- [x] Implement getObjectChildren(objectId) method
- [x] Update scene hierarchy panel to show tree structure
- [x] Apply parent transforms to children in rendering
- [x] Implement material inheritance (child inherits parent material if none assigned)
- [x] Add parent property in properties panel

### M14: USD Import

- [x] Add USDImporter class in usd.js
- [x] Implement USDA (ASCII) parser
- [x] Implement USDC/USDZ loading via Three.js USDLoader
- [x] Convert Three.js meshes to VOID geometry format
- [x] Preserve parent-child hierarchy from USD
- [x] Add "Import USD..." to File menu
- [x] Handle unsupported features gracefully (skip silently)

### M15: Skybox Support

- [x] Add skybox state to store.js
- [x] Add SceneManager.setSkybox() method
- [x] Support equirectangular texture loading
- [x] Support cube texture (6 images) loading
- [x] Support HDR texture loading via RGBELoader
- [x] Set scene.background and scene.environment
- [x] Add Skybox section to View menu
- [x] Add clear skybox option

### M16: Camera Anchor

- [x] Add cameraAnchor to global state in store.js
- [x] Initialize cameraAnchor at [0, 0, 0]
- [x] Track camera position updates in SceneManager
- [x] Update anchor on pan camera movements only
- [x] Orbit/zoom do not change anchor
- [x] Set anchor to object center on selection
- [x] Spawn new objects at cameraAnchor position
- [x] Display anchor coordinates in status bar

---

## Implementation Order

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15 → M16

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
M13: Object hierarchy
M14: USD import
M15: Skybox
M16: Camera anchor
```
```

---

## Acceptance Criteria

1. **Build**: `npm run build` produces working output
2. **Create**: All 8 primitives spawn correctly
3. **Edit**: Vertices, edges, and faces can be selected and moved
4. **Texture**: PNG/JPEG/GIF/TGA/BMP can be loaded and applied to objects and individual faces
5. **Export**: Valid .usda file exports
6. **Import**: Valid .usd/.usdc/.usdz files import with hierarchy preserved
7. **Skybox**: Equirectangular, cube, and HDR backgrounds load and display
8. **Anchor**: Camera anchor updates on pan only, objects spawn at anchor
9. **Hierarchy**: Parent-child relationships work with transform inheritance
10. **Vim**: All keybindings functional (h/j/k/l/H/J/w/s/q/e/Q/E/g/z/f/u/d/Escape)
11. **Performance**: 30+ FPS with 50 objects
