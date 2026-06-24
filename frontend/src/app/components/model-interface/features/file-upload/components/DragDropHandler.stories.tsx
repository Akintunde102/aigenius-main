import type { Meta, StoryObj } from '@storybook/react';
import { DragDropHandler as DragDropHandler } from './DragDropHandler';

const meta: Meta<typeof DragDropHandler> = {
  title: 'Components/model-interface/features/file-upload/components/DragDropHandler',
  component: DragDropHandler,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DragDropHandler>;

export const Default: Story = {
  args: {},
};
