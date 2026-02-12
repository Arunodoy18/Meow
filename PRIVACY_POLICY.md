# Privacy Policy — Meow AI

**Last updated:** February 11, 2026

## Overview

Meow AI ("the Extension") is a Chrome browser extension that provides AI-powered developer assistance. This privacy policy explains what data the Extension accesses, how it is used, and your rights.

## Data Collection

**Meow AI does NOT collect, store, or transmit any personal data.**

Specifically:

- **No account required** — No sign-up, no login, no personal identifiers.
- **No analytics or tracking** — No Google Analytics, no telemetry, no usage tracking.
- **No cookies** — The Extension does not set or read cookies.
- **No browsing history** — The Extension does not record or store your browsing history.
- **No conversation history stored** — Chat conversations exist only in your browser's memory during the active session and are cleared when the tab is closed or refreshed.

## Data Accessed During Use

When you explicitly interact with Meow AI (click "Explain This Page" or send a chat message), the Extension temporarily accesses:

1. **Page content** — The visible text content of the current webpage tab (up to 8,000 characters) is extracted locally in your browser.
2. **Page URL and title** — Used solely to detect the page type (e.g., GitHub PR, LeetCode problem) for context-aware responses.

This data is:
- Processed **locally in your browser** first.
- Sent to our **backend proxy server** (Cloudflare Workers) only when you initiate an AI request.
- Forwarded to **Google's Gemini API** for AI processing.
- **Never stored** on our servers — the backend is a stateless proxy.
- **Never shared** with any third party beyond the AI model provider (Google).

## Backend Server

The Extension communicates with a backend proxy hosted on Cloudflare Workers. This proxy:
- Attaches the AI API key server-side (so users never handle API keys).
- Forwards your request to Google's Gemini API.
- Returns the AI response to your browser.
- **Does not log, store, or retain** any request data.

## Permissions Explained

| Permission | Purpose |
|---|---|
| `activeTab` | Access the current tab's content when you click the extension |
| `scripting` | Inject the chat panel UI into web pages |
| `storage` | Save your preferences locally (e.g., button position, disabled sites) |
| `host_permissions: <all_urls>` | Allow the chat panel to work on any website |

## Third-Party Services

- **Cloudflare Workers** — Stateless backend proxy. [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/)
- **Google Gemini API** — AI model provider. [Google AI Privacy](https://ai.google.dev/gemini-api/terms)

## Children's Privacy

Meow AI is not directed at children under 13 and does not knowingly collect data from children.

## Changes to This Policy

If this policy changes, the updated version will be published in this repository with a new "Last updated" date.

## Contact

For questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/ArunodoyBhowmik/Meow).

---

**Summary: Meow AI accesses page content only when you ask it to, sends it through a stateless proxy to an AI model, and stores nothing.**
