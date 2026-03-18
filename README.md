# VOID - Vertex Object Interactive Designer

A 3D world editor with a TUI aesthetic, built with Electron and Three.js.

## Features

- **Geometry System**: Create 8 primitive types (cube, sphere, cylinder, cone, pyramid, plane, torus, triangle)
- **Selection**: Click to select objects in the viewport
- **Edit Modes**:
  - Vertex editing (press `g`) - select and move individual vertices
  - Edge editing (press `e`) - select and move edges
  - Face editing (press `f`) - select faces and apply per-face textures
- **Texture System**: Import PNG, JPG, TGA, BMP, GIF textures
- **Vim-style Keybindings**:
  - `h/j/k/l` - pan camera
  - `w/s` - zoom
  - `q/z` - orbit
  - `1-8` - quick create primitives
  - `u` - undo
  - `Escape` - exit edit modes

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Tech Stack

- Electron
- Three.js
- Vite
