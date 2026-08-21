# Continue Watching No-Refresh Episode-Mark Remediation

**Scope:** Mark Next Episode action in Continue Watching and the shared view-model query.

## Verified cause

The action itself is already a non-submitting `type="button"` and the mutation does not navigate or call a browser reload. Marking an episode changes the optimistic watched-episode cache, which changes the `watchedHash` embedded in the Continue Watching React Query key. The query therefore starts a new key while the component exposes `query.isLoading` as section loading. Continue Watching immediately unmounts the populated rail in favor of its skeleton, making the update look like a page refresh.

## Remediation

Retain the previous Continue Watching view-model result as query placeholder data while the rekeyed result resolves. The section only reports loading when it has no renderable data. The background revalidation still runs, the optimistic watched-episode row remains the mutation source of truth, and final query data still replaces the placeholder result.

## Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Action semantics | Mark Next Episode remains an explicit non-submitting button. |
| During mutation | The populated Continue Watching rail remains mounted instead of switching to a skeleton. |
| Data correctness | Optimistic episode state, reconciliation with the persisted RPC response, and derived progress invalidation remain unchanged. |
| Initial load | The section still shows a loading state when there is no prior view-model data. |
| Regression coverage | A focused source regression locks placeholder retention and data-aware loading behavior. |
| Validation | Unit suite, full release gate, production build, and live non-mutating verification pass. |
