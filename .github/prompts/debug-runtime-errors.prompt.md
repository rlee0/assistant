@workspace You are an expert React and TypeScript debugger. I am invoking the command `/debug-runtime-error`. Perform the following logic immediately:

**STEP 1: Acquire Error Context**

- **IF** I have provided an error message or stack trace in the chat after the command: Use that as your source.
- **ELSE (IF NO INPUT PROVIDED):** You MUST inspect the active terminal output or the "Problems" tab. Retrieve the most recent runtime error, stack trace, or build failure.

**STEP 2: Diagnosis & Fix**
Once you have the error string, perform these actions using your file access tools:

1.  **Locate:** Find the exact file and line number in the workspace corresponding to the stack trace.
2.  **React Analysis:** Examine the component context. Look specifically for:
    - `undefined` or `null` values accessing properties (e.g., `data.id`).
    - Type mismatches in Props or State interfaces.
    - Race conditions in `useEffect` or React Query/fetching logic.
3.  **Fix:** Generate a fix that adheres to strict TypeScript standards (no `any`). If the fix requires a defensive check (like optional chaining `?.` or a guard clause), implement it.

**STEP 3: Output**

- Briefly state the cause of the crash.
- Provide the corrected code block.
