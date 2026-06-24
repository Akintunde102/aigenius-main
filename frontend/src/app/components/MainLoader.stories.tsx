import type { Meta, StoryObj } from '@storybook/react';
import { MainLoader as MainLoader } from './MainLoader';

const meta: Meta<typeof MainLoader> = {
  title: 'Components/MainLoader',
  component: MainLoader,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MainLoader>;

export const Default: Story = {
  args: {},
};
