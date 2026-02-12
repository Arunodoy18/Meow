# 🐱 Meow AI - Universal AI Developer Copilot

**Production-grade Chrome Extension — zero setup, context-aware, works everywhere**

Meow AI is a universal AI copilot for developers, tech learners, open-source contributors, and technical professionals. It operates seamlessly across all technical websites — GitHub, LeetCode, StackOverflow, LinkedIn, YouTube, documentation sites, research papers, and more. No API keys, no configuration — just install and use.

## ✨ Features

### 🎯 Universal Context Detection
Automatically detects what you're viewing and adapts its intelligence:

| Site Type | What Meow AI Does |
|---|---|
| **GitHub / GitLab PRs** | Senior-level code review with merge recommendations |
| **GitHub / GitLab repos & issues** | Architecture analysis, issue explanation, solution paths |
| **LeetCode / HackerRank / CodeChef / Codeforces** | Hint-first DSA tutoring with complexity analysis |
| **StackOverflow / StackExchange** | Cuts through noise, highlights real answers & caveats |
| **LinkedIn / Indeed / Glassdoor** | Career intelligence, skill gap analysis, prep strategy |
| **YouTube / Udemy / Coursera** | Key concept reinforcement, practical takeaways |
| **Medium / Dev.to / Hashnode / HN** | Critical analysis, actionable insights |
| **MDN / DevDocs / official docs** | Quick-start guidance, gotchas, edge cases |
| **arXiv / Google Scholar** | Plain-language research paper breakdowns |
| **Any technical page** | Smart structured analysis |

### 💬 Side Chat Panel
- Click the 🐱 toggle button on any webpage
- Chat with AI about the current page content
- Multi-turn conversation with memory
- Streaming responses with natural typing feel
- Quick actions: Explain, Summarize, Help

### 🧠 Smart Response Structure
Every response follows a structured format:
- **Summary** — What this is about
- **Key Tech Insight** — The core takeaway
- **Why This Matters** — Real-world significance
- **Potential Risks** — What could go wrong
- **Suggested Next Step** — Actionable follow-up

### 🎓 Hint-First Learning
When solving DSA problems, Meow AI gives **direction first** — full solutions only when you explicitly ask.

### 🔐 Security & Privacy
- **Zero setup** — No API keys needed from users
- **Backend proxy** — Cloudflare Workers serverless architecture
- **API keys secured server-side** — Never exposed to the client
- **No data stored** — Conversations are not persisted
- **No tracking** — No analytics, no telemetry
- **Open source** — Full transparency

## 🚀 Installation

### For Users (Zero Setup!)

1. Install from Chrome Web Store *(coming soon)* — or load manually:
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked** → select the extension folder
2. Start using:
   - Click the 🐱 icon to analyze any page
   - Click the toggle button on any page to open the chat panel
   - Press `Alt+M` to toggle the panel

**That's it! No API keys, no configuration needed.**

### For Developers

See [backend/README.md](backend/README.md) for backend deployment instructions.

## 📖 How to Use

### Quick Page Analysis (Popup)
1. Visit any technical webpage
2. Click the **Meow AI** extension icon
3. Click **"Explain This Page"**
4. Get instant AI-powered insights

### Chat Mode (Side Panel)
1. Visit any webpage
2. Click the **🐱 toggle button** (bottom-right corner)
3. Use quick actions or type your question
4. Chat naturally — Meow AI remembers the conversation context

### Keyboard Shortcut
- `Alt+M` — Toggle the chat panel on any page

## 🏗️ Architecture

```
┌──────────────────────────┐
│   Chrome Extension       │
│   (Frontend — No Keys)   │
│   Content Scripts + UI   │
└───────────┬──────────────┘
            │ HTTPS
            ↓
┌──────────────────────────┐
│  Cloudflare Workers      │
│  (Backend Proxy)         │
│  🔐 API Key server-side  │
└───────────┬──────────────┘
            │ HTTPS
            ↓
┌──────────────────────────┐
│  Google Gemini 2.5 Flash │
│  (AI Model)              │
└──────────────────────────┘
```

### Engine Architecture
| Engine | Module | Purpose |
|---|---|---|
| Stream Engine | `streamManager.js` | SSE streaming reliability |
| Memory Engine | `conversationMemory.js` | Multi-turn context window |
| Human Engine | `humanEngine.js` | Natural thinking delays & skill detection |
| Personality Engine | `personality.js` | Tone, system prompts, mode augmentation |

## 🎨 Design

**Neo Dev Dark** theme — premium dark UI optimized for developer tools:
- Background: `#0B0F14` / Panel: `#111827`
- Primary (green): `#22C55E` — send button, active states, highlights
- Secondary (blue): `#3B82F6` — hover, links
- Text: `#E5E7EB` / `#9CA3AF`

## 📊 Performance

- **Backend latency:** <200ms (Cloudflare global CDN)
- **AI response time:** 2–15 seconds (streaming)
- **Extension size:** <100KB
- **No background service worker** — zero idle resource usage

## 💰 Cost

**For Users:** FREE — No charges, no API keys needed.

**For Developers:** Minimal — Cloudflare Workers free tier (100K req/day) + Gemini API free tier.

## 📄 Privacy Policy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

---

**Made with 🐱 and ❤️**

**Version:** 3.1.0
**AI Model:** Google Gemini 2.5 Flash
**Backend:** Cloudflare Workers
**Status:** ✅ Production Ready
