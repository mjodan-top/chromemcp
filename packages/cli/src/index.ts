#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('chromemcp')
  .description('ChromeMCP - Playwright + MCP based web testing framework')
  .version('0.1.0');

program
  .command('dev')
  .description('Start development mode with MCP server')
  .argument('<url>', 'URL to navigate to')
  .option('-p, --port <port>', 'MCP server port', '3000')
  .option('--headless', 'Run in headless mode', false)
  .option('--viewport <viewport>', 'Viewport size (e.g., 1280x720)', '1280x720')
  .action(async (url, options) => {
    console.log(`Starting dev mode for ${url}`);
    console.log(`Viewport: ${options.viewport}`);
    console.log(`Headless: ${options.headless}`);
    console.log('\nMCP Server starting...');
    console.log('Connect Claude Code to this server to begin testing.\n');

    // Start MCP server
    const serverPath = join(__dirname, '../../mcp-server/dist/index.js');
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    server.stdout?.on('data', (data) => {
      console.log(data.toString());
    });

    server.stderr?.on('data', (data) => {
      console.error(data.toString());
    });

    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });
  });

program
  .command('record')
  .description('Record browser interactions')
  .argument('<url>', 'URL to navigate to')
  .option('-o, --output <dir>', 'Output directory', './traces')
  .option('-n, --name <name>', 'Session name')
  .action(async (url, options) => {
    console.log(`Recording session for ${url}`);
    console.log(`Output: ${options.output}`);
    console.log('Feature coming soon: interactive recording mode');
  });

program
  .command('test')
  .description('Run tests from trace or URL')
  .argument('<target>', 'Trace file or URL')
  .option('--baseline <dir>', 'Baseline directory', './baselines')
  .option('--update', 'Update baselines', false)
  .option('--headed', 'Show browser window', false)
  .action(async (target, options) => {
    console.log(`Running tests for ${target}`);
    console.log(`Baseline: ${options.baseline}`);
    console.log(`Update: ${options.update}`);
    console.log('Feature coming soon: automated test execution');
  });

program
  .command('compare')
  .description('Compare two images')
  .argument('<img1>', 'First image')
  .argument('<img2>', 'Second image')
  .option('-t, --threshold <n>', 'Difference threshold', '0.1')
  .option('-o, --output <path>', 'Diff output path')
  .action(async (img1, img2, options) => {
    console.log(`Comparing ${img1} and ${img2}`);
    console.log(`Threshold: ${options.threshold}`);
    console.log('Feature coming soon: image comparison');
  });

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--stdio', 'Use stdio transport')
  .action(async (options) => {
    console.log('Starting MCP server...');

    const serverPath = join(__dirname, '../../mcp-server/dist/index.js');
    const server = spawn('node', [serverPath], {
      stdio: options.stdio ? 'inherit' : ['pipe', 'pipe', 'pipe']
    });

    if (!options.stdio) {
      server.stdout?.on('data', (data) => {
        console.log(data.toString());
      });

      server.stderr?.on('data', (data) => {
        console.error(data.toString());
      });
    }

    server.on('close', (code) => {
      process.exit(code || 0);
    });
  });

program.parse();
