# Bug Handling Procedure

When a bug is found in VOID, follow this procedure:

## 1. Identify the Bug

- Observe unexpected behavior in the application
- Reproduce the bug consistently
- Note the steps to reproduce the bug

## 2. Understand the Bug

- Read the relevant source code
- Trace the execution flow
- Identify the root cause
- Determine what should happen vs what actually happens

## 3. Write Test(s) for the Bug

Create a new test file or add to existing tests:

```javascript
// tests/<feature>-bug.test.js
import { describe, test, expect } from 'vitest';

describe('<Feature> Bug Fix', () => {
  test('description of the bug fix', () => {
    // Test verifies the bug is fixed
    expect(true).toBe(true);
  });
});
```

Run tests to confirm they fail:
```bash
npm test
```

## 4. Fix the Bug

- Modify the source code to fix the bug
- Ensure all tests pass:
```bash
npm test
```

## 5. Update Documentation

- Add test file to `tests/` directory
- Note the bug fix in relevant docs if significant
- Update CHANGELOG.md if it exists

---

## Example: Bug Fix Workflow

```bash
# 1. Identify - User reports: "Deleting objects doesn't update scene"

# 2. Understand - Read main.js, find syncFromStore() doesn't remove meshes

# 3. Write test
cat > tests/scene-sync-bug.test.js << 'EOF'
import { describe, test, expect } from 'vitest';

describe('Scene Synchronization Bug', () => {
  test('syncFromStore removes old meshes', () => {
    expect(true).toBe(true);
  });
});
EOF

# 4. Run tests - should pass or fail appropriately
npm test

# 5. Fix the code in src/renderer/main.js

# 6. Verify all tests pass
npm test
```

---

## Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Test Structure

- Tests live in `tests/` directory
- Use Vitest framework
- Follow naming: `<feature>.test.js` or `<feature>-bug.test.js`
