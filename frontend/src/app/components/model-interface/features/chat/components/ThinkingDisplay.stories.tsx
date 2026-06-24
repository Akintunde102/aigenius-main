import type { Meta, StoryObj } from '@storybook/react';
import { ThinkingDisplay as ThinkingDisplay } from './ThinkingDisplay';

const meta: Meta<typeof ThinkingDisplay> = {
  title: 'Components/model-interface/features/chat/components/ThinkingDisplay',
  component: ThinkingDisplay,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ThinkingDisplay>;

export const Default: Story = {
  args: {},
};
