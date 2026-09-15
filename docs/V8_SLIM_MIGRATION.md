# SMTinel V8 Slim Migration

## Objective
Evolve SMTinel from a broad legacy workflow hub into a lighter local-first decision platform centered on shop-floor execution, yield, current WIP, blockers, and on-time delivery.

## Keep and evolve
- Command Center
- Yield Flow
- Board Impact
- CMA / Critical Model Analysis
- End-of-Shift / Commit Execution Board
- 8D Generator as a focused D1-D8 template / deck generator
- Supporting utilities that directly help manufacturing execution

## Retire from the primary UI
- Issue Impact Analyzer as an independent module. Its useful Cesium HxH / FPY / Test Area logic moves into a shared Cesium Performance Engine consumed by End-of-Shift.
- RCCA workspace as a parallel investigation system. Evidence / blocker / action intelligence should be surfaced in the core execution views instead.
- WhatsApp Intake as a primary ingestion workflow. The original incident-intake role is superseded by stronger SFC, Cesium, Repair and execution data sources.
- Supabase authentication and cloud startup dependency. SMTinel should boot local-first and must not require cloud/authentication to render.

## Preserve from legacy modules
### Issue Impact Analyzer
Preserve only reusable calculation logic:
- Cesium serial normalization
- Test Area classification
- HxH by unique good SN
- FPY
- functional NG
- production vs debug station separation
- recovery / retest interpretation

Target consumer: End-of-Shift Commit Execution Board.

### RCCA / 8D
Retire RCCA workspace and cloud synchronization.
Preserve:
- D1-D8 structure
- editable 8D template
- evidence placeholders
- PPTX / deck generation
- reusable causal / containment prompts only when they directly improve the 8D deliverable

Rename user-facing module to `8D Generator`.

### WhatsApp
Retire from main navigation and startup.
Keep parsers only temporarily until code extraction confirms nothing else depends on them. They should not execute during startup.

### Supabase
Disable startup SDK load and authentication UI.
Keep server-side / historical code isolated until removal is proven safe. No Supabase connection is required for normal local operation.

## V8 navigation target
1. Command Center
2. Yield Flow
3. Board Impact
4. CMA
5. End-of-Shift / Commit Execution
6. Tools
   - 8D Generator
   - Load List validation
   - Statistical analysis
   - maintenance / supporting utilities

## Migration phases
### Phase 1 - UI and startup slimming
- Remove RCCA and Issue Impact from module catalog and mobile nav.
- Disable their render routes.
- Remove Supabase SDK from startup.
- Hide cloud-auth controls.
- Re-enable 8D as `8D Generator`.
- Preserve legacy implementation behind retired routes until regression tests pass.

### Phase 2 - engine extraction
- Extract Cesium performance calculations into one shared engine.
- End-of-Shift consumes the shared engine directly.
- Remove duplicated Issue Impact UI and listeners.

### Phase 3 - RCCA / WhatsApp code removal
- Remove RCCA storage, realtime sync, modal, cloud restore, and workspace rendering.
- Remove WhatsApp ingestion UI and startup hooks.
- Keep only code still referenced by approved tools.

### Phase 4 - physical split of monolithic index
- Keep `index.html` as a lightweight shell.
- Move large feature code into lazy-loaded JS modules.
- Keep PDF libraries lazy / optional.
- Load Cesium / End-of-Shift processing on demand.

## Acceptance criteria
- SMTinel boots on Safari iPhone without Supabase or PDF dependencies.
- Core navigation works without RCCA / Issue Impact.
- End-of-Shift retains Cesium HxH / FPY / Test Area capability.
- 8D Generator can be opened independently and create the existing D1-D8 deliverable.
- No retired module runs work during startup.
- Local mode remains the default execution path.
