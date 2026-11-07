import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShareRuleNotice } from './ShareRuleNotice';

const meta = {
  title: 'Product/Share rule notice', component: ShareRuleNotice, tags: ['autodocs'],
  parameters: { docs: { description: { component: 'The R19 line shown beside the composer on every state of the text session screen. The product states the rule; it does not check ownership of pasted material.' } } },
} satisfies Meta<typeof ShareRuleNotice>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
