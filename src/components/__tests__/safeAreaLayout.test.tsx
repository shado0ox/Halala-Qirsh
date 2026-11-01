import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TabBar } from '../TabBar';
import capacitorConfig from '../../../capacitor.config.ts';

// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';

describe('Safe Area and Full-Bleed Layout Verification', () => {
  it('verifies index.html has viewport-fit=cover in the viewport meta tag', () => {
    // @ts-ignore
    const htmlPath = path.resolve(process.cwd(), 'index.html');
    // @ts-ignore
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    expect(htmlContent).toContain('name="viewport"');
    expect(htmlContent).toContain('viewport-fit=cover');
  });

  it('verifies index.css defines --sat and --sab CSS custom properties with 0px fallbacks', () => {
    // @ts-ignore
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    // @ts-ignore
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    expect(cssContent).toContain('--sat: env(safe-area-inset-top, 0px);');
    expect(cssContent).toContain('--sab: env(safe-area-inset-bottom, 0px);');
    expect(cssContent).toContain('--sal: env(safe-area-inset-left, 0px);');
    expect(cssContent).toContain('--sar: env(safe-area-inset-right, 0px);');

    // Utility classes must use variables rather than hardcoded 44px/20px fallbacks
    expect(cssContent).toContain('.pt-safe {\n  padding-top: var(--sat);');
    expect(cssContent).toContain('.pb-safe {\n  padding-bottom: var(--sab);');
  });

  it('verifies capacitor.config.ts configures contentInset as never to prevent letterboxing on iOS', () => {
    expect(capacitorConfig.ios?.contentInset).toBe('never');
  });

  it('verifies TabBar applies safe area bottom padding to keep tabs above the home indicator', () => {
    const { container } = render(
      <TabBar
        activeTab="dashboard"
        onChangeTab={() => {}}
        onOpenAddExpense={() => {}}
        language="ar"
      />
    );

    const surface = container.querySelector('nav > div:last-child');
    expect(surface).not.toBeNull();
    const styleAttr = surface?.getAttribute('style');
    expect(styleAttr).toContain('calc(var(--sab) + 8px)');
  });
});
