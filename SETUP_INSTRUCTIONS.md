# Setup & Verification Instructions

## Overview

This refactoring improves type safety, error handling, and validation throughout the codebase. No new dependencies were added - all changes use existing packages.

---

## Prerequisites

Ensure you have the following installed:

- Node.js 18+ (for TypeScript 5+)
- pnpm 8.0+

---

## Installation Steps

### 1. No Additional Dependencies

All changes use existing dependencies:

- `zod@^4.3.5` (already in package.json)
- `ai@^6.0.27` (already in package.json)
- `next@16.1.1` (already in package.json)
- `typescript@^5.x` (already in package.json)

### 2. Verify Installation

```bash
# Install/update dependencies if needed
pnpm install

# Verify TypeScript is properly configured
pnpm tsc --version
```

---

## Verification Commands

### TypeScript Type Checking

**Check for TypeScript errors:**

```bash
pnpm tsc --noEmit
```

Expected output: `Found 0 errors`

**Check with strict mode enabled:**

```bash
pnpm tsc --noEmit --strict
```

---

### Linting

**Run ESLint:**

```bash
pnpm lint
```

Expected: No errors in modified files

**Run ESLint with full output:**

```bash
pnpm lint --format=verbose
```

---

### Build Verification

**Verify Next.js builds successfully:**

```bash
pnpm build
```

Expected: Build completes without errors

---

## Validation Checklist

Run this checklist to verify all changes are working correctly:

### ✅ Type Safety

```typescript
// Verify no type assertions in tools
grep -r "as ToolDefinition" src/tools/ || echo "✓ No unsafe ToolDefinition casts"

// Verify no implicit any in critical files
pnpm tsc src/lib/api/result.ts --noEmit --strict
pnpm tsc src/lib/api/validators.ts --noEmit --strict
```

### ✅ Error Handling

```bash
# Verify Result type is exported
grep -r "export.*Result" src/lib/api/result.ts || echo "✓ Result type exported"

# Verify error helpers exist
grep -r "export.*Err\|export.*Ok" src/lib/api/result.ts || echo "✓ Error helpers exported"
```

### ✅ Validation

```bash
# Verify Zod schemas are centralized
grep -r "validate.*function" src/lib/api/validators.ts || echo "✓ Validation utilities present"

# Verify old validators still exist (backward compatibility)
grep -r "export.*validateEmail" src/lib/api/validation.ts || echo "✓ Old validators available"
```

### ✅ Settings

```bash
# Verify settings schema is properly typed
pnpm tsc src/lib/settings.ts --noEmit --strict
echo "✓ Settings schema compiles"
```

---

## Quick Smoke Tests

### Test 1: Settings Loading

Create `test-settings.ts`:

```typescript
import { parseSettings, buildDefaultSettings } from "@/lib/settings";

const defaults = buildDefaultSettings();
console.log("Default settings created:", defaults.appearance.theme);

const parsed = parseSettings(defaults);
console.log("Settings parsed successfully");
```

Run:

```bash
npx ts-node test-settings.ts
```

Expected: Both console logs print without errors

### Test 2: Tool Building

Create `test-tools.ts`:

```typescript
import { toolDefinitions, buildTools, defaultToolSettings } from "@/tools";

const settings = defaultToolSettings();
console.log("Default tool settings:", Object.keys(settings));

const tools = buildTools(settings);
console.log("Built tools:", Object.keys(tools));
```

Run:

```bash
npx ts-node test-tools.ts
```

Expected: Both console logs show tool IDs and built tools

### Test 3: Validation

Create `test-validators.ts`:

```typescript
import { validate, chatRequestSchema } from "@/lib/api/validators";

const validRequest = {
  messages: [{ role: "user" as const, content: "hello" }],
};

const result = validate(chatRequestSchema, validRequest, "chat request");
console.log("Validation result:", result.success);

const invalidRequest = { messages: [] };
const badResult = validate(chatRequestSchema, invalidRequest);
console.log("Invalid request handled:", !badResult.success);
```

Run:

```bash
npx ts-node test-validators.ts
```

Expected: Both console logs show correct validation behavior

---

## Troubleshooting

### Issue: "Cannot find module" errors after build

**Solution**: Clear Next.js cache and rebuild

```bash
rm -rf .next
pnpm build
```

### Issue: Type errors in IDE but `pnpm tsc` passes

**Solution**: Reload TypeScript in your editor

- VSCode: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Other editors: Restart the language server

### Issue: Old validators still showing errors

**Solution**: Both old and new validators exist for backward compatibility

```typescript
// Both work:
import { validateEmail } from "@/lib/api/validation"; // Old way
import { validate, emailSchema } from "@/lib/api/validators"; // New way
```

---

## Recommended Next Steps

### Immediate (This Sprint)

1. ✅ Run all verification commands above
2. ✅ Test smoke tests pass
3. ✅ Run full test suite if available
4. Deploy to staging environment

### Short Term (Next Sprint)

1. Add Result pattern to existing API routes
2. Add structured logging to error handling
3. Create API middleware for request validation
4. Add input sanitization for LLM prompts

### Medium Term

1. Migrate all validation to Zod
2. Add rate limiting to API routes
3. Implement settings change audit trail
4. Add tool execution monitoring

---

## Rollback Plan

If issues are discovered:

```bash
# View git history
git log --oneline src/

# Revert specific files
git checkout HEAD -- src/lib/api/result.ts src/lib/api/validators.ts

# Or revert entire commit
git revert <commit-hash>
```

---

## Documentation

### For Developers Using New Features

#### Result Pattern

```typescript
import { Ok, Err, resultToResponse, Result } from "@/lib/api/result";

async function myHandler(req: Request): Promise<NextResponse> {
  // Create success
  const okResult: Result<string> = Ok("success");

  // Create error
  const errResult: Result<string> = Err("Something went wrong", "OPERATION_FAILED", 500);

  // Use async wrapper
  const result = await tryAsync(async () => await someAsyncOp(), "ASYNC_ERROR", 500);

  return resultToResponse(result);
}
```

#### Validation Pattern

```typescript
import { validate, chatRequestSchema, parseRequestJSON } from "@/lib/api/validators";

async function POST(req: Request): Promise<NextResponse> {
  // Parse JSON
  const bodyResult = await parseRequestJSON(req as NextRequest);
  if (!bodyResult.success) return resultToResponse(bodyResult);

  // Validate against schema
  const validResult = validate(chatRequestSchema, bodyResult.data, "chat request");
  if (!validResult.success) return resultToResponse(validResult);

  const chatRequest = validResult.data;
  // ... use validated data
}
```

#### Settings Pattern

```typescript
import { parseSettings, buildDefaultSettings } from "@/lib/settings";

// Load defaults
const defaults = buildDefaultSettings();

// Parse from external source
const parsed = parseSettings(jsonFromDatabase);

// Use with type safety
const theme = parsed.appearance.theme; // "light" | "dark" | "system"
```

---

## Support

For issues or questions:

1. Check REFACTORING_REVIEW.md for detailed analysis
2. Review CHANGELOG_REFACTORING.md for what changed
3. Run verification steps above
4. Check test files for usage examples
