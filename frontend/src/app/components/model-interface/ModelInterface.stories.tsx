import type { Meta, StoryObj } from '@storybook/react';
import ModelInterface from './ModelInterface';

const meta: Meta<typeof ModelInterface> = {
  title: 'Components/model-interface/ModelInterface',
  component: ModelInterface,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelInterface>;

export const Default: Story = {
  args: {},
};
