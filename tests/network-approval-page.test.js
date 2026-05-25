import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createNetworkApprovalPageStyles,
  createNetworkApprovalCellBgScript,
  renderNetworkApprovalPage,
} from '../display/network-approval-page.js';

describe('network approval page renderer', () => {
  it('renders a provider-themed standalone approval page', () => {
    let html = renderNetworkApprovalPage({
      requestId: 'req-1',
      address: '192.168.1.44',
      text: {
        title: 'Host approval',
        approvedStatus: 'Approved',
      },
    });

    assert.match(html, /Host approval/);
    assert.match(html, /req-1/);
    assert.match(html, /192\.168\.1\.44/);
    assert.match(html, /sn-network-approval-cell-bg/);
    assert.match(html, /sn-network-approval-canvas/);
    assert.match(html, /--sn-cell-bg/);
    assert.match(html, /--sn-panel-bg/);
    assert.match(html, /const RULE_B = \[3\]/);
    assert.doesNotMatch(html, /sn-network-approval-orbit/);
    assert.doesNotMatch(html, /sn-network-approval-grid/);
  });

  it('escapes untrusted request data and copy', () => {
    let html = renderNetworkApprovalPage({
      requestId: '<script>alert(1)</script>',
      address: '" onmouseover="bad',
      text: {
        heading: '<img src=x onerror=bad>',
      },
    });

    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /&quot; onmouseover=&quot;bad/);
  });

  it('keeps the style contract on provider tokens and motion affordances', () => {
    let css = createNetworkApprovalPageStyles();

    for (let token of ['--sn-bg', '--sn-panel-bg', '--sn-node-border', '--sn-node-selected', '--sn-cell-vignette-edge']) {
      assert.match(css, new RegExp(token));
    }
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /color-mix/);
    assert.match(css, /radial-gradient/);
  });

  it('uses the chat cell background algorithm in the standalone script', () => {
    let script = createNetworkApprovalCellBgScript();

    for (let constant of ['CELL_SIZE = 14', 'STEP_MS = 75', 'MIN_RADIUS = 2', 'MAX_RADIUS = 5', 'FADE_RATE = 0.04']) {
      assert.match(script, new RegExp(constant.replaceAll(' ', '\\s*')));
    }
    for (let token of ['--sn-cell-bg', '--sn-cell-dot', '--sn-cell-base-alpha', '--sn-cell-alpha-span']) {
      assert.match(script, new RegExp(token));
    }
    assert.match(script, /currentSpeed \+= \(targetSpeed - state\.currentSpeed\) \* 0\.03/);
    assert.match(script, /pulse\(10000\)/);
  });
});
