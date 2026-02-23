# OpenClaw SnApper Core

> Transform OpenClaw into a multi-app workspace platform — an **agentic OS** where the OpenClaw agent controls, manages, and interacts with tab-apps (SnApps)

**Status:** In Development  
**Version:** 0.1.0

---

## What is SnApper?

**SnApper** = Apps that **Snap** into OpenCl**aw**

SnApper is a meta-tab system that transforms OpenClaw from a single-session chat interface into a **multi-app workspace platform** — effectively an **agentic OS**. Each SnApp (Snap-in Application) runs as a first-class application within OpenClaw, with its own UI, state management, and lifecycle. The OpenClaw agent can control, manage, and interact with these SnApps, extending its capabilities through specialized tab-apps.

### Visual Concept

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🤖 Chat]  [📊 Overview]  [📋 WM ▼]  [⚙️ Settings]  [+]                │
│                            │                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Workorder Manager (WM) SnApp — First-class tab experience     │   │
│  │  [📋 ProjectA ✕]  [📋 ProjectB ✕]  [+]  [⋯]                    │   │
│  │                                                                  │   │
│  │  ┌────────────────────────┐  ┌──────────────────────────┐      │   │
│  │  │ Chat Interface         │  │ Context Panel            │      │   │
│  │  │                        │  │ ┌──────────────────────┐ │      │   │
│  │  │ User: "Implement auth" │  │ │ NORTH-STAR           │ │      │   │
│  │  │ Agent: "I'll help..."  │  │ │ Build auth system    │ │      │   │
│  │  │                        │  │ │ [✓] Design [⟳] Build │ │      │   │
│  │  └────────────────────────┘  └──────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **🧩 SnApp System** — Apps that snap into OpenClaw as first-class citizens
- **🔄 Lifecycle Management** — Load, activate, suspend, unload SnApps seamlessly
- **📡 Event Hooks** — SnApps participate in OpenClaw's session lifecycle
- **💬 Inter-SnApp Communication** — Message bus for SnApps to talk to each other
- **🎨 UI Integration** — Two-layer tab system: Classic + SnApps

---

## Getting Started

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SnApper Core                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Registry   │  │   Lifecycle  │  │     API      │          │
│  │              │  │              │  │   Surface    │          │
│  │ - Discovery  │  │ - Load       │  │ - Hooks      │          │
│  │ - Metadata   │  │ - Activate   │  │ - Tools      │          │
│  │ - Config     │  │ - Suspend    │  │ - Context    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     UI       │  │    State     │  │     Bus      │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
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

## Creating a SnApp

```typescript
// index.ts
import type { SnAppApi, LifecycleApi } from '@openclaw/snapper';

export default async function createMySnApp(api: SnAppApi): Promise<LifecycleApi> {
  // Register a tab
  api.registerTab({
    id: 'main',
    label: 'My SnApp',
    component: 'my-snapp-main'
  });
  
  // Register a command
  api.registerCommand({
    name: 'hello',
    description: 'Say hello',
    handler: () => api.showToast({ message: 'Hello!', type: 'success' })
  });
  
  return {
    async onActivate() { /* SnApp becomes visible */ },
    async onSuspend() { /* SnApp hidden */ },
    async onDestroy() { /* Cleanup */ }
  };
}
```

---

## Project Structure

```
openclaw-snapper/
├── src/
│   └── snapper/
│       ├── core/          # Core services (registry, lifecycle, api)
│       ├── ui/            # UI components (container, tabs)
│       └── types/         # TypeScript definitions
└── tests/                 # Unit and integration tests
```

---

## Related Projects

- [OpenClaw](https://github.com/openclaw/openclaw) — The base platform we extend
- [Workorder Manager](https://github.com/PhilosopherRex/openclaw-workorders) — First SnApp built on this platform (separate repository)

---

## License

MIT

---

# 🦞 OpenClaw — Personal AI Assistant

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text-dark.png">
        <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text.png" alt="OpenClaw" width="500">
    </picture>
</p>

<p align="center">
  <strong>EXFOLIATE! EXFOLIATE!</strong>
</p>

<p align="center">
  <a href="https://github.com/openclaw/openclaw/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/openclaw/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/openclaw/openclaw/releases"><img src="https://img.shields.io/github/v/release/openclaw/openclaw?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**OpenClaw** is a _personal AI assistant_ you run on your own devices.
It answers you on the channels you already use (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat), plus extension channels like BlueBubbles, Matrix, Zalo, and Zalo Personal. It can speak and listen on macOS/iOS/Android, and can render a live Canvas you control. The Gateway is just the control plane — the product is the assistant.

If you want a personal, single-user assistant that feels local, fast, and always-on, this is it.

[Website](https://openclaw.ai) · [Docs](https://docs.openclaw.ai) · [Vision](VISION.md) · [DeepWiki](https://deepwiki.com/openclaw/openclaw) · [Getting Started](https://docs.openclaw.ai/start/getting-started) · [Updating](https://docs.openclaw.ai/install/updating) · [Showcase](https://docs.openclaw.ai/start/showcase) · [FAQ](https://docs.openclaw.ai/start/faq) · [Wizard](https://docs.openclaw.ai/start/wizard) · [Nix](https://github.com/openclaw/nix-openclaw) · [Docker](https://docs.openclaw.ai/install/docker) · [Discord](https://discord.gg/clawd)

Preferred setup: run the onboarding wizard (`openclaw onboard`) in your terminal.
The wizard guides you step by step through setting up the gateway, workspace, channels, and skills. The CLI wizard is the recommended path and works on **macOS, Linux, and Windows (via WSL2; strongly recommended)**.
Works with npm, pnpm, or bun.
New install? Start here: [Getting started](https://docs.openclaw.ai/start/getting-started)

## Sponsors

| OpenAI                                                            | Blacksmith                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [![OpenAI](docs/assets/sponsors/openai.svg)](https://openai.com/) | [![Blacksmith](docs/assets/sponsors/blacksmith.svg)](https://blacksmith.sh/) |

**Subscriptions (OAuth):**

- **[Anthropic](https://www.anthropic.com/)** (Claude Pro/Max)
- **[OpenAI](https://openai.com/)** (ChatGPT/Codex)

Model note: while any model is supported, I strongly recommend **Anthropic Pro/Max (100/200) + Opus 4.6** for long‑context strength and better prompt‑injection resistance. See [Onboarding](https://docs.openclaw.ai/start/onboarding).

## Models (selection + auth)

- Models config + CLI: [Models](https://docs.openclaw.ai/concepts/models)
- Auth profile rotation (OAuth vs API keys) + fallbacks: [Model failover](https://docs.openclaw.ai/concepts/model-failover)
