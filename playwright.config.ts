import { defineConfig, devices } from '@playwright/test';

/**
 * 브라우저 검사.
 * 개발 서버가 아니라 **빌드 결과**를 GitHub Pages 와 같은 `/llm-visual-lab/` 경로로 띄운다.
 * 배포했을 때와 같은 조건에서 링크·asset·직접 URL 접근을 확인하기 위해서다.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321/llm-visual-lab/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321/llm-visual-lab/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
