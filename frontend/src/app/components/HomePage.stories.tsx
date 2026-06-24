import type { Meta, StoryObj } from '@storybook/react';
import HomePage from './HomePage';

const meta: Meta<typeof HomePage> = {
  title: 'Components/HomePage',
  component: HomePage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {
  args: {},
};
