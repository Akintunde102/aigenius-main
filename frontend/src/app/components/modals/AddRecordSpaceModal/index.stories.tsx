import type { Meta, StoryObj } from '@storybook/react';
import { AddRecordSpaceModal as AddRecordSpaceModal } from './index';

const meta: Meta<typeof AddRecordSpaceModal> = {
  title: 'Components/modals/AddRecordSpaceModal/index/AddRecordSpaceModal',
  component: AddRecordSpaceModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddRecordSpaceModal>;

export const Default: Story = {
  args: {},
};
