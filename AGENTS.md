# OpenClaw SnApper — Agent Guide

**Project:** OpenClaw SnApper  
**Status:** Active Development  
**Last Updated:** 2026-02-23

---

## 🎯 North Star

Transform OpenClaw from a single-session chat interface into a **multi-app workspace platform** with tabbed SnApps, starting with Workorder Manager for project-bound goal-oriented development.

### Success Criteria

- [ ] SnApper Core manages SnApp lifecycle seamlessly
- [ ] Workorder Manager functions as first-class SnApp
- [ ] Users can switch between workorders without context loss
- [ ] North-star goals guide agent actions within workorders
- [ ] Classic OpenClaw tabs remain functional
- [ ] New SnApps can be added via well-defined API

---

## 📁 Directory Structure

### Project Workspace

```
openclaw-redux/                    # Project workspace (NOT a git repo)
│
├── openclaw-snapper/              # ⭐ REPO: SnApper Core platform
│   ├── .git/                      # Git repository
│   ├── src/snapper/
│   │   ├── core/                  # Core services
│   │   │   ├── manager.ts         # SnApp lifecycle
│   │   │   ├── registry.ts        # SnApp discovery
│   │   │   ├── lifecycle.ts       # Load/activate/suspend
│   │   │   ├── api.ts             # SnApp API implementation
│   │   │   ├── hooks.ts           # Hook service
│   │   │   ├── bus.ts             # Message bus
│   │   │   └── state.ts           # State persistence
│   │   ├── ui/
│   │   │   ├── container.ts       # SnApp container
│   │   │   └── tabs.ts            # SnApp tab rendering
│   │   └── types/
│   │       └── index.ts           # Public TypeScript types
│   ├── tests/
│   ├── README.md
│   └── package.json
│
├── openclaw-workorders/           # 📋 REPO: Workorder Manager SnApp
│   ├── .git/                      # Git repository (future)
│   ├── snap.json                  # SnApp manifest
│   ├── index.ts                   # Entry point
│   ├── src/
│   │   ├── core/                  # WM business logic
│   │   │   ├── manager.ts
│   │   │   ├── registry.ts
│   │   │   ├── checkpoint.ts
│   │   │   ├── sandbox.ts
│   │   │   └── north-star.ts
│   │   └── ui/                    # WM components
│   │       ├── wm-container.ts
│   │       ├── wm-tab.ts
│   │       ├── context-panel.ts
│   │       └── all-workorders.ts
│   ├── tests/
│   └── README.md
│
├── openclaw-upstream/             # 📚 Reference: Original OpenClaw
│   └── (cloned from github.com/openclaw/openclaw)
│       # READ-ONLY REFERENCE - Do not modify
│
├── docs/                          # 📖 Project documentation (INDEX)
│   ├── README.md                  # Documentation index & navigation
│   ├── 00-research/               # 🔬 Research documents (what could we do?)
│   ├── 01-specs/                  # 📋 Specifications (what will we build?)
│   └── 02-dev-plans/              # 📅 Development plans (how do we build it?)
│
├── .gitignore                     # For openclaw-snapper repo
├── AGENTS.md                      # This file
└── DEVELOPMENT_ENVIRONMENT.md     # Setup instructions
```

### Repository Boundaries

| Directory | Type | Git Remote | Purpose |
|-----------|------|------------|---------|
| `openclaw-snapper/` | **Active Repo** | `github.com/you/openclaw-snapper` | SnApper Core platform |
| `openclaw-workorders/` | **Future Repo** | `github.com/you/openclaw-workorders` | Workorder Manager SnApp |
| `openclaw-upstream/` | **Reference** | `github.com/openclaw/openclaw` | Original OpenClaw (read-only) |
| `docs/` | **Documentation** | N/A | Project docs (not code) |

---

## 🗂️ Core Folders & Files

### SnApper Core (`/openclaw-snapper/`)

| Path | Purpose | Status |
|------|---------|--------|
| `/openclaw-snapper/src/snapper/core/` | Core services | 📝 To implement |
| `/openclaw-snapper/src/snapper/ui/` | SnApper UI components | 📝 To implement |
| `/openclaw-snapper/src/snapper/types/` | TypeScript definitions | 📝 To implement |
| `/openclaw-snapper/tests/` | Unit and integration tests | 📝 To implement |

### Workorder Manager (`/openclaw-workorders/`)

