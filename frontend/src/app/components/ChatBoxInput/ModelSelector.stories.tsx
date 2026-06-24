import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelector as ModelSelector } from './ModelSelector';

const meta: Meta<typeof ModelSelector> = {
  title: 'Components/ChatBoxInput/ModelSelector',
  component: ModelSelector,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelector>;

export const Default: Story = {
  args: {},
};
