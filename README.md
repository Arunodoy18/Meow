# 🐱 Meow AI - Your AI Developer Copilot

**Production-ready Chrome Extension with zero-setup architecture**

Meow AI is an intelligent Chrome extension that provides context-aware AI assistance for developers and professionals. No API keys, no configuration—just install and use!

## ✨ Features

### 🎯 Smart Context Detection
Automatically detects what you're doing and adapts its analysis:

- **📝 PR Reviews**: Expert-level code review feedback on GitHub Pull Requests
- **💼 Job Analysis**: Career advice and job posting insights on LinkedIn
- **🧮 LeetCode Problems**: Algorithm explanations and solution approaches
- **📚 Learning Mode**: Video/article summaries on YouTube and educational sites
- **💻 GitHub Analysis**: Repository and code analysis
- **🌐 General Insights**: Smart analysis of any webpage

### 💬 Side Chat Panel
- Click the Meow AI toggle button on any webpage
- Chat with AI about the current page
- Maintains conversation context
- Remembers recent discussion

### 🔐 Enterprise-Grade Security
- **Backend Proxy**: Cloudflare Workers serverless architecture
- **Encrypted Secrets**: API keys stored as AES-256 encrypted environment variables
- **Zero Exposure**: Users never see or handle API keys
- **HTTPS Only**: All requests encrypted end-to-end

## 🚀 Installation

### For Users (Zero Setup!)

1. Download the extension
2. Install in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Drag and drop the extension folder
3. Start using:
   - Click the 🐱 icon to analyze any page
   - Click the toggle button on any webpage to start chatting

**That's it! No API keys, no configuration needed!**

### For Developers

See [backend/README.md](backend/README.md) for backend deployment instructions.

## 📖 How to Use

### Quick Analysis
1. Visit any webpage (GitHub, LeetCode, LinkedIn, etc.)
2. Click the **Meow AI** extension icon
3. Click **"Explain This Page"**
4. Get instant AI-powered insights!

### Chat Mode
1. Visit any webpage
2. Click the **Meow AI toggle button** (appears on page)
3. Type your question
4. Chat naturally about the page content

## 🏗️ Architecture

```
┌──────────────────────────┐
│   Chrome Extension       │
│   (Frontend - No Keys)   │
└───────────┬──────────────┘
            │ HTTPS
            ↓
┌──────────────────────────┐
│  Cloudflare Workers      │
│  (Backend Proxy)         │
│  🔐 Encrypted API Key    │
└───────────┬──────────────┘
            │ HTTPS + Bearer
            ↓
┌──────────────────────────┐
│  Hugging Face API        │
│  (Mistral-7B-Instruct)   │
└──────────────────────────┘
```

## 🔒 Security & Privacy

- **❌ No API keys** in extension code
- **❌ No conversation history** stored
- **❌ No personal data** collected
- **✅ API key** stored as encrypted Cloudflare secret

## 📊 Performance

- **Backend latency:** <200ms (global CDN)
- **AI response time:** 2-30 seconds
- **Scalability:** Millions of requests/day

## 💰 Cost

**For Users:** FREE - No charges, no API keys needed!

**For Developers:** $0/month (Cloudflare + Hugging Face free tiers)

---

**Made with 🐱 and ❤️**

**Version:** 1.0.0  
**Backend:** https://meow-ai-backend.meow-ai-arunodoy.workers.dev  
**Status:** ✅ Production Ready
