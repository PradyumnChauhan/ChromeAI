# ChromeAI Studio

Your personal AI workspace that runs everywhere you browse. ChromeAI Studio adds an assistant bubble, a powerful sidebar, and context-aware actions for text selection, full‑page understanding, and voice.

## Inspiration
- Bring on‑device AI (Chrome Prompt API + Gemini Nano) to everyday browsing
- Reduce context friction: act on what you’re reading, selecting, or saying without copy/paste
- Be adaptable: student, developer, creator, or researcher modes with sensible defaults
- Make powerful AI safe-by-default in the browser UI (no copy of data off-page for on‑device flows)
- Design an assistant that augments, not interrupts, with lightweight UI that respects the page

## What it does
- Floating action bubble to open the Studio and quick actions
- Smart Sidebar for chat, tools, mentions, and settings
- Text‑selection menu with explain/rewrite/translate/summarize
- Whole‑page summarization with URL→Markdown and streaming output
- Voice assistant with MCP providers and optional autonomous agent mode
- Wake‑word and continuous conversation (when voice mode is enabled)
- Role modes change prompts and tool defaults per context (study/code/write/research)
- Cross‑tab sync prevents competing voice sessions; compact toasts show progress and errors
- Zero‑indent rendering and bullet collapsing keep results readable in narrow panels

## How we built it
- Chrome Extension (Manifest V3)
- Uses Chrome’s on‑device AI Prompt API via `ai/api-wrapper.js` and `services/ai-service.js`
- UI modules in `ui/*` (floating bubble, text selection, sidebar)
- Content extraction pipeline: readability + turndown + custom table converter
- Role modes stored in `localStorage` with cross‑tab sync
- Voice: Web Speech (STT/TTS) + MCP voice agent interface; user‑gesture gates for on‑device model setup
- Streaming architecture with throttled updates (~16ms) and final flush
- Defensive URL→Markdown with per‑site guards; fallback to plain text when needed
- Strict sanitization pass (link pruning, bullet flattening, overflow control)

## Challenges we ran into
- On‑device AI components require a user gesture during initial download/setup
- Complex DOMs (news, app UIs) can break naïve HTML→Markdown; we added guards and fallbacks
- Streaming UX in the sidebar while keeping layout stable and readable
- Wake‑word + STT coordination without echo/duplication during TTS
- Handling mixed stream chunk types (strings vs Uint8Array) in a single decoder path
- Keeping CSS from the host page from bleeding into sidebar components

## Accomplishments that we're proud of
- Reusable AI Manager with streaming + non‑streaming paths
- Fast, readable summaries with paragraph‑first style for small pages
- Robust voice flow: MCP first, Chrome AI fallback, then extension AI
- Clean, minimal sidebar rendering with bullet flattening and zero‑indent lists
- Gesture‑gate utility that transparently retries model creation after a single click
- Modular UI that works on most sites without layout collisions

## What we learned
- Always prepare a gesture fallback for Prompt API creation
- Do HTML→Markdown defensively and keep a plain‑text extraction fallback
- Stream early and often; throttle UI updates for smoothness
- Small formatting fixes (bullets, links, line‑wrap) dramatically improve perceived quality
- Explicit error taxonomy → clearer UX: permission vs availability vs network vs model

## What’s next for ChromeAI Studio
- More MCP tools, richer sidebar apps, multi‑page research sessions
- Per‑site tuning for better summary structure and link selection

---

## Technical Details

### 1) Text Selection Feature
Files: `ui/text-selection-menu-simple.js`, `apis/text-selection-menu.js`, `services/ai-service.js`
- Detects user selection; shows compact action menu
- Actions: Explain, Rewrite, Translate, Summarize; all stream to the sidebar
- Pipeline: selection → prompt (role/mode aware) → `aiManager.promptStreaming()` → sidebar UI
- Debounced and cancellable; sends structured events via `window.dispatchEvent('chromeai-action', …)`
- Context detection (`content/context-analyzer.js`) feeds mode‑specific prompts (student/developer/creator/researcher) and adjusts tone/format.
- Sanitization: bullet collapse + link pruning keeps output readable in compact containers.

### 2) Voice Assistant (MCP)
Files: `ai/mcp-voice-agent.js`, `ai/mcp-voice-interface.js`, `ui/floating-action-bubble.js`
- Tries MCP voice agent first: `mcpVoiceAgent.startConversation()` and `processVoiceInput()`
- Continuous listening with silence detection; concise TTS replies
- Handles interaction‑required events (user gesture for TTS) with a minimal popup
- Conversation lifecycle: wake word → MCP takeover → continuous STT → MCP reply → TTS → resume listening.
- Cross‑tab sync prevents multiple tabs from speaking at once and handles focus/visibility changes.

### 3) Voice Assistant (Autonomous Agent)
Files: `ai/browser-agent/*`
- Enhanced DOM extractor, action executor, memory, and progress UI
- Uses MCP voice interface as the conversation driver; falls back gracefully when unavailable
- Actions run against current page via safe DOM queries; agent progress UI annotates steps and failures.
- Conversation timeout (10s by default) ends idle sessions and restores wake‑word listening.

### 4) Sidebar
Files: `ui/sidebar-ui-old.js`, `ui/smart-sidebar-modular.js`, `apis/smart-sidebar.js`
- Message streaming: `addStreamingMessage()` → `updateStreamingMessage()` → `completeStreamingMessage()`
- Overflow‑safe, zero‑indent bullets, smaller font for dense content
- Mentions, settings, chat, and modular tool UIs
- Streaming architecture: `ReadableStream` → throttled 16ms updates; final flush on `done`.
- Errors are surfaced inline with retry suggestions; long messages chunk at ~600 chars to keep UI responsive.

