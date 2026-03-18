# VOID Testing Strategy

## Test Framework

**Vitest** - Fast, modern, integrates well with Vite

## Test Structure

```
tests/
├── geometry.test.js      # M3: GeometryFactory tests
├── store.test.js         # M3: State management tests
├── commands.test.js      # M4: Command parsing tests
├── usd.test.js          # M8: USDA export tests
├── vim.test.js          # M9: Keybinding tests
└── utils.js             # Test utilities and mocks
```

## Testing Approach by Milestone

| Milestone | What to Test | Test Type |
|-----------|-------------|-----------|
| M1 | (skip - setup) | - |
| M2 | Camera math, render loop | Manual verification |
| M3 | Geometry generation, state management | Unit tests |
| M4 | Command parsing/execution | Unit tests |
| M5 | Selection logic | Unit tests |
| M6 | Vertex manipulation math | Unit tests |
| M7 | UV generation | Unit tests |
| M8 | USDA format output | Integration tests |
| M9 | Keybinding maps | Unit tests |
| M10 | End-to-end acceptance | Manual testing |

## Test Categories

### 1. Geometry Tests (M3)

```javascript
// tests/geometry.test.js
describe('GeometryFactory', () => {
  test('cube generates correct vertex count', () => {
    const cube = createCube({ size: 1 });
    expect(cube.vertices.length).toBe(24);
  });
  
  test('sphere generates triangulated mesh', () => {
    const sphere = createSphere({ radius: 0.5, segments: 32 });
  });
});
```

### 2. State Management Tests (M3)

```javascript
// tests/store.test.js
describe('Store', () => {
  test('undo reverses last action', () => {
    store.addObject('cube');
    store.undo();
    expect(store.getObjects().length).toBe(0);
  });
  
  test('redo restores undone action', () => {
    store.addObject('cube');
    store.undo();
    store.redo();
    expect(store.getObjects().length).toBe(1);
  });
});
```

### 3. USD Export Tests (M8)

```javascript
// tests/usd.test.js
describe('USDExporter', () => {
  test('generates valid USDA syntax', () => {
    const output = exportScene([cubeObject]);
    expect(output).toContain('def "Cube_001"');
    expect(output).toContain('point3f[] points');
  });
  
  test('exports transforms correctly', () => {
    const output = exportScene([objWithTransform]);
    expect(output).toContain('xformOp:translate = (1, 2, 3)');
  });
});
```

## Mock Strategy

- **Three.js**: Mock geometry classes, don't test rendering
- **DOM**: Use jsdom for UI component tests
- **Electron**: Mock IPC calls

## Running Tests

```bash
npm test        # Run all tests
npm test -- --watch  # Watch mode
npm test -- --coverage  # With coverage
```

## Coverage Target

Core modules (geometry, store, USD exporter): ~80% coverage
UI components: Manual verification acceptable
