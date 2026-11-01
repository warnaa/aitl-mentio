import { addons } from 'storybook/preview-api';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { initialize, mswLoader } from 'msw-storybook-addon';
import '../src/styles/globals.css';
import './preview.css';

initialize({ onUnhandledRequest: 'error', quiet: true });
// Standalone MDX does not render a story decorator. Keep its document root in sync too.
function applyTheme(theme: unknown) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme !== 'dark');
}
if (typeof document !== 'undefined') {
  const globals = new URLSearchParams(location.search).get('globals') ?? '';
  applyTheme(globals.split(';').find(value => value.startsWith('theme:'))?.split(':')[1]);
  const sync = ({ globals }: { globals: Record<string, unknown> }) => applyTheme(globals.theme);
  addons.getChannel().on(GLOBALS_UPDATED, sync);
  addons.getChannel().on(SET_GLOBALS, sync);
}

const preview: Preview = {
  initialGlobals: { theme: 'light' },
  decorators: [withThemeByClassName({ themes: { light: 'light', dark: 'dark' }, defaultTheme: 'light', parentSelector: 'html' })],
  loaders: [mswLoader],
  parameters: {
    layout: 'padded',
    viewport: { options: { mobile1: { name: 'Narrow 320', styles: { width: '320px', height: '900px' }, type: 'mobile' } } },
    a11y: { test: 'error' },
    controls: { expanded: true },
    options: { storySort: { order: ['Design system', ['Start here', 'Components', 'How to choose', 'Usage and accessibility', 'Content', 'What to avoid', 'What is missing', 'Contributing', 'E01 — Mentor page and discovery', 'E02 — Book and pay', 'E03 — Mentor decides', 'E04 — The text session', 'E05 — Mentor earnings', 'E06 — Later (parked)', 'Stage 1'], 'Foundations', 'Primitives', 'Product', 'Patterns'] } },
  },
};
export default preview;
