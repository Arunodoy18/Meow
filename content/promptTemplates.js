/**
 * Meow AI - Custom Prompt Templates v1.0
 * User-defined reusable prompt templates stored in chrome.storage.
 */

const MeowPromptTemplates = (() => {
  'use strict';

  const STORAGE_KEY = 'meow_prompt_templates';

  // ==================== DEFAULT TEMPLATES ====================

  const DEFAULT_TEMPLATES = [
    {
      id: 'security-review',
      name: '🔒 Security Review',
      prompt: 'Perform a thorough security review of this code/page. Check for: XSS vulnerabilities, injection risks, authentication issues, data exposure, insecure dependencies, and OWASP Top 10 concerns.',
      category: 'review'
    },
    {
      id: 'explain-eli5',
      name: '👶 Explain Like I\'m 5',
      prompt: 'Explain this in the simplest terms possible. Use everyday analogies and avoid technical jargon. Assume I have zero technical background.',
      category: 'learning'
    },
    {
      id: 'convert-typescript',
      name: '🔄 Convert to TypeScript',
      prompt: 'Convert the code on this page to TypeScript. Add proper type annotations, interfaces where needed, and use strict TypeScript best practices.',
      category: 'code'
    },
    {
      id: 'write-tests',
      name: '🧪 Write Unit Tests',
      prompt: 'Write comprehensive unit tests for the code on this page. Include edge cases, error scenarios, and boundary conditions. Use appropriate testing framework conventions.',
      category: 'code'
    },
    {
      id: 'refactor-clean',
      name: '♻️ Refactor & Clean Code',
      prompt: 'Refactor this code following clean code principles. Improve naming, reduce complexity, extract functions, remove duplication, and improve readability. Explain each change.',
      category: 'code'
    },
    {
      id: 'debug-help',
      name: '🐛 Debug This',
      prompt: 'Help me debug this. Identify potential issues, suggest likely causes, and provide step-by-step debugging strategies. Show me how to add useful logging.',
      category: 'code'
    },
    {
      id: 'interview-prep',
      name: '🎯 Interview Prep',
      prompt: 'If this were asked in a technical interview: What approach should I take? What followup questions might the interviewer ask? What are the expected time/space complexities?',
      category: 'learning'
    },
    {
      id: 'doc-quickstart',
      name: '📖 Quick Start Guide',
      prompt: 'Create a quick-start guide from this documentation. Include: minimum setup steps, essential configuration, first working example, common gotchas, and useful tips.',
      category: 'docs'
    },
    {
      id: 'code-review-pr',
      name: '📝 PR Review Checklist',
      prompt: 'Review this PR with a senior engineer checklist: correctness, edge cases, error handling, performance implications, security concerns, test coverage, documentation needs, and merge readiness.',
      category: 'review'
    },
    {
      id: 'architecture-analysis',
      name: '🏗️ Architecture Analysis',
      prompt: 'Analyze the software architecture. Identify design patterns, evaluate coupling/cohesion, suggest improvements, highlight scalability concerns, and recommend architectural best practices.',
      category: 'review'
    }
  ];

  // ==================== STORAGE ====================

  async function _loadTemplates() {
    try {
      const data = await MeowStorage.get(STORAGE_KEY);
      if (data && Array.isArray(data)) {
        return data;
      }
      // Initialize with defaults
      await _saveTemplates(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    } catch (e) {
      return DEFAULT_TEMPLATES;
    }
  }

  async function _saveTemplates(templates) {
    await MeowStorage.set(STORAGE_KEY, templates);
  }

  // ==================== PUBLIC API ====================

  /**
   * Get all templates (defaults + user-created).
   * @returns {Promise<Array>}
   */
  async function getAll() {
    return await _loadTemplates();
  }

  /**
   * Get templates by category.
   * @param {string} category
   * @returns {Promise<Array>}
   */
  async function getByCategory(category) {
    const all = await _loadTemplates();
    return all.filter(t => t.category === category);
  }

  /**
   * Add a new custom template.
   * @param {string} name
   * @param {string} prompt
   * @param {string} category
   * @returns {Promise<Object>}
   */
  async function add(name, prompt, category = 'custom') {
    const templates = await _loadTemplates();
    const template = {
      id: 'custom_' + Date.now(),
      name,
      prompt,
      category,
      custom: true,
      createdAt: Date.now()
    };
    templates.push(template);
    await _saveTemplates(templates);
    return template;
  }

  /**
   * Remove a custom template.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function remove(id) {
    const templates = await _loadTemplates();
    const idx = templates.findIndex(t => t.id === id && t.custom);
    if (idx === -1) return false;
    templates.splice(idx, 1);
    await _saveTemplates(templates);
    return true;
  }

  /**
   * Reset to default templates only.
   * @returns {Promise<void>}
   */
  async function resetToDefaults() {
    await _saveTemplates([...DEFAULT_TEMPLATES]);
  }

  /**
   * Get template categories.
   * @returns {Array<{id: string, label: string}>}
   */
  function getCategories() {
    return [
      { id: 'code', label: '💻 Code' },
      { id: 'review', label: '📝 Review' },
      { id: 'learning', label: '🎓 Learning' },
      { id: 'docs', label: '📖 Docs' },
      { id: 'custom', label: '⭐ Custom' }
    ];
  }

  return {
    getAll,
    getByCategory,
    add,
    remove,
    resetToDefaults,
    getCategories,
    DEFAULT_TEMPLATES
  };
})();
