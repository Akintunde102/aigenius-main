import type { Meta, StoryObj } from '@storybook/react';
import ModelSelectionDetailsModal from './ModelSelectionDetailsModal';

const meta: Meta<typeof ModelSelectionDetailsModal> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionDetailsModal',
  component: ModelSelectionDetailsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionDetailsModal>;

export const Default: Story = {
  args: {},
};
