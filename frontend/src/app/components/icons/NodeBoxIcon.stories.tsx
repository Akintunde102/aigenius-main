import type { Meta, StoryObj } from '@storybook/react';
import NodeBoxIcon from './NodeBoxIcon';

const meta: Meta<typeof NodeBoxIcon> = {
  title: 'Components/icons/NodeBoxIcon',
  component: NodeBoxIcon,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof NodeBoxIcon>;

export const Default: Story = {
  args: {},
};