### 5) Sidebar Mentions
Files: `ui/sidebar-mentions.js`
- Lightweight @mention parser for quick tool routing and context tagging
- Examples: `@translate fr`, `@summarize`, `@rewrite concise`; arguments parsed and passed to AI Manager.

### 6) Whole‑Page Summary
Files: `ui/floating-action-bubble.js`, `utils/url-to-markdown.js`, `utils/turndown.js`, `utils/html-table-converter.js`
- Try URL→Markdown first; fallback to readability/plain text
- Hierarchical summarization for large pages; paragraph‑first prompt for small pages
- Streams to sidebar when single‑chunk; sanitize + bullet collapse to keep layout tidy
- Edge handling: table converter wrapped in guards; failures degrade to plain text without stopping the flow.
- Short pages use a paragraph‑first prompt with ≤3 bullets; long pages use sectioned structure.

### AI Manager and Streaming
Files: `ai/api-wrapper.js`, `ai/ai-instance-manager.js`, `services/ai-service.js`
- Supports `prompt()` and `promptStreaming()`; converts streams to UI updates
- Gesture fallback for model creation when availability is `downloading`/`downloadable`
- Pre‑warm attempts are gated and retried after gesture
- Unified error taxonomy: permission, availability, network, and model errors map to UX toasts or inline messages.
- Type‑agnostic stream consumer accepts strings or Uint8Array chunks (TextDecoder).

### Permissions & Capabilities (Manifest)
File: `ChromeAI-Studio/manifest.json`
- Permissions: `activeTab`, `storage`, `scripting`, `sidePanel`, `contextMenus`, `tabs`
- Content scripts load core utils, AI modules, UI, and services at `document_end`
- Background service worker (`background/service-worker.js`) for menu, side panel, and lifecycle
- Commands:
  - Toggle sidebar: Ctrl+Shift+A (Cmd+Shift+A on macOS)
  - Quick action: Ctrl+Shift+Q (Cmd+Shift+Q on macOS)
- Web‑accessible resources: icons, assets, UI components/styles
- Minimum Chrome: 118
- On‑device AI requires enabling the Prompt API and Gemini Nano under chrome://flags on some channels.

### Modes
- Student: simplify, explain, generate quizzes
- Developer: code reasoning, reviews, concise technical guidance
- Creator: brainstorming, tone/style rewriting
- Researcher: fact‑checking, evidence‑oriented summaries
Mode is stored as `chromeai-active-mode` and broadcast via `window.postMessage` for cross‑tab coherence.

### User‑Gesture Handling
- Many Chrome AI constructors need a user activation when the model is `downloadable/downloading`.
- The UI presents a small one‑click prompt or defers initialization to the next click/keydown.
- All critical creations wrap in a gesture gate and retry seamlessly.

### Development
1) Load unpacked extension
2) Open DevTools → Console to watch `[AIManager]` logs
3) Test summaries on a few pages; confirm streaming and UI rendering
4) Voice mode: enable, grant mic permissions, try wake word (if enabled)

### Security & Privacy
- No remote calls are required for on‑device inference; when MCP/tools are used, their policies apply.
- Clipboard and mic access only on explicit user actions with clear UI affordances.

### Install & Run
1) Clone or download the project
2) Chrome → Extensions → Enable Developer mode → Load unpacked → select the project root
3) Toggle with the action button or Ctrl/Cmd+Shift+A


### Judge Testing Instructions
1) Load the extension, then visit any content‑heavy page.  
2) If prompted, click "Enable AI" once to satisfy the on‑device model user‑gesture requirement.  
3) Open the sidebar (toolbar icon or Ctrl/Cmd+Shift+A).  
4) Try:
   - Select text → Explain/Rewrite/Translate/Summarize (watch streaming).  
   - Floating bubble → Summary (single‑chunk pages stream live).  
   - Enable Voice Mode → grant mic permission → ask a question → hear concise TTS.  
5) If on Dev/Canary and the model is unavailable, enable flags in chrome://flags (Prompt API for Gemini Nano, Gemini Nano) and relaunch.  
6) Troubleshoot via toasts; most errors include a retry/setup button.


### Troubleshooting
- NotAllowedError (user gesture required): click once in the page or the "Enable AI" button; initialization will retry inside that gesture
- If URL→Markdown fails on complex sites, fallback text extraction is used automatically

### Project Structure (high‑level)
- `ui/` Floating bubble, selection menu, sidebar UI, styles
- `ai/` API wrapper, instance manager, modes, voice/mcp, agents
- `utils/` DOM, extraction, turndown, permission/settings, readability
- `services/` AI and UI orchestration
- `content/` Context analyzer and main bootstrap

---

## Roadmap
- Richer document understanding (tables/figures), better per‑site selectors
- Multi‑tab session memory and shareable summaries
- Pluggable tool marketplace for MCP integrations

---

## License
This project is licensed under the MIT License — see `LICENSE`.

### Third‑Party Assets and Credits
- Some animations/icons are sourced from LottieFiles and are used under their respective licenses.
  - LottieFiles: https://lottiefiles.com/
  - Please review the asset’s license/terms on its LottieFiles page before redistribution.


