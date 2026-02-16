import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { BrowserController } from './controller.js';

describe('BrowserController', () => {
  let controller: BrowserController;

  beforeEach(() => {
    controller = new BrowserController();
  });

  afterEach(async () => {
    await controller.close();
  });

  it('should launch browser', async () => {
    await controller.launch({ headless: true });
    assert.ok(controller['browser'], 'Browser should be initialized');
  });

  it('should navigate to URL', async () => {
    await controller.launch({ headless: true });
    const page = await controller.navigate('about:blank');
    assert.ok(page, 'Page should be returned');
  });

  it('should take screenshot', async () => {
    await controller.launch({ headless: true });
    await controller.navigate('about:blank');
    const screenshot = await controller.screenshot({ name: 'test' });
    assert.ok(screenshot.path, 'Screenshot path should exist');
    assert.ok(screenshot.metadata.width > 0, 'Width should be > 0');
  });
});
