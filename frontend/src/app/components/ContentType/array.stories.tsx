import type { Meta, StoryObj } from '@storybook/react';
import Arr from './array';

const meta: Meta<typeof Arr> = {
  title: 'Components/ContentType/array/Arr',
  component: Arr,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Arr>;

export const Default: Story = {
  args: {},
};
