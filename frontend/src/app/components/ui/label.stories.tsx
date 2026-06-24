import type { Meta, StoryObj } from '@storybook/react';
import label from './label';

const meta: Meta<typeof label> = {
  title: 'Components/ui/label',
  component: label,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof label>;

export const Default: Story = {
  args: {},
};
