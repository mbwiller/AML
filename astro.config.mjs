// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';

import { katexOptions } from './src/lib/katex-macros.ts';
import { remarkSticky } from './src/lib/markdown/remark-sticky.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://aml-atlas.vercel.app',
  output: 'static',
  markdown: {
    // Astro 7's default Sätteri processor does not run remark/rehype plugins
    // (docs/reference/tech-stack.md §2), so we use unified explicitly.
    processor: unified({
      remarkPlugins: [remarkMath, remarkSticky],
      rehypePlugins: [rehypeSlug, [rehypeKatex, katexOptions]],
    }),
  },
  // Expressive Code must precede mdx() so it owns fenced code blocks.
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      useDarkModeMediaQuery: false,
      styleOverrides: {
        codeFontFamily: 'var(--font-mono)',
        uiFontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-card)',
        borderColor: 'var(--border)',
        codeBackground: 'var(--surface-2)',
        frames: { shadowColor: 'transparent' },
      },
    }),
    mdx(),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
