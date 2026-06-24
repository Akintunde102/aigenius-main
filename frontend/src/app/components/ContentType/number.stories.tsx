import type { Meta, StoryObj } from '@storybook/react';
import InputNumber from './number';

const meta: Meta<typeof InputNumber> = {
  title: 'Components/ContentType/number/InputNumber',
  component: InputNumber,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof InputNumber>;

export const Default: Story = {
  args: {},
};
