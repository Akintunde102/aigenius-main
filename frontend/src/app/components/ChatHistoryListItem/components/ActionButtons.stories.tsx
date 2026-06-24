import type { Meta, StoryObj } from '@storybook/react';
import { ActionButtons as ActionButtons } from './ActionButtons';

const meta: Meta<typeof ActionButtons> = {
  title: 'Components/ChatHistoryListItem/components/ActionButtons',
  component: ActionButtons,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ActionButtons>;

export const Default: Story = {
  args: {},
};
