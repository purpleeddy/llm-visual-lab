// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// GitHub Pages 의 프로젝트 페이지 경로. 모든 내부 링크와 asset 이 이 경로 아래에 놓인다.
// site 는 저장소 remote 가 없어 확인하지 못했다. sitemap 을 만들지 않으므로 생략한다.
export default defineConfig({
  base: '/llm-visual-lab/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: {
      prefixDefaultLocale: true,
      // 루트 redirect 는 src/pages/index.astro 에서 직접 만든다.
      // Astro 가 자동으로 만들면 같은 경로에 두 라우트가 생겨 경고가 난다.
      redirectToDefaultLocale: false,
    },
  },
  integrations: [mdx(), react()],
  // `markdown.processor` 를 지정하면 .md 와 .mdx 가 같은 파이프라인을 쓴다.
  // MDX 는 이 processor 를 그대로 물려받으므로 수식 안의 중괄호가 JSX 로 해석되지 않는다.
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
