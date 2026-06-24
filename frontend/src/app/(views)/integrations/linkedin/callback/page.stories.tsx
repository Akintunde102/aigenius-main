import type { Meta, StoryObj } from '@storybook/react';
import LinkedInCallbackPage from './page';

const meta: Meta<typeof LinkedInCallbackPage> = {
  title: 'Pages/integrations/linkedin/callback',
  component: LinkedInCallbackPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof LinkedInCallbackPage>;

export const Default: Story = {
  args: {},
};