| Path | Purpose | Status |
|------|---------|--------|
| `/openclaw-workorders/src/core/` | WM business logic | 📝 To implement |
| `/openclaw-workorders/src/ui/` | WM Lit components | 📝 To implement |
| `/openclaw-workorders/snap.json` | SnApp manifest | ✅ Created |

### Documentation (`/docs/`)

> **⚠️ POLICY:** All documentation MUST reside in `/home/devuser/shared-workspace/projects/openclaw-redux/docs/`
> 
> NO `docs/` folders in `openclaw-snapper/` or `openclaw-workorders/` until projects are in stable, working, functional order.
> 
> ✅ Standard `README.md` files are allowed and required in repo folders.

#### Documentation Hierarchy (The Three Questions)

| Layer | Folder | Question | Purpose | Status |
|-------|--------|----------|---------|--------|
| **Research** | `00-research/` | **"What could we do?"** | Explore possibilities, evaluate approaches, document findings | 🔬 Active |
| **Specs** | `01-specs/` | **"What will we build?"** | Concrete specifications derived from research | 📋 Active |
| **Dev Plans** | `02-dev-plans/` | **"How do we build it?"** | Bite-sized, actionable implementation plans | 📅 Active |

**Audit Requirement:** Each layer must fit the layer above it:
- All `specs` must align with `research`
- All `dev_plans` must implement the `specs`
- **Periodic audits are MANDATORY** — never let documentation drift

#### Numbered Folder Structure

```
docs/
├── README.md                      # Documentation index
│
├── 00-research/                   # 🔬 Research (what could we do?)
│   ├── README.md                  # Research index
│   ├── 01-snapper-architecture/   # Research on SnApper platform
│   │   ├── README.md              # Findings summary
│   │   ├── meta-tab-systems.md    # Research on meta-tabs
│   │   └── lifecycle-patterns.md  # Research on lifecycle management
│   ├── 02-workorder-management/   # Research on workorder concepts
│   │   ├── README.md
│   │   ├── checkpoint-research.md
│   │   └── sandbox-approaches.md
│   └── 99-archive/                # Archived/outdated research
│
├── 01-specs/                      # 📋 Specifications (what will we build?)
│   ├── README.md                  # Specs index & audit trail
│   ├── 00-standards/              # Cross-cutting standards
│   │   ├── README.md
│   │   ├── api-standard.md        # SnApper API Standard v1.0
│   │   └── naming-conventions.md
│   ├── 01-snapper-core/           # SnApper Core specs
│   │   ├── README.md
│   │   ├── architecture.md
│   │   ├── manifest-format.md
│   │   └── lifecycle-spec.md
│   └── 02-workorder-manager/      # WM SnApp specs
│       ├── README.md
│       ├── data-models.md
│       ├── commands-spec.md
│       └── ui-spec.md
│
└── 02-dev-plans/                  # 📅 Development plans (how?)
    ├── README.md                  # Master development index
    ├── 00-planning/               # Planning documents
    │   ├── README.md
    │   ├── master-sequence.md     # Overall phase sequence
    │   └── dependency-graph.md    # Phase dependencies
    ├── 01-foundation/             # Group 01: Phases 1-2
    │   ├── README.md              # Group overview
    │   ├── phase-01-registry.md   # SnApp registry implementation
    │   ├── phase-02-lifecycle.md  # Lifecycle implementation
    │   └── phase-03-wm-models.md  # WM data models
    ├── 02-core-engine/            # Group 02: Phases 4-5
    │   ├── README.md
    │   ├── phase-04-state-service.md
    │   └── phase-05-sandbox.md
    └── 99-archive/                # Completed/outdated plans
```

**Dev Plan Requirements:**
1. **Token-sized phases** — Each phase measured in tokens (complexity), not time
2. **Clear entry/exit criteria** — What defines done for each phase
3. **Explicit dependencies** — What must be complete before starting
4. **Deliverables list** — Concrete outputs (files, tests, docs)
5. **Handoff notes** — What the next phase/group needs

### Reference (`/openclaw-upstream/`)

| Path | Purpose | Note |
|------|---------|------|
| `/openclaw-upstream/src/` | OpenClaw source (TypeScript) | Read-only reference |
| `/openclaw-upstream/ui/src/` | OpenClaw UI (Lit components) | Read-only reference |
| `/openclaw-upstream/extensions/` | Existing extensions | Pattern reference |

