import type { Meta, StoryObj } from '@storybook/react';
import Login from './page';

const meta: Meta<typeof Login> = {
  title: 'Pages/login',
  component: Login,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Login>;

export const Default: Story = {
  args: {},
};
