import type { Meta, StoryObj } from '@storybook/nextjs';
import { ModelListSidebarOptimized as ModelListSidebarOptimized } from './ModelListSidebarOptimized';

const meta: Meta<typeof ModelListSidebarOptimized> = {
  title: 'Components/model-interface/features/models/components/ModelListSidebarOptimized',
  component: ModelListSidebarOptimized,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelListSidebarOptimized>;

export const Default: Story = {
  args: {},
};
