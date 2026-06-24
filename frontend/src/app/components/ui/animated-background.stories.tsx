import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedBackground as AnimatedBackground } from './animated-background';

const meta: Meta<typeof AnimatedBackground> = {
  title: 'Components/ui/animated-background/AnimatedBackground',
  component: AnimatedBackground,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AnimatedBackground>;

export const Default: Story = {
  args: {},
};
