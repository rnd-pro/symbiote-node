/**
 * AiChat — mock AI assistant chat panel for the node editor demo
 *
 * Simulates an AI assistant that can answer questions about the workflow.
 * Responses are pre-scripted with a typing indicator for realism.
 *
 * @module symbiote-node/demo/AiChat
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './AiChat.tpl.js';
import { styles } from './AiChat.css.js';

/** Pre-scripted AI responses keyed by trigger words */
const RESPONSES = [
  {
    triggers: ['hello', 'hi', 'hey', 'привет'],
    response: 'Hello! I can help you understand this workflow. Try asking about specific nodes, the data flow, or error handling.',
  },
  {
    triggers: ['trigger', 'start', 'begin'],
    response: 'The <code>Trigger</code> node initiates the pipeline. It fires on a schedule or webhook event, then passes control to <code>Auth Guard</code> for token validation before any API calls are made.',
  },
  {
    triggers: ['auth', 'guard', 'security', 'token'],
    response: 'The <code>Auth Guard</code> validates JWT tokens and checks rate limits. If authentication fails, the flow short-circuits — no downstream nodes execute. It supports OAuth 2.0 and API key strategies.',
  },
  {
    triggers: ['gateway', 'api', 'route'],
    response: 'The <code>API Gateway</code> handles request routing, load balancing, and protocol translation. It normalizes responses from multiple upstream services into a unified schema before passing data downstream.',
  },
  {
    triggers: ['ai', 'agent', 'llm', 'gpt', 'prompt'],
    response: 'The <code>AI Agent</code> node uses GPT-4o for content enrichment. It processes prompts with context from upstream nodes, caches responses (847 tokens avg), and supports streaming output to connected nodes.',
  },
  {
    triggers: ['error', 'filter', 'missing'],
    response: 'The <code>Filter</code> node currently shows an error: "Missing required condition". This means its validation rule is not configured. You can fix this by setting a condition expression in the node properties.',
  },
  {
    triggers: ['subgraph', 'enrichment', 'data enrichment', 'inner'],
    response: 'The <code>Data Enrichment</code> is a subgraph containing 3 inner nodes: Parse → Validate → Enrich. During flow execution, you can see each inner node light up sequentially in the preview canvas.',
  },
  {
    triggers: ['flow', 'play', 'run', 'simulate'],
    response: 'Click <code>▶ Play</code> to start the flow simulation. Nodes light up in topological order — processing (blue pulse) → completed (green). The Event Log below tracks every state transition in real-time.',
  },
  {
    triggers: ['health', 'monitor', 'status'],
    response: 'The <code>Health</code> node is a star-shaped SVG node that monitors system metrics. It connects to the Trigger for periodic health checks and reports status, latency, and error rates.',
  },
  {
    triggers: ['debug', 'log', 'output'],
    response: 'The <code>Debug Log</code> node captures all output from upstream nodes. Its preview shows the latest result as formatted JSON. It connects to <code>Merge</code> for aggregated pipeline output.',
  },
];

const FALLBACK = 'I can help with this workflow! Try asking about specific nodes like "AI Agent", "Auth Guard", or "Filter error". You can also ask about the flow simulation or subgraph previews.';

export class AiChat extends Symbiote {
  init$ = {
    status: 'online',
    onSend: () => this._send(),
    onKeyDown: (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    },
  };

  renderCallback() {
    // Welcome message
    setTimeout(() => {
      this._addBubble('ai', 'Welcome! I\'m your AI assistant for this workflow. Ask me about any node, connection, or how the data flows through this pipeline.');
    }, 500);
  }

  /** Send user message and generate response */
  _send() {
    const input = this.ref.input;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this._addBubble('user', text);

    // Show typing indicator
    const typing = this._addTyping();

    // Simulate thinking delay
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      typing.remove();
      const response = this._findResponse(text);
      this._addBubble('ai', response);
    }, delay);
  }

  /**
   * Find best matching response
   * @param {string} text
   * @returns {string}
   */
  _findResponse(text) {
    const lower = text.toLowerCase();
    for (const entry of RESPONSES) {
      if (entry.triggers.some((t) => lower.includes(t))) {
        return entry.response;
      }
    }
    return FALLBACK;
  }

  /**
   * Add a chat bubble
   * @param {'user'|'ai'} role
   * @param {string} html
   */
  _addBubble(role, html) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.setAttribute('data-role', role);
    if (role === 'ai') {
      bubble.innerHTML = `<span class="ai-prefix">✦ Assistant</span>${html}`;
    } else {
      bubble.textContent = html;
    }
    this.ref.messages.appendChild(bubble);
    requestAnimationFrame(() => {
      this.ref.messages.scrollTop = this.ref.messages.scrollHeight;
    });
    return bubble;
  }

  /** Add typing indicator */
  _addTyping() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.setAttribute('data-role', 'ai');
    bubble.innerHTML = '<span class="ai-prefix">✦ Assistant</span><div class="typing-dots"><span></span><span></span><span></span></div>';
    this.ref.messages.appendChild(bubble);
    requestAnimationFrame(() => {
      this.ref.messages.scrollTop = this.ref.messages.scrollHeight;
    });
    return bubble;
  }
}

AiChat.template = template;
AiChat.rootStyles = styles;
AiChat.reg('ai-chat');
