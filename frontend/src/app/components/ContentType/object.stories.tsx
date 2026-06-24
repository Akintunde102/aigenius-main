import type { Meta, StoryObj } from '@storybook/react';
import Object from './object';

const meta: Meta<typeof Object> = {
  title: 'Components/ContentType/object/Object',
  component: Object,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Object>;

export const Default: Story = {
  args: {},
};
