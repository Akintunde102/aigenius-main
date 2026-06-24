import type { Meta, StoryObj } from '@storybook/react';
import AuthenticatedChatPage from './AuthenticatedChatPage';

const meta: Meta<typeof AuthenticatedChatPage> = {
  title: 'Components/AuthenticatedChatPage',
  component: AuthenticatedChatPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AuthenticatedChatPage>;

export const Default: Story = {
  args: {},
};
