import type { Meta, StoryObj } from '@storybook/react';
import ErrorPage from './page';

const meta: Meta<typeof ErrorPage> = {
  title: 'Pages/error',
  component: ErrorPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ErrorPage>;

export const Default: Story = {
  args: {},
};
