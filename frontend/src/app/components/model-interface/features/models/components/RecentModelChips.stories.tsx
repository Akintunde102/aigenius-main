import type { Meta, StoryObj } from '@storybook/react';
import { RecentModelChips as RecentModelChips } from './RecentModelChips';

const meta: Meta<typeof RecentModelChips> = {
  title: 'Components/model-interface/features/models/components/RecentModelChips',
  component: RecentModelChips,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof RecentModelChips>;

export const Default: Story = {
  args: {},
};
