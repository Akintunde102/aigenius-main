import type { Meta, StoryObj } from '@storybook/nextjs';
import { AuthNav as AuthNav } from './AuthNav';

const meta: Meta<typeof AuthNav> = {
  title: 'Components/auth/AuthNav',
  component: AuthNav,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AuthNav>;

export const Default: Story = {
  args: {},
};