---

## 🗂️ Organizational Preferences

### Code Organization (openclaw-snapper)

```
openclaw-snapper/
├── src/
│   └── snapper/
│       ├── core/
│       │   ├── manager.ts         # SnAppManager - coordinates all SnApps
│       │   ├── registry.ts        # SnAppRegistry - discovers SnApps
│       │   ├── lifecycle.ts       # SnAppLifecycle - load/activate/suspend/unload
│       │   ├── api.ts             # SnAppApiImpl - API implementation
│       │   ├── hooks.ts           # HookService - event system
│       │   ├── bus.ts             # MessageBusService - inter-SnApp comms
│       │   ├── state.ts           # StateService - persistence
│       │   └── sandbox.ts         # Sandbox - path validation
│       ├── ui/
│       │   ├── container.ts       # SnAppContainer - SnApp wrapper
│       │   └── tabs.ts            # SnApp tab rendering utilities
│       ├── types/
│       │   └── index.ts           # Public TypeScript types
│       └── index.ts               # Public exports
└── tests/
    ├── core/                      # Core service tests
    └── ui/                        # UI component tests
```

### Code Organization (openclaw-workorders)

```
openclaw-workorders/
├── snap.json                      # SnApp manifest
├── index.ts                       # Entry point / factory function
├── src/
│   ├── types/
│   │   └── index.ts               # WM-specific types
│   ├── core/
│   │   ├── manager.ts             # WorkorderManager
│   │   ├── registry.ts            # YAML registry
│   │   ├── checkpoint.ts          # State persistence
│   │   ├── sandbox.ts             # Path validation
│   │   └── north-star.ts          # NorthStar validator
│   ├── ui/
│   │   ├── wm-container.ts        # Main WM container
│   │   ├── wm-tab.ts              # Workorder tab
│   │   ├── context-panel.ts       # North-star panel
│   │   └── all-workorders.ts      # List view
│   └── commands.ts                # /wo command handlers
└── tests/
```

### Naming Conventions

| Category | Convention | Example |
|----------|------------|---------|
| SnApper system | PascalCase | `SnApper Core`, `SnApp Manager` |
| SnApp IDs | kebab-case | `workorder-manager`, `kanban-board` |
| Files | kebab-case | `snapp-manager.ts`, `workorder-tab.ts` |
| Components | PascalCase | `WorkorderTab`, `ContextPanel` |
| Types/Interfaces | PascalCase | `SnAppApi`, `WorkorderState` |
| Constants | UPPER_SNAKE_CASE | `SNAPPER_VERSION` |

---

## 📊 Token-Based Estimation

### Principle: Measure Complexity, Not Time

All effort is estimated in **tokens**, not hours or days. This reflects the actual complexity and scope of work rather than time, which varies based on context switching, interruptions, and productivity.

### Token Scale

| Token Range | Complexity | Typical Scope |
|-------------|------------|---------------|
| **~1K** | Simple | Single function, type definition, small fix |
| **~2K** | Standard | Service class with tests, data model, simple component |
| **~4K** | Complex | Multi-file feature, integration point, complex UI |
| **~8K** | Major | Large subsystem, significant architectural piece |
| **~16K+** | Epic | Major feature spanning multiple systems |

### Phase Guidelines

Each phase should target **~2K tokens** (standard complexity). This ensures:
- Clear, completable scope
- Well-defined deliverables
- Easy review and handoff
- Predictable progress tracking

### Token Calculation Factors

| Factor | Weight | Example |
|--------|--------|---------|
| Lines of code (new) | 1 token per 3-5 lines | 500 LOC = ~100-150 tokens |
| Test coverage | +30% of implementation | Implementation 100 tokens → Tests 30 tokens |
| Documentation | +10% of implementation | Implementation 100 tokens → Docs 10 tokens |
| Integration complexity | ×1.5 to ×3 | Simple integration ×1.5, complex ×3 |
| Research/exploration | Fixed 100-500 tokens | Depending on depth needed |

### Example Calculations

**Phase 1.1: SnApp Registry (~2K tokens)**
```
Type definitions (types/index.ts)     ~150 tokens
SnAppRegistry class implementation    ~400 tokens
Manifest validation logic             ~200 tokens
Unit tests (registry.test.ts)         ~400 tokens (30% of impl)
Error handling                       ~150 tokens
Documentation                        ~150 tokens
Integration considerations           ~200 tokens
Buffer for iteration                 ~350 tokens
─────────────────────────────────────────────────
Total                                ~2000 tokens (~2K)
```

