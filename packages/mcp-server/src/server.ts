#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserController, compareImages, setBaseline, ScreenshotOptions } from '@chromemcp/core';
import { readFileSync, existsSync } from 'fs';

const controller = new BrowserController();

const server = new Server(
  {
    name: 'chromemcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ========== Tools ==========

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'browse',
        description: 'Launch browser and navigate to URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
            headless: { type: 'boolean', description: 'Run in headless mode' },
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' }
              }
            }
          },
          required: ['url']
        }
      },
      {
        name: 'close_browser',
        description: 'Close the browser',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the screenshot' },
            clip: {
              type: 'object',
              description: 'Clip region',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              }
            },
            fullPage: { type: 'boolean' }
          }
        }
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' }
          },
          required: ['selector']
        }
      },
      {
        name: 'fill',
        description: 'Fill an input field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            value: { type: 'string' }
          },
          required: ['selector', 'value']
        }
      },
      {
        name: 'press',
        description: 'Press a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to press (e.g., Enter, Space, ArrowUp)' }
          },
          required: ['key']
        }
      },
      {
        name: 'hover',
        description: 'Hover over an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' }
          },
          required: ['selector']
        }
      },
      {
        name: 'wait_for_selector',
        description: 'Wait for an element to appear',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' }
          },
          required: ['selector']
        }
      },
      {
        name: 'wait_for_timeout',
        description: 'Wait for a specified time',
        inputSchema: {
          type: 'object',
          properties: {
            ms: { type: 'number', description: 'Milliseconds to wait' }
          },
          required: ['ms']
        }
      },
      {
        name: 'get_canvas_info',
        description: 'Get information about all canvas elements',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'execute_script',
        description: 'Execute JavaScript in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            script: { type: 'string', description: 'JavaScript code to execute' }
          },
          required: ['script']
        }
      },
      {
        name: 'compare_screenshots',
        description: 'Compare two screenshots',
        inputSchema: {
          type: 'object',
          properties: {
            baseline: { type: 'string', description: 'Baseline image path or name' },
            actual: { type: 'string', description: 'Actual image path or name' },
            threshold: { type: 'number', description: 'Difference threshold (0-1)', default: 0.1 }
          },
          required: ['baseline', 'actual']
        }
      },
      {
        name: 'set_baseline',
        description: 'Set a screenshot as baseline',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Baseline name' },
            screenshotPath: { type: 'string', description: 'Path to screenshot' }
          },
          required: ['name', 'screenshotPath']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'browse': {
        const { url, headless = true, viewport } = args as { url: string; headless?: boolean; viewport?: { width: number; height: number } };
        await controller.launch({ headless, viewport });
        await controller.navigate(url);
        const session = controller.getSession();
        return {
          content: [{ type: 'text', text: `Navigated to ${url}. Session ID: ${session?.id}` }]
        };
      }

      case 'close_browser': {
        await controller.close();
        return {
          content: [{ type: 'text', text: 'Browser closed' }]
        };
      }

      case 'screenshot': {
        const screenshot = await controller.screenshot(args as ScreenshotOptions);
        return {
          content: [
            { type: 'text', text: `Screenshot saved: ${screenshot.path}` },
            { type: 'image', data: readFileSync(screenshot.path).toString('base64'), mimeType: 'image/png' }
          ]
        };
      }

      case 'click': {
        const { selector } = args as { selector: string };
        await controller.click(selector);
        return {
          content: [{ type: 'text', text: `Clicked ${selector}` }]
        };
      }

      case 'fill': {
        const { selector, value } = args as { selector: string; value: string };
        await controller.fill(selector, value);
        return {
          content: [{ type: 'text', text: `Filled ${selector} with "${value}"` }]
        };
      }

      case 'press': {
        const { key } = args as { key: string };
        await controller.press(key);
        return {
          content: [{ type: 'text', text: `Pressed ${key}` }]
        };
      }

      case 'hover': {
        const { selector } = args as { selector: string };
        await controller.hover(selector);
        return {
          content: [{ type: 'text', text: `Hovered ${selector}` }]
        };
      }

      case 'wait_for_selector': {
        const { selector, timeout } = args as { selector: string; timeout?: number };
        await controller.waitForSelector(selector, { timeout });
        return {
          content: [{ type: 'text', text: `Element ${selector} appeared` }]
        };
      }

      case 'wait_for_timeout': {
        const { ms } = args as { ms: number };
        await controller.waitForTimeout(ms);
        return {
          content: [{ type: 'text', text: `Waited ${ms}ms` }]
        };
      }

      case 'get_canvas_info': {
        const info = await controller.getCanvasInfo();
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        };
      }

      case 'execute_script': {
        const { script } = args as { script: string };
        const result = await controller.executeScript(script);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      case 'compare_screenshots': {
        const { baseline, actual, threshold = 0.1 } = args as { baseline: string; actual: string; threshold?: number };
        const result = await compareImages(baseline, actual, { threshold });
        return {
          content: [
            { type: 'text', text: `Match score: ${result.matchScore.toFixed(4)}\nPassed: ${result.passed}` },
            ...(result.diffPath ? [{ type: 'image', data: readFileSync(result.diffPath).toString('base64'), mimeType: 'image/png' }] : [])
          ]
        };
      }

      case 'set_baseline': {
        const { name, screenshotPath } = args as { name: string; screenshotPath: string };
        const baselinePath = setBaseline(name, screenshotPath);
        return {
          content: [{ type: 'text', text: `Baseline set: ${baselinePath}` }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true
    };
  }
});

