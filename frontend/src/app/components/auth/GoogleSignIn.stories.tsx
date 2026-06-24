import type { Meta, StoryObj } from '@storybook/react';
import GoogleSignIn from './GoogleSignIn';

const meta: Meta<typeof GoogleSignIn> = {
  title: 'Components/auth/GoogleSignIn',
  component: GoogleSignIn,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof GoogleSignIn>;

export const Default: Story = {
  args: {},
};