**Phase 3.2: Checkpoint System (~4K tokens)**
```
Checkpoint data models               ~300 tokens
Serialization logic                  ~800 tokens
Compression handling                 ~400 tokens
Auto-save triggers                   ~600 tokens
Resume functionality                 ~800 tokens
Unit tests                          ~1200 tokens (30% of impl)
Documentation                        ~300 tokens
Edge cases (errors, corruption)      ~400 tokens
─────────────────────────────────────────────────
Total                                ~4800 tokens (~4K)
```

### Total Project Scope

| Group | Phases | Est. Tokens |
|-------|--------|-------------|
| 01-Foundation | 6 | ~12K |
| 02-Core-Engine | 5 | ~12K |
| 03-Interface | 5 | ~14K |
| 04-Polish | 5 | ~10K |
| **Total** | **21** | **~48K tokens** |

---

## 🚧 Development Roadmap

### Group 01: Foundation (~12K tokens)
**Goal:** SnApper Core and Workorder Manager foundation

| Phase | Focus | Est. Tokens | Deliverables |
|-------|-------|-------------|--------------|
| 1.1 | SnApp Registry | ~2K | `registry.ts`, manifest parser |
| 1.2 | Lifecycle Management | ~2K | `lifecycle.ts`, state machine |
| 1.3 | Core Services | ~2K | `hooks.ts`, `bus.ts`, `state.ts` |
| 1.4 | SnApp API Surface | ~2K | `api.ts` full implementation |
| 2.1 | WM Data Models | ~2K | TypeScript interfaces, validation |
| 2.2 | WM Registry | ~2K | YAML registry, CRUD operations |

### Group 02: Core Engine (~12K tokens)
**Goal:** State persistence, checkpointing, security

| Phase | Focus | Est. Tokens | Deliverables |
|-------|-------|-------------|--------------|
| 3.1 | State Persistence | ~2K | `state.ts` service, storage |
| 3.2 | Checkpoint System | ~4K | `checkpoint.ts`, save/restore |
| 3.3 | Auto-Checkpoint | ~2K | Triggers, compression |
| 4.1 | Path Sandbox | ~2K | `sandbox.ts`, validation |
| 4.2 | Security Logging | ~2K | `security-log.ts`, audit trail |

### Group 03: Interface Layer (~14K tokens)
**Goal:** Commands and two-layer tabbed UI

| Phase | Focus | Est. Tokens | Deliverables |
|-------|-------|-------------|--------------|
| 5.1 | Command System | ~4K | `/wo` commands, handlers |
| 5.2 | Session Hooks | ~2K | Lifecycle integration |
| 6.1 | SnApp Container | ~2K | `container.ts`, rendering |
| 6.2 | WM UI Components | ~4K | Tabs, context panel, lists |
| 6.3 | OpenClaw Integration | ~2K | `navigation.ts` mods |

### Group 04: Advanced & Polish (~10K tokens)
**Goal:** Rewind, final integration, production ready

| Phase | Focus | Est. Tokens | Deliverables |
|-------|-------|-------------|--------------|
| 7.1 | Branch Data Model | ~2K | `branch.ts`, storage |
| 7.2 | Rewind UI | ~2K | Timeline visualization |
| 8.1 | Final Integration | ~4K | Full stack testing |
| 8.2 | Documentation | ~2K | User guide, API docs |
| 8.3 | Polish | ~2K | Performance, error handling |

---

## ✅ TODO Checklist

**Last Updated:** 2026-02-24
**Current Status:** Group 01 Foundation complete (5/21 phases), Group 02 in progress
**Tests Passing:** 165

---

### Documentation ✅

- [x] Create new numbered folder structure (`00-research/`, `01-specs/`, `02-dev-plans/`)
- [x] Migrate research documents → `docs/00-research/`
- [x] Rebuild specs → `docs/01-specs/` with audit trail
- [x] Rebuild dev plans → `docs/02-dev-plans/` as bite-sized phases
- [x] Update `docs/README.md` with new navigation
- [ ] Archive old structure (`docs/research/`, `docs/specs/`, `docs/plans/`)
- [x] Update `AGENTS.md` with audit requirements
- [x] Rewrite `VISION.md` for SnApper platform (not OpenClaw)

