# Test Helpers

This folder contains reusable helper utilities for the xPack test suite.

## Purpose

The test helpers reduce code duplication and enforce consistent testing patterns across the test suite. They encapsulate common test operations that appear multiple times throughout the tests.

## Available Helpers

### `testIdempotentInitialisation(t, instance, name)`

Tests the idempotent initialisation pattern for objects.

**Usage:**

```typescript
import { testIdempotentInitialisation } from '../../helpers/index.js'

await t.test('MyClass - initialisation', async (t): Promise<void> => {
  const myObject = new MyClass({ log })

  // Test that initialise() returns true first time, false subsequently
  await testIdempotentInitialisation(t, myObject, 'myObject')
})
```

**Replaces:**

```typescript
let isInitialised = await myObject.initialise()
t.equal(isInitialised, true, 'initialise() => true')
isInitialised = await myObject.initialise()
t.equal(isInitialised, false, 'initialise() again => false')
```

**Impact:** Reduces ~124 lines across 31 occurrences in the test suite.

## Adding New Helpers

When adding new helper functions:

1. Create a new file in `tests/helpers/` with a descriptive name
2. Add comprehensive TSDoc documentation following the project conventions
3. Export the helper from `index.ts`
4. Update this README with usage examples
5. Use British English spelling and grammar

## Guidelines

- Helper functions should be focused and reusable
- Include comprehensive TSDoc documentation
- Follow the existing code style and conventions
- Keep line length below 80 characters
- Use British English in all documentation
