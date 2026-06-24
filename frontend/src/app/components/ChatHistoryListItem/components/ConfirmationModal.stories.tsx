import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationModal as ConfirmationModal } from './ConfirmationModal';

const meta: Meta<typeof ConfirmationModal> = {
  title: 'Components/ChatHistoryListItem/components/ConfirmationModal',
  component: ConfirmationModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ConfirmationModal>;

export const Default: Story = {
  args: {},
};
