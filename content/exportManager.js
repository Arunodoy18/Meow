/**
 * Meow AI - Export Manager v1.0
 * Export conversations as Markdown, JSON, or copy to clipboard.
 */

const MeowExport = (() => {
  'use strict';

  /**
   * Export conversation history as Markdown.
   * @param {Array<{role: string, content: string, timestamp: number}>} messages
   * @param {string} pageTitle
   * @param {string} mode
   * @returns {string} Markdown text
   */
  function toMarkdown(messages, pageTitle, mode) {
    const lines = [
      `# Meow AI Conversation`,
      ``,
      `**Page:** ${pageTitle || 'Unknown'}`,
      `**Mode:** ${mode || 'General'}`,
      `**Date:** ${new Date().toLocaleString()}`,
      `**Messages:** ${messages.length}`,
      ``,
      `---`,
      ``
    ];

    for (const msg of messages) {
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      const role = msg.role === 'user' ? '👤 **You**' : '🐱 **Meow AI**';
      lines.push(`### ${role} ${time ? `(${time})` : ''}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    lines.push(`*Exported from Meow AI — ${new Date().toISOString()}*`);
    return lines.join('\n');
  }

  /**
   * Export conversation as JSON.
   * @param {Array} messages
   * @param {string} pageTitle
   * @param {string} mode
   * @returns {string} JSON string
   */
  function toJSON(messages, pageTitle, mode) {
    return JSON.stringify({
      exportVersion: 1,
      extension: 'Meow AI',
      exportDate: new Date().toISOString(),
      page: { title: pageTitle, mode },
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || null
      }))
    }, null, 2);
  }

  /**
   * Copy text to clipboard.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch (e2) {
        console.error('🐱 Copy failed:', e2);
        return false;
      }
    }
  }

  /**
   * Download text as a file.
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function downloadFile(content, filename, mimeType = 'text/markdown') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Export as Markdown file download.
   */
  function downloadMarkdown(messages, pageTitle, mode) {
    const md = toMarkdown(messages, pageTitle, mode);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(md, `meow-ai-${date}.md`, 'text/markdown');
  }

  /**
   * Export as JSON file download.
   */
  function downloadJSON(messages, pageTitle, mode) {
    const json = toJSON(messages, pageTitle, mode);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `meow-ai-${date}.json`, 'application/json');
  }

  // ==================== PUBLIC API ====================

  return {
    toMarkdown,
    toJSON,
    copyToClipboard,
    downloadFile,
    downloadMarkdown,
    downloadJSON
  };
})();
