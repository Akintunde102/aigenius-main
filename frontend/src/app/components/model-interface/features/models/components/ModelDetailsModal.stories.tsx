import type { Meta, StoryObj } from '@storybook/react';
import { ModelDetailsModal as ModelDetailsModal } from './ModelDetailsModal';

const meta: Meta<typeof ModelDetailsModal> = {
  title: 'Components/model-interface/features/models/components/ModelDetailsModal',
  component: ModelDetailsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelDetailsModal>;

export const Default: Story = {
  args: {},
};
