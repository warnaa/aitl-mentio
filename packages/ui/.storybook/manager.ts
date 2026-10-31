import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({ theme: create({ base: 'light', brandTitle: 'Mentio', brandUrl: '?path=/docs/design-system-stage-1--docs', brandTarget: '_self' }) });
