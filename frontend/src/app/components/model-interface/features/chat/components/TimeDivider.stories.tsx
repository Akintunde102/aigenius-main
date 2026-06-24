import type { Meta, StoryObj } from '@storybook/react';
import { TimeDivider as TimeDivider } from './TimeDivider';

const meta: Meta<typeof TimeDivider> = {
  title: 'Components/model-interface/features/chat/components/TimeDivider',
  component: TimeDivider,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TimeDivider>;

export const Default: Story = {
  args: {},
};
