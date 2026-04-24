# ALE Developer Guide (Phase 1)

## Layering Rules
- `src/core/domain`: entities, value objects, invariants only.
- `src/core/application`: use cases and ports only.
- `src/core/infrastructure`: adapter implementations and IoC wiring.
- `app/*`: presentation/API, never domain internals without application boundary.

## Add a New Use Case
1. Create input command and class in `src/core/application/use-cases`.
2. Depend only on port interfaces from `src/core/application/ports`.
3. Enforce business invariants via domain entities.
4. Publish domain events through `EventBusPort`.
5. Add tests under the same module path.

## Add a New Adapter
1. Implement an existing port in `src/core/infrastructure/adapters`.
2. Keep external SDK/database logic in the adapter only.
3. Register adapter in `registerCoreAdapters`.
4. Verify with an IoC/container test.

## Testing Baseline
- Domain invariants: `src/core/domain/**/*.test.ts`
- Use-case smoke tests: `src/core/application/use-cases/tests/**/*.test.ts`
- IoC smoke tests: `src/core/infrastructure/ioc/*.test.ts`

Run:
- `npm test`
- `npm run build`
