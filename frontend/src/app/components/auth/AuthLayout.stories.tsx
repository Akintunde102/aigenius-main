import type { Meta, StoryObj } from '@storybook/react';
import { AuthLayout as AuthLayout } from './AuthLayout';

const meta: Meta<typeof AuthLayout> = {
  title: 'Components/auth/AuthLayout',
  component: AuthLayout,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AuthLayout>;

export const Default: Story = {
  args: {},
};
