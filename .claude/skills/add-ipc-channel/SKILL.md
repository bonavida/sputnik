---
name: add-ipc-channel
description: Checklist for exposing something new from the Electron main process to the renderer (a dialog, file access, a window or OS feature). Use whenever the renderer needs a new method on window.sputnik, so the channel is typed, validated, sender-checked and tested.
---

# Add an IPC channel

The renderer is treated as untrusted. A channel is only done when every step
below is in place; skipping one usually means a security hole or a test gap.

## Steps, in order

1. **Contract** — add the method to `SputnikApi` in `shared/types.ts`. Prefer plain
   data in and out (structured-clone friendly). Translated labels for native UI
   (dialog titles, filter names) are arguments: the main process has no strings.
2. **Channel name** — add it to `IPC` in `shared/constants.ts` (`area:action`).
3. **Validation** — add the argument validator to `IPC_ARGS` in
   `electron/ipcArgs.ts`, reusing or adding guards in `shared/guards.ts` (with size
   limits for strings and arrays). The `satisfies` clause fails the typecheck if a
   channel has no validator.
4. **Guard tests** — extend `shared/guards.test.ts` and `electron/ipcArgs.test.ts`
   with valid and invalid payloads (wrong types, extra arguments, oversized data).
5. **Handler** — register it with `handle(IPC.x, …)` in `electron/ipc.ts`. `handle()`
   already rejects untrusted senders and invalid arguments; keep the handler thin and
   move real logic to a testable module that takes its dependencies as parameters.
   Anything touching paths must keep the media allowlist intact (only audio files
   that exist; never serve arbitrary paths).
6. **Main-process tests** — if logic was added, test it in `electron/test/*.int.test.ts`
   with real files in a temp folder.
7. **Preload** — add the method in `electron/preload.ts` as a one-line
   `ipcRenderer.invoke(IPC.x, …)`. Nothing else goes in the preload.
8. **Memory bridge** — implement it in `src/lib/memoryBridge.ts` (used by tests and by
   `pnpm dev:web`), recording calls in `bridge.calls` if tests need to assert them.
9. **Renderer** — call it from a flow in `src/app/actions.ts` (not from components),
   with loading and error handling (`useUiStore` notices).
10. **Integration test** — cover the user flow in `src/test/*.int.test.tsx` through
    the UI, asserting on the memory bridge.
11. **Verify** — `pnpm typecheck && pnpm lint && pnpm test`, then check it in the real
    app (`REMOTE_DEBUGGING_PORT=9333 pnpm dev` + `node scripts/devtools.mjs eval …`).
