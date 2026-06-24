import type { Meta, StoryObj } from '@storybook/react';
import SignUp from './page';

const meta: Meta<typeof SignUp> = {
  title: 'Pages/signup',
  component: SignUp,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SignUp>;

export const Default: Story = {
  args: {},
};
