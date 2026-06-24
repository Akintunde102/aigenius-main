import type { Meta, StoryObj } from '@storybook/react';
import GmailCallbackPage from './page';

const meta: Meta<typeof GmailCallbackPage> = {
  title: 'Pages/integrations/gmail/callback',
  component: GmailCallbackPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof GmailCallbackPage>;

export const Default: Story = {
  args: {},
};
