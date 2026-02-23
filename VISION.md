# SnApper Vision

SnApper transforms OpenClaw from a single-session chat interface into a **multi-app workspace platform** — an **agentic OS** where the OpenClaw agent controls, manages, and interacts with tab-apps (SnApps).

This document explains the vision and direction of the SnApper project.

---

## What is SnApper?

**SnApper** = Apps that **Snap** into OpenCl**aw**

SnApper is a meta-tab system that enables:

- **Multi-App Workspace**: Run multiple specialized apps within OpenClaw
- **First-Class SnApps**: Each SnApp has its own UI, state, and lifecycle
- **Agent Control**: The OpenClaw agent can control, manage, and interact with SnApps
- **Context Preservation**: Switch between SnApps without losing state
- **Extensibility**: Third-party developers can build SnApps

### The Core Insight

OpenClaw is a powerful personal AI assistant, but it's currently constrained to a single chat session. SnApper breaks this constraint by introducing:

1. **Two-Layer Tab System**: Classic OpenClaw tabs + SnApp tabs
2. **SnApp Lifecycle**: Load, activate, suspend, unload with full state management
3. **Inter-SnApp Communication**: Message bus for coordination
4. **Session Persistence**: Checkpoint and resume work across sessions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      OpenClaw + SnApper                         │
├─────────────────────────────────────────────────────────────────┤
│  [🤖 Chat]  [📊 Overview]  [📋 WM ▼]  [⚙️ Settings]  [+]        │
│                            │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SnApp Container (Two-layer tabs)                      │   │
│  │  [📋 ProjectA ✕]  [📋 ProjectB ✕]  [+]  [⋯]            │   │
│  │                                                          │   │
│  │  ┌────────────────────────┐  ┌──────────────────────┐   │   │
│  │  │ Chat Interface         │  │ Context Panel        │   │   │
│  │  │                        │  │ ┌──────────────────┐ │   │   │
│  │  │ User: "Implement auth" │  │ │ NORTH-STAR       │ │   │   │
│  │  │ Agent: "I'll help..."  │  │ │ Build auth system│ │   │   │
│  │  │                        │  │ │ [✓] [⟳] [ ]     │ │   │   │
│  │  └────────────────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Workorder     │    │  Your SnApp   │    │  Future       │
│ Manager       │    │    Here       │    │  SnApp 3      │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Current Focus

**Group 01: Foundation** ✅ COMPLETE
- SnApp Registry (discovery, validation)
- Lifecycle Management (state machine)
- Core Services (hooks, bus, state)
- API Surface (complete SnAppApi)

**Group 02: Core Engine** 🚧 IN PROGRESS
- State Persistence Service
- Checkpoint System (save/restore)
- Auto-Checkpoint (triggers, compression)
- Path Sandbox (security)
- Security Logging (audit trail)

**Group 03: Interface Layer** 📋 PLANNED
- Command System (/wo commands)
- Session Hooks (lifecycle integration)
- SnApp Container (UI rendering)
- WM UI Components (tabs, panels, lists)
- OpenClaw Integration (navigation mods)

**Group 04: Advanced & Polish** 📋 PLANNED
- Branch Data Model (rewind)
- Rewind UI (timeline visualization)
- Final Integration (full stack testing)
- Documentation & Polish

---

## SnApp Ecosystem

### Built-in SnApps

1. **Workorder Manager** — Project-bound goal-oriented development
   - Workorder registry (YAML-based)
   - Checkpoint management
   - North Star goal tracking
   - Sub-tab system for workorders

### Future SnApp Ideas

- **Kanban Board** — Visual task management
- **Code Explorer** — Navigate codebase with AI
- **Documentation Hub** — Manage project docs
- **Test Runner** — Visual test management
- **Deployment Dashboard** — Deploy and monitor

### Building a SnApp

```typescript
// index.ts
import type { SnAppApi, SnAppInstance } from '@openclaw/snapper';

export default async function createMySnApp(api: SnAppApi): Promise<SnAppInstance> {
  // Register a tab
  const tabId = api.registerTab({
    label: 'My SnApp',
    component: 'my-snapp-main'
  });
  
  // Register a command
  api.registerCommand({
    name: 'hello',
    description: 'Say hello',
    handler: () => {
      api.showToast({ message: 'Hello!', type: 'success' });
      return { success: true };
    }
  });
  
  // Subscribe to hooks
  api.onHook('session_start', async ({ sessionId }) => {
    api.logger.info('Session started:', sessionId);
  });
  
  return {
    async onActivate() { /* SnApp becomes visible */ },
    async onSuspend() { /* SnApp hidden */ },
    async onDestroy() { /* Cleanup */ }
  };
}
```

---

## Integration with OpenClaw

SnApper is a **platform layer** on top of OpenClaw:

- OpenClaw provides: AI models, channels, tools, skills
- SnApper provides: Multi-app workspace, SnApp lifecycle, state management
- Together: An agentic OS where the AI manages specialized apps

### Key Integration Points

1. **Navigation.ts** — Modified for SnApp tabs
2. **App-render.ts** — SnApp container rendering
3. **Session Management** — Hook into start/end
4. **Prompt Injection** — North Star context

---

## Security Model

SnApper inherits OpenClaw's security philosophy: **strong defaults without killing capability**.

Additional SnApper-specific security:

- **Permission System**: Each SnApp declares required permissions
- **Path Sandboxing**: SnApps can only access their own directories
- **Audit Logging**: All SnApp actions logged
- **Manifest Validation**: SnApp metadata verified before loading

---

## Project Structure

```
openclaw-snapper/
├── src/snapper/
│   ├── core/
│   │   ├── registry.ts      # SnApp discovery
│   │   ├── lifecycle.ts     # State machine
│   │   ├── hooks.ts         # Event routing
│   │   ├── bus.ts           # Message bus
│   │   ├── state.ts         # Persistence
│   │   └── api.ts           # SnApp API surface
│   ├── ui/                  # UI components (future)
│   └── types/
│       └── index.ts         # TypeScript definitions
└── test/snapper/            # Unit tests
```

---

## Contribution Guidelines

- One PR = one issue/topic
- PRs over ~5,000 lines reviewed only in exceptional circumstances
- Group related small fixes into focused PRs
- All code must have tests
- Follow existing TypeScript patterns

---

## Long-Term Vision

**The agentic OS**: A platform where AI agents and human users collaborate through specialized, stateful applications that snap into a unified workspace.

The OpenClaw agent becomes not just a chat assistant, but an **operating system** that:
- Manages running applications
- Preserves context across sessions  
- Orchestrates multi-step workflows
- Extends itself through SnApps

---

## Related Projects

- [OpenClaw](https://github.com/openclaw/openclaw) — The base AI assistant platform
- [Workorder Manager](https://github.com/PhilosopherRex/openclaw-workorders) — First SnApp (separate repo)

---

*Last Updated: 2026-02-24*
