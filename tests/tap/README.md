# Test Suite Documentation

This folder contains the comprehensive test suite for xpm-lib, organised to mirror the source code structure.

## Overview

- **Test Framework:** [node-tap](https://node-tap.org/)
- **Test Count:** 982 assertions across 32 test suites
- **Total Lines:** ~9,387 lines of test code
- **Coverage Target:** >90% statement coverage

## Folder Structure

```
tests/tap/
├── classes/              # Tests for src/classes/
│   ├── actions/         # Actions and Action class tests
│   ├── build-configurations/  # Build configurations tests
│   ├── init-template/   # Template initialisation tests
│   ├── package/         # Package management tests
│   └── ...              # Other class tests
├── functions/           # Tests for src/functions/
│   ├── chmod-recursively.ts
│   ├── is-something.ts
│   ├── perform-substitutions.ts
│   └── ...
└── other/               # Integration and miscellaneous tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test-coverage
```

### Run Specific Test File
```bash
node --loader ts-node/esm tests/tap/classes/package/basic.ts
```

### Run Tests in Watch Mode
```bash
npm run watch
# Then in another terminal:
npm test
```

## Writing Tests

### Basic Test Structure

```typescript
import { test } from 'tap'
import { Logger } from '@xpack/logger'
import * as xpm from '../../src/index.js'

const log = new Logger({ level: 'info' })

// Async test pattern (preferred)
await test('Description of what is being tested', async (t): Promise<void> => {
  // Arrange
  const instance = new xpm.SomeClass({ log })
  
  // Act
  await instance.initialise()
  
  // Assert
  t.equal(instance.someProperty, expectedValue, 'property has expected value')
  t.ok(instance.someMethod(), 'method returns truthy value')
})

// Synchronous test pattern (use only when necessary)
test('Synchronous test', (t): void => {
  const result = xpm.someFunction()
  t.equal(result, expected, 'returns expected result')
  t.end() // Required for synchronous tests
})
```

### Testing Conventions

#### 1. Test Naming
- Use descriptive test names that explain what is being tested
- Follow pattern: `ClassName - specific scenario` or `functionName - specific case`
- Group related tests with similar prefixes

```typescript
await test('BuildConfigurations - undefined configurations', async (t) => {
  // ...
})

await test('BuildConfigurations - single configuration', async (t) => {
  // ...
})
```

#### 2. Async/Await Pattern
- **Always use `async/await`** for asynchronous tests
- **Do NOT use `t.end()`** in async tests (it's handled automatically)
- Only use `t.end()` in synchronous callback-based tests

```typescript
// ✅ Correct - Async test without t.end()
await test('Async test', async (t): Promise<void> => {
  await someAsyncOperation()
  t.ok(result)
})

// ✅ Correct - Synchronous test with t.end()
test('Sync test', (t): void => {
  const result = syncOperation()
  t.ok(result)
  t.end()
})

// ❌ Wrong - Don't use t.end() in async tests
await test('Wrong', async (t): Promise<void> => {
  await someAsyncOperation()
  t.ok(result)
  t.end() // ❌ Unnecessary
})
```

#### 3. Error Testing
Use `t.throws()` for synchronous errors and `t.rejects()` for async errors:

```typescript
// Synchronous error
test('throws ConfigurationError', (t): void => {
  t.throws(
    () => {
      new xpm.SomeClass({ invalid: 'params' })
    },
    {
      constructor: xpm.ConfigurationError,
      message: /expected pattern/,
    },
    'throws with expected error type and message'
  )
  t.end()
})

// Asynchronous error
await test('rejects with ConfigurationError', async (t): Promise<void> => {
  const instance = new xpm.SomeClass({ log })
  
  await t.rejects(
    async () => await instance.initialise(),
    {
      constructor: xpm.ConfigurationError,
      message: /expected pattern/,
    },
    'throws ConfigurationError with expected message'
  )
})
```

#### 4. Idempotent Initialisation Testing
Use the helper for testing repeated initialisation:

```typescript
import { testIdempotentInitialisation } from '../../helpers/index.js'

await test('supports idempotent initialisation', async (t): Promise<void> => {
  const instance = new xpm.SomeClass({ log })
  await testIdempotentInitialisation(t, instance)
})
```

#### 5. Test Organisation Within Files
- Group related tests together
- Use descriptive test names that form a narrative
- Start with basic functionality, then edge cases, then error conditions

```typescript
// Basic functionality
await test('ClassName - undefined input', async (t) => { ... })
await test('ClassName - single item', async (t) => { ... })
await test('ClassName - multiple items', async (t) => { ... })

// Edge cases
await test('ClassName - empty input', async (t) => { ... })
await test('ClassName - large input', async (t) => { ... })

// Error conditions
await test('ClassName - invalid input throws ConfigurationError', async (t) => { ... })
await test('ClassName - missing property throws InputError', async (t) => { ... })
```

## Test Helpers

The test suite includes a helper library in `tests/helpers/` with reusable test utilities.

### Available Helpers

#### testIdempotentInitialisation
Tests that calling `initialise()` multiple times is safe and returns consistent results.

```typescript
import { testIdempotentInitialisation } from '../../helpers/index.js'

await test('idempotent initialisation', async (t): Promise<void> => {
  const actions = new xpm.Actions({ log, engine, substitutionsVariables, jsonActions })
  await testIdempotentInitialisation(t, actions)
})
```

**What it tests:**
- First `initialise()` returns `true`
- Subsequent calls also return `true`
- Multiple calls don't cause errors or state corruption

#### Shared Logger Instance
Import a pre-configured logger for consistent test logging:

```typescript
import { log } from '../../helpers/index.js'

// Available for all tests
const instance = new xpm.SomeClass({ log })
```

### Adding New Helpers

When you identify repeated patterns in tests:

1. Add the helper to `tests/helpers/` with appropriate file organisation
2. Export from `tests/helpers/index.ts`
3. Document usage in `tests/helpers/README.md`
4. Add TSDoc comments following project conventions

## Common Patterns

### Testing Classes with Lazy Initialisation

Many xpm-lib classes use a two-step initialisation pattern:

```typescript
await test('ClassName - lazy initialisation', async (t): Promise<void> => {
  // Step 1: Construction (lightweight)
  const instance = new xpm.SomeClass({ log, ...params })
  
  // At this point, accessing properties should fail
  t.throws(
    () => instance.someProperty,
    { constructor: assert.AssertionError },
    'accessing property before initialise() throws'
  )
  
  // Step 2: Initialisation (populates data)
  const result = await instance.initialise()
  t.ok(result, 'initialise() returns true')
  
  // Now properties are accessible
  t.ok(instance.someProperty, 'property accessible after initialise()')
})
```

### Testing Template Expansion

For classes that expand Liquid templates:

```typescript
await test('template expansion with matrix', async (t): Promise<void> => {
  const liquidEngine = new xpm.LiquidEngine()
  const substitutionsVariables = {
    ...xpm.liquidSubstitutionsVariablesBase,
    matrix: { arch: 'x64', platform: 'linux' },
  }
  
  const result = await xpm.performSubstitutions({
    engine: liquidEngine,
    variables: substitutionsVariables,
    template: 'build-{{ matrix.platform }}-{{ matrix.arch }}',
    context: 'test',
    log,
  })
  
  t.equal(result, 'build-linux-x64', 'template expanded correctly')
})
```

### Testing File Operations

Use test fixtures for file-based tests:

```typescript
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

await test('reads package.json', async (t): Promise<void> => {
  const fixturesPath = path.join(__dirname, '..', '..', 'fixtures')
  const packagePath = path.join(fixturesPath, 'package-version')
  
  const pkg = new xpm.Package({ packageFolderPath: packagePath, log })
  // ...
})
```

## Fixtures

Test fixtures are located in `tests/fixtures/` and include:

- `package-version/` - Package with valid version
- `package-no-version/` - Package without version field
- `package-bad-json/` - Malformed package.json
- `template/` - Template files for init tests
- `rewrite/` - Files for rewrite tests
- `chmod-recursively/` - Files and symlinks for permission tests

When adding fixtures:
- Create descriptive folder names
- Add README.md if the fixture structure is complex
- Keep fixtures minimal (only include necessary files)
- Don't commit node_modules or build artifacts

## Coverage

View coverage report after running:
```bash
npm run test-coverage
open coverage/lcov-report/index.html
```

### Coverage Guidelines

- **Statements:** Target >90%
- **Branches:** Target >85%
- **Functions:** Target >95%
- **Lines:** Target >90%

### Uncovered Code

Some code is intentionally not covered:
- Error paths that are unreachable in normal operation
- Defensive assertions that should never trigger
- Platform-specific code on non-matching platforms

Add `/* c8 ignore next */` comments for intentionally uncovered lines.

## Debugging Tests

### Enable Verbose Logging
```typescript
const log = new Logger({ level: 'trace' })
```

### Run Single Test Suite
```bash
node --loader ts-node/esm tests/tap/classes/actions/basic.ts
```

### Use Node Debugger
```bash
node --inspect-brk --loader ts-node/esm tests/tap/classes/actions/basic.ts
```

Then attach your debugger (VS Code, Chrome DevTools, etc.)

## Best Practices

### ✅ Do

- Write descriptive test names that explain the scenario
- Test both success and failure paths
- Use test helpers to reduce duplication
- Test edge cases and boundary conditions
- Keep tests focused on single responsibilities
- Use async/await for asynchronous operations
- Add assertions with descriptive messages

### ❌ Don't

- Use `t.end()` in async tests
- Write tests that depend on execution order
- Share mutable state between tests
- Commit `.only` or `.skip` modifiers
- Test implementation details (test behavior)
- Create god tests that test too many things
- Forget to test error conditions

## Performance Considerations

The test suite runs in ~40-45 seconds (982 tests). To maintain performance:

- Mock expensive operations when appropriate
- Use fixtures instead of generating test data
- Avoid unnecessary async operations
- Keep test data minimal
- Consider parallel execution for independent tests

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests
- Main branch updates

All tests must pass before merging.

## Getting Help

- **Test Framework Docs:** https://node-tap.org/
- **Tap Assertions:** https://node-tap.org/docs/api/asserts/
- **Project Issues:** https://github.com/xpack/xpm-lib-ts/issues
- **Helper Library:** See `tests/helpers/README.md`

## Recent Improvements

- ✅ **Phase 1 Complete (Feb 2026):** Removed 35 unnecessary `t.end()` calls from async tests
- ✅ Created `testIdempotentInitialisation` helper (20 usages)
- ✅ Split large test files into focused modules

See `tests/CODE-REVIEW.md` for detailed improvement tracking.
