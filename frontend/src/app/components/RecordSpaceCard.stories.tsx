import type { Meta, StoryObj } from '@storybook/react';
import { RecordSpaceCard as RecordSpaceCard } from './RecordSpaceCard';

const meta: Meta<typeof RecordSpaceCard> = {
  title: 'Components/RecordSpaceCard',
  component: RecordSpaceCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof RecordSpaceCard>;

export const Default: Story = {
  args: {},
};
