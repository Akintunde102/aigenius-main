import type { Meta, StoryObj } from '@storybook/react';
import { MMenu as MMenu } from './MMenu';

const meta: Meta<typeof MMenu> = {
  title: 'Components/MMenu',
  component: MMenu,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MMenu>;

export const Default: Story = {
  args: {},
};
