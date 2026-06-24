import type { Meta, StoryObj } from '@storybook/react';
import { UsageDetailsModal as UsageDetailsModal } from './UsageDetailsModal';

const meta: Meta<typeof UsageDetailsModal> = {
  title: 'Components/model-interface/features/messages/components/UsageDetailsModal',
  component: UsageDetailsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof UsageDetailsModal>;

export const Default: Story = {
  args: {},
};
