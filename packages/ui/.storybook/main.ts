import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../storybook/**/*.mdx', '../storybook/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest', '@storybook/addon-themes'],
  staticDirs: ['./public'],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  viteFinal(config) {
    // Tailwind resolves package sources itself; no Next app or server modules enter this build.
    // Prebundle the API client's schema dependency before browser tests start.
    config.optimizeDeps = { ...config.optimizeDeps, include: [...(config.optimizeDeps?.include ?? []), 'zod', 'storybook/internal/core-events'] };
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};
export default config;