---

### Group 01: Foundation (~12K tokens) ✅ COMPLETE

| Phase | Status | Tests |
|-------|--------|-------|
| 1.1 SnApp Registry | ✅ DONE | 29 |
| 1.2 Lifecycle Management | ✅ DONE | 32 |
| 1.3 Core Services | ✅ DONE | 38 |
| 1.4 SnApp API Surface | ✅ DONE | 40 |
| 2.1 WM Data Models | 📝 DEV PLAN WRITTEN | - |
| 2.2 WM Registry | 📝 DEV PLAN WRITTEN | - |
| 2.3 WM Entry Point | 📝 DEV PLAN WRITTEN | - |

**Group 01 Total: 139 tests passing**

---

### Group 02: Core Engine (~12K tokens) 🚧 IN PROGRESS

| Phase | Status | Tests |
|-------|--------|-------|
| 3.1 State Persistence | ✅ DONE | 40 (14 basic + 26 enhanced) |
| 3.2 Checkpoint System | 📝 DEV PLAN WRITTEN | - |
| 3.3 Auto-Checkpoint | 📝 DEV PLAN WRITTEN | - |
| 4.1 Path Sandbox | 📝 DEV PLAN WRITTEN | - |
| 4.2 Security Logging | 📝 DEV PLAN WRITTEN | - |

**Deliverables:**
- [x] FileStateService with TTL, encryption, namespaces
- [ ] Checkpoint save/restore (Phase 3.2)
- [ ] Auto-save triggers (Phase 3.3)
- [ ] Path sandbox validation (Phase 4.1)
- [ ] Security audit logging (Phase 4.2)

---

### Group 03: Interface Layer (~14K tokens) 📋 PLANNED

| Phase | Status | Tests |
|-------|--------|-------|
| 5.1 Command System | 📝 DEV PLAN WRITTEN | - |
| 5.2 Session Hooks | 📝 DEV PLAN WRITTEN | - |
| 6.1 SnApp Container | 📝 DEV PLAN WRITTEN | - |
| 6.2 WM UI Components | 📝 DEV PLAN WRITTEN | - |
| 6.3 OpenClaw Integration | 📝 DEV PLAN WRITTEN | - |

**Deliverables:**
- [ ] `/wo` command handlers
- [ ] Session lifecycle integration
- [ ] SnApp Container UI component
- [ ] WM tab/panel components
- [ ] OpenClaw navigation modifications

---

### Group 04: Advanced & Polish (~10K tokens) 📋 PLANNED

| Phase | Status | Tests |
|-------|--------|-------|
| 7.1 Branch Data Model | 📝 **DEV PLAN NOT WRITTEN** | - |
| 7.2 Rewind UI | 📝 **DEV PLAN NOT WRITTEN** | - |
| 8.1 Final Integration | 📝 **DEV PLAN NOT WRITTEN** | - |
| 8.2 Documentation | 📝 **DEV PLAN NOT WRITTEN** | - |
| 8.3 Polish | 📝 **DEV PLAN NOT WRITTEN** | - |

**Action Required:** Write dev plans for Group 04 phases

---

### Summary

| Group | Phases | Status | Written | Done |
|-------|--------|--------|---------|------|
| 01-Foundation | 6 | ✅ Complete | 6/6 | 4/6 (WM in separate repo) |
| 02-Core-Engine | 5 | 🚧 In Progress | 5/5 | 1/5 |
| 03-Interface | 5 | 📋 Planned | 5/5 | 0/5 |
| 04-Polish | 5 | 📋 Planned | **0/5** ⚠️ | 0/5 |
| **Total** | **21** | | **16/21** | **5/21** |

**Next Immediate Tasks:**
1. Phase 3.2: Checkpoint System (written, ready to implement)
2. Write dev plans for Group 04 (5 phases missing)
3. Phase 3.3: Auto-Checkpoint
4. Phase 4.1: Path Sandbox

---

## 🔗 Quick References

### OpenClaw Upstream (Reference)

| File | Path | Purpose |
|------|------|---------|
| UI App | `openclaw-upstream/ui/src/ui/app.ts` | Main UI component |
| Navigation | `openclaw-upstream/ui/src/ui/navigation.ts` | Tab definitions |
| App Render | `openclaw-upstream/ui/src/ui/app-render.ts` | Tab rendering |

