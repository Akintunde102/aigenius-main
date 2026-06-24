import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelectionModal as ModelSelectionModal } from './ModelSelectionModal';

const meta: Meta<typeof ModelSelectionModal> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionModal',
  component: ModelSelectionModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionModal>;

export const Default: Story = {
  args: {},
};
