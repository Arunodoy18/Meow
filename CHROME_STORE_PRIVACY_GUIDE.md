# Chrome Web Store Privacy Tab - Complete Guide

## 📋 Section 1: Single Purpose

**Single purpose description** (Required - 0/1,000 characters)
```
Meow AI provides AI-powered assistance for developers while browsing technical websites. It analyzes webpage content to offer context-aware insights, code reviews, problem-solving guidance, and intelligent explanations across GitHub, LeetCode, Stack Overflow, documentation sites, and other technical platforms.
```

---

## 🔐 Section 2: Permission Justifications

### **activeTab justification** (Required - 0/1,000 characters)
```
The activeTab permission is required to read the content of the current webpage when the user explicitly activates the extension (by clicking the extension icon or pressing Alt+M). This allows the extension to analyze the technical content (code, documentation, problems) and provide relevant AI assistance based on what the user is viewing.
```

### **Scripting justification** (Required - 0/1,000 characters)
```
The scripting permission is necessary to inject the chat panel UI and page analysis functionality into webpages. This enables the extension to display the interactive AI chat interface as a side panel on any webpage and extract technical content for analysis, providing users with contextual assistance without leaving their current page.
```

### **Storage justification** (Required - 0/1,000 characters)
```
The storage permission is used to save user preferences (such as chat panel position and size) and maintain conversation history during the browsing session. This ensures a consistent user experience across page navigations and allows users to continue conversations without losing context. No personal data is stored permanently.
```

### **Host permission justification** (Required - 0/1,000 characters)
```
The <all_urls> host permission enables the extension to work universally across all technical websites (GitHub, GitLab, LeetCode, Stack Overflow, documentation sites, etc.). Since developers work across hundreds of different domains, this broad permission is essential to provide consistent AI assistance regardless of which technical platform they're using. The extension only activates when users explicitly trigger it.
```

⚠️ **Warning**: Host permission `<all_urls>` may require in-depth review and delay publishing.

---

## 💻 Section 3: Remote Code Usage

**Are you using remote code?**
- ✅ **Yes, I am using remote code**

**Justification** (Required - 0/1,000 characters)
```
The extension uses remote code hosted on Cloudflare Workers (serverless backend) to process AI requests securely. This architecture is necessary to protect API keys and handle AI model interactions server-side, preventing exposure of sensitive credentials in the client-side code. The remote code only processes webpage content that users explicitly choose to analyze and returns AI-generated responses. No remote code is executed in the user's browser environment; all communication is via standard HTTPS API calls.
```

---

## 📊 Section 4: Data Usage

**What user data do you plan to collect from users now or in the future?**

Check **NONE** of the boxes - the extension collects NO user data:
- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity
- [ ] Website content

**Why no data collection?**
- Extension only processes webpage content temporarily in memory
- No analytics or tracking
- No user accounts or authentication
- Conversations are not stored permanently
- All processing happens via backend proxy without logging

---

## ✅ Section 5: Certifications

**I certify that the following disclosures are true:**

Check **ALL THREE** boxes:
- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## 🔒 Section 6: Privacy Policy

**Privacy policy URL** (Required - 0/2,048 characters)

Option 1 - Use GitHub hosted privacy policy:
```
https://github.com/Arunodoy18/Meow/blob/main/PRIVACY_POLICY.md
```

Option 2 - Use raw GitHub URL (better for direct viewing):
```
https://raw.githubusercontent.com/Arunodoy18/Meow/main/PRIVACY_POLICY.md
```

✅ **Recommended**: Use the first URL (blob version) as it renders better in browsers.

---

## 📝 Summary Checklist

- [ ] Single purpose description filled
- [ ] activeTab justification filled
- [ ] scripting justification filled
- [ ] storage justification filled
- [ ] Host permission (<all_urls>) justification filled
- [ ] Remote code usage = YES
- [ ] Remote code justification filled
- [ ] Data usage = ALL UNCHECKED (no data collected)
- [ ] All 3 certification checkboxes checked
- [ ] Privacy policy URL added
- [ ] Save draft
- [ ] Continue to next tab

---

## ⚠️ Important Notes

1. **Host Permission Review**: The `<all_urls>` permission will likely trigger an in-depth review by Chrome Web Store team. Your justification must be clear that it's essential for the extension's core functionality across multiple technical platforms.

2. **Remote Code**: Since you're using Cloudflare Workers backend, you must disclose this. The justification emphasizes security (protecting API keys) and explains it's not executing remote code in the browser.

3. **No Data Collection**: Since your extension processes content in memory and doesn't store/track user data, select NO data collection categories.

4. **Privacy Policy**: Make sure your PRIVACY_POLICY.md file is pushed to GitHub and publicly accessible before submitting.

---

## 🔍 Review Tips

- Be specific about WHY each permission is needed
- Emphasize user control (extension only works when activated)
- Highlight privacy/security benefits
- Explain technical necessity clearly
- Keep justifications under character limits
