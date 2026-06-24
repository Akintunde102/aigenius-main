import type { Meta, StoryObj } from '@storybook/react';
import { AIGeniusLogo as AIGeniusLogo } from './AIGeniusLogo';

const meta: Meta<typeof AIGeniusLogo> = {
  title: 'Components/AIGeniusLogo',
  component: AIGeniusLogo,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AIGeniusLogo>;

export const Default: Story = {
  args: {},
};