### SnApper Key Files (To Create)

| File | Path | Purpose |
|------|------|---------|
| SnApper Core | `openclaw-snapper/src/snapper/core/manager.ts` | SnApp lifecycle |
| SnApp Registry | `openclaw-snapper/src/snapper/core/registry.ts` | Discovery |
| SnApp API | `openclaw-snapper/src/snapper/core/api.ts` | API surface |
| Hook Service | `openclaw-snapper/src/snapper/core/hooks.ts` | Event system |
| Message Bus | `openclaw-snapper/src/snapper/core/bus.ts` | Inter-SnApp comms |
| WM Entry | `openclaw-workorders/index.ts` | WM SnApp entry |
| WM Core | `openclaw-workorders/src/core/manager.ts` | WM logic |

---

## 💬 Communication

### Key Terms

- **SnApper** — The platform (this project)
- **SnApp** — An individual app (Workorder Manager, etc.)
- **SnApper Core** — The framework/manager
- **Workorder Manager** — First SnApp, often abbreviated "WM"
- **Upstream** — Original OpenClaw repository (reference only)

### When Making Changes

1. **Research Phase:**
   - Document in `docs/00-research/[topic]/`
   - Link related findings
   - Summarize in `README.md`

2. **Specification Phase:**
   - Document in `docs/01-specs/[component]/`
   - Link to supporting research
   - Version the specification

3. **Development Phase:**
   - Document in `docs/02-dev-plans/[group]/`
   - Reference spec requirements
   - Define exit criteria

4. **Implementation:**
   - Work in appropriate repo (`openclaw-snapper` or `openclaw-workorders`)
   - Follow the dev plan
   - Update plan with `[DONE: YYYY-MM-DD]` markers

5. **Audit:**
   - Run audit checklist after each phase
   - Document findings
   - Fix misalignments immediately

6. **Commit:**
   - Use conventional commits (`feat:`, `fix:`, `docs:`)
   - Reference documentation updates
   - Link to dev plan phase

---

## 🔍 Documentation Audit Process

### Mandatory Audits

**Audit Triggers:**
- After completing any research → spec → dev_plan phase
- Before starting a new development group
- When adding new features to existing specs
- Weekly during active development

**Audit Checklist:**

```markdown
## Audit: [Date] — [Scope]

### Research → Spec Alignment
- [ ] All spec claims have research backing
- [ ] Research findings are accurately represented
- [ ] No speculation in specs (only documented findings)

### Spec → Dev Plan Alignment  
- [ ] Every spec requirement has implementation plan
- [ ] Dev plan deliverables satisfy spec criteria
- [ ] No orphaned specs (unimplemented requirements)

### Dev Plan → Code Alignment
- [ ] Implementation matches plan
- [ ] Tests cover plan requirements
- [ ] Documentation updated for changes

### Findings:
- [List any gaps, inconsistencies, or required updates]

### Action Items:
- [ ] [Specific task with owner]
- [ ] [Specific task with owner]
```

### Documentation Update Rules

1. **Research Updates:**
   - Append new findings, never delete old
   - Mark superseded findings with `[SUPERSEDED: YYYY-MM-DD]`
   - Link to specs that depend on the research

2. **Spec Updates:**
   - Version specs (v1.0, v1.1, v2.0)
   - Document breaking changes
   - Update dependent dev plans

3. **Dev Plan Updates:**
   - Mark completed phases with `[DONE: YYYY-MM-DD]`
   - Move outdated plans to `99-archive/`
   - Link to implemented code commits

---

## 📋 Git Workflow

### Current Repo: openclaw-snapper

```bash
cd /home/devuser/shared-workspace/projects/openclaw-redux/openclaw-snapper

# Initialize repo (first time)
git init
git remote add origin https://github.com/YOUR_USERNAME/openclaw-snapper.git

# Daily workflow
git add .
git commit -m "feat: implement SnApp registry"
git push origin main
```

### Future Repo: openclaw-workorders

```bash
cd /home/devuser/shared-workspace/projects/openclaw-redux/openclaw-workorders

# Initialize repo (when ready)
git init
git remote add origin https://github.com/YOUR_USERNAME/openclaw-workorders.git
```

---

**Remember: The TODO list above must be kept current. Check off items as completed, add new items as discovered.**
