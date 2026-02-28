/**
 * Meow AI - Slash Commands v1.0
 * Handles /command syntax in chat input.
 * Commands: /explain, /review, /summarize, /compare, /fix, /test,
 * /security, /optimize, /template, /export, /stats, /help, /clear
 */

const MeowSlashCommands = (() => {
  'use strict';

  const COMMANDS = {
    '/explain': {
      description: 'Explain the current page in detail',
      action: (args) => `Explain this page in detail${args ? ': ' + args : ''}`,
    },
    '/review': {
      description: 'Code review the current page',
      action: (args) => `Review this code for bugs, improvements, and best practices${args ? '. Focus on: ' + args : ''}`,
    },
    '/summarize': {
      description: 'Summarize key points',
      action: (args) => `Give me the key insights and summary${args ? ' focusing on: ' + args : ''}`,
    },
    '/compare': {
      description: 'Compare approaches or solutions',
      action: (args) => args ? `Compare these approaches: ${args}` : 'Compare the approaches discussed on this page',
    },
    '/fix': {
      description: 'Help fix an error or bug',
      action: (args) => args ? `Help me fix this error: ${args}` : 'Help me identify and fix issues in this code',
    },
    '/test': {
      description: 'Suggest test cases',
      action: (args) => `Suggest comprehensive test cases${args ? ' for: ' + args : ' for the code on this page'}`,
    },
    '/security': {
      description: 'Security analysis',
      action: (args) => `Perform a security analysis${args ? ' of: ' + args : ' of this page content'}. Check for vulnerabilities, injection risks, and security best practices.`,
    },
    '/optimize': {
      description: 'Performance optimization suggestions',
      action: (args) => `Suggest performance optimizations${args ? ' for: ' + args : ' for the code on this page'}`,
    },
    '/hint': {
      description: 'Get a hint without the full solution',
      action: (args) => `Give me a hint (not the solution) ${args ? 'for: ' + args : 'for this problem'}. Guide me in the right direction.`,
    },
    '/complexity': {
      description: 'Analyze time/space complexity',
      action: (args) => `Analyze the time and space complexity${args ? ' of: ' + args : ' of the solution on this page'}`,
    },
    '/eli5': {
      description: 'Explain like I\'m 5',
      action: (args) => `Explain this in the simplest possible terms (ELI5)${args ? ': ' + args : ''}`,
    },
    '/deep': {
      description: 'Deep dive into a topic',
      action: (args) => `Give me an advanced deep dive${args ? ' into: ' + args : ' into this topic'}. Assume I have expert knowledge.`,
    },
    '/help': {
      description: 'Show available commands',
      action: () => null, // Special: handled by UI
    },
    '/clear': {
      description: 'Clear conversation history',
      action: () => null, // Special: handled by UI
    },
    '/export': {
      description: 'Export conversation as markdown',
      action: () => null, // Special: handled by UI
    },
    '/stats': {
      description: 'Show usage statistics',
      action: () => null, // Special: handled by UI
    },
    '/template': {
      description: 'Use a saved prompt template',
      action: () => null, // Special: handled by UI
    },
  };

  /**
   * Check if input text is a slash command.
   * @param {string} text
   * @returns {boolean}
   */
  function isCommand(text) {
    return text?.trim().startsWith('/');
  }

  /**
   * Parse a slash command from input text.
   * @param {string} text
   * @returns {{command: string, args: string, action: Function|null, isSpecial: boolean}|null}
   */
  function parse(text) {
    if (!isCommand(text)) return null;

    const trimmed = text.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const command = (spaceIdx > -1 ? trimmed.substring(0, spaceIdx) : trimmed).toLowerCase();
    const args = spaceIdx > -1 ? trimmed.substring(spaceIdx + 1).trim() : '';

    const config = COMMANDS[command];
    if (!config) return null;

    const isSpecial = ['/help', '/clear', '/export', '/stats', '/template'].includes(command);
    const message = isSpecial ? null : config.action(args);

    return { command, args, message, isSpecial };
  }

  /**
   * Get autocomplete suggestions for partial command.
   * @param {string} partial
   * @returns {Array<{command: string, description: string}>}
   */
  function getSuggestions(partial) {
    if (!partial.startsWith('/')) return [];

    const lower = partial.toLowerCase();
    return Object.entries(COMMANDS)
      .filter(([cmd]) => cmd.startsWith(lower))
      .map(([cmd, config]) => ({
        command: cmd,
        description: config.description
      }));
  }

  /**
   * Get help text listing all available commands.
   * @returns {string}
   */
  function getHelpText() {
    const lines = ['**Available Commands:**\n'];
    for (const [cmd, config] of Object.entries(COMMANDS)) {
      lines.push(`\`${cmd}\` — ${config.description}`);
    }
    lines.push('\n*Type a command followed by optional arguments.*');
    lines.push('*Example: `/review focus on error handling`*');
    return lines.join('\n');
  }

  /**
   * Get all command names (for display).
   * @returns {string[]}
   */
  function getAllCommands() {
    return Object.keys(COMMANDS);
  }

  // ==================== PUBLIC API ====================

  return {
    isCommand,
    parse,
    getSuggestions,
    getHelpText,
    getAllCommands
  };
})();
