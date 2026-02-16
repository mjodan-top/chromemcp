import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Screenshot, ScreenshotOptions, BrowserOptions, TestSession, TestStep } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = join(process.cwd(), 'screenshots');

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private session: TestSession | null = null;
  private outputDir: string;

  constructor(outputDir: string = DEFAULT_OUTPUT_DIR) {
    this.outputDir = outputDir;
  }

  async launch(options: BrowserOptions = {}): Promise<void> {
    const { headless = true, viewport = { width: 1280, height: 720 } } = options;

    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      viewport,
      recordVideo: headless ? undefined : { dir: join(this.outputDir, 'videos') }
    });
    this.page = await this.context.newPage();

    await mkdir(this.outputDir, { recursive: true });
  }

  async navigate(url: string): Promise<Page> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    await this.page.goto(url, { waitUntil: 'networkidle' });

    this.session = {
      id: generateId(),
      url,
      startTime: Date.now(),
      steps: [],
      screenshots: []
    };

    return this.page;
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<Screenshot> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const id = generateId();
    const filename = `${options.name || 'screenshot'}-${id}.png`;
    const path = join(this.outputDir, filename);

    await this.page.screenshot({
      path,
      clip: options.clip,
      fullPage: options.fullPage,
      omitBackground: options.omitBackground
    });

    const screenshot: Screenshot = {
      id,
      path,
      type: options.name ? 'manual' : 'auto',
      metadata: {
        width: options.clip?.width || this.page.viewportSize()?.width || 0,
        height: options.clip?.height || this.page.viewportSize()?.height || 0,
        timestamp: Date.now()
      }
    };

    if (this.session) {
      this.session.screenshots.push(screenshot);
    }

    return screenshot;
  }

  async click(selector: string, options?: { position?: { x: number; y: number }; button?: 'left' | 'right' | 'middle' }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('click', selector, undefined, async () => {
      await this.page!.click(selector, options);
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('fill', selector, value, async () => {
      await this.page!.fill(selector, value);
    });
  }

  async press(key: string, options?: { modifiers?: string[] }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    const modifiers = options?.modifiers || [];
    await this.recordStep('press', undefined, key, async () => {
      await this.page!.keyboard.press(modifiers.join('+') + (modifiers.length ? '+' : '') + key);
    });
  }

  async hover(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('hover', selector, undefined, async () => {
      await this.page!.hover(selector);
    });
  }

  async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.waitForSelector(selector, { timeout: options?.timeout || 30000 });
  }

  async waitForTimeout(ms: number): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.waitForTimeout(ms);
  }

  async executeScript<T>(script: string): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return await this.page.evaluate(script);
  }

  getCanvasInfo(): Promise<Array<{ selector: string; width: number; height: number; x: number; y: number }>> {
    return this.executeScript(`
      Array.from(document.querySelectorAll('canvas')).map((canvas, i) => {
        const rect = canvas.getBoundingClientRect();
        return {
          selector: 'canvas >> nth=' + i,
          width: canvas.width,
          height: canvas.height,
          x: rect.x,
          y: rect.y
        };
      })
    `);
  }

  getPage(): Page {
    if (!this.page) throw new Error('Browser not launched');
    return this.page;
  }

  getSession(): TestSession | null {
    return this.session;
  }

  async close(): Promise<void> {
    if (this.session) {
      this.session.endTime = Date.now();
    }
    await this.context?.close();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  private async recordStep(type: TestStep['type'], target?: string, value?: string, action?: () => Promise<void>): Promise<void> {
    if (!this.session) return;

    const screenshotBefore = await this.screenshot({ name: `step-${this.session.steps.length}-before` });

    const step: TestStep = {
      id: generateId(),
      type,
      target,
      value,
      screenshotBefore: screenshotBefore.path,
      timestamp: Date.now()
    };

    if (action) {
      const startTime = Date.now();
      await action();
      step.duration = Date.now() - startTime;
    }

    step.screenshotAfter = (await this.screenshot({ name: `step-${this.session.steps.length}-after` })).path;

    this.session.steps.push(step);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
