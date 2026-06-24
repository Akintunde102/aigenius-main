import type { Meta, StoryObj } from '@storybook/react';
import ModelListSidebar from './ModelListSidebar';

const meta: Meta<typeof ModelListSidebar> = {
  title: 'Components/ModelListSidebar',
  component: ModelListSidebar,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelListSidebar>;

export const Default: Story = {
  args: {},
};