// ========== Resources ==========

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const session = controller.getSession();
  if (!session) {
    return { resources: [] };
  }

  return {
    resources: [
      {
        uri: `resource://sessions/${session.id}/screenshots`,
        name: 'Session Screenshots',
        mimeType: 'application/json'
      },
      {
        uri: `resource://sessions/${session.id}/steps`,
        name: 'Session Steps',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const session = controller.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  if (uri === `resource://sessions/${session.id}/screenshots`) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session.screenshots, null, 2)
      }]
    };
  }

  if (uri === `resource://sessions/${session.id}/steps`) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session.steps, null, 2)
      }]
    };
  }

  // Handle screenshot image resources
  const screenshotMatch = uri.match(/resource:\/\/screenshots\/([^/]+)\/(.+)/);
  if (screenshotMatch) {
    const [, sessionId, screenshotId] = screenshotMatch;
    const screenshot = session.screenshots.find(s => s.id === screenshotId);
    if (screenshot && existsSync(screenshot.path)) {
      const data = readFileSync(screenshot.path).toString('base64');
      return {
        contents: [{
          uri,
          mimeType: 'image/png',
          blob: data
        }]
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// ========== Prompts ==========

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'visual-testing-guide',
        description: 'Guide for visual testing best practices'
      },
      {
        name: 'game-testing-workflow',
        description: 'Workflow for testing HTML games'
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'visual-testing-guide') {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `# Visual Testing Guide

## Best Practices

1. **Take screenshots at consistent viewport sizes**
2. **Wait for animations to complete before capturing**
3. **Use meaningful names for screenshots**
4. **Set baselines from known good states**
5. **Review diff images carefully when tests fail**

## Workflow

1. Navigate to page
2. Interact with elements
3. Take screenshots at key states
4. Compare against baselines
5. Update baselines if changes are intentional
`
        }
      }]
    };
  }

  if (name === 'game-testing-workflow') {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `# HTML Game Testing Workflow

## Steps

1. **Load the game**: Use browse() to navigate to game URL
2. **Wait for canvas**: Use get_canvas_info() to verify game loaded
3. **Record initial state**: Take screenshot before interaction
4. **Simulate input**: Use press() or click() for game controls
5. **Wait for animation**: Use wait_for_timeout() for transitions
6. **Capture result**: Take screenshot of outcome
7. **Compare**: Use compare_screenshots() against expected state

## Tips

- Canvas games may need custom selectors
- Frame timing is critical, use appropriate waits
- Record videos for complex sequences
`
        }
      }]
    };
  }

  throw new Error(`Prompt not found: ${name}`);
});

// ========== Start Server ==========

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ChromeMCP Server running on stdio');
}

main().catch(console.error);
