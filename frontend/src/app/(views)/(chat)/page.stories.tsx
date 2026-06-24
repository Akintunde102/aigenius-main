import type { Meta, StoryObj } from '@storybook/react';
import HomePageWrapper from './page';

const meta: Meta<typeof HomePageWrapper> = {
  title: 'Pages',
  component: HomePageWrapper,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof HomePageWrapper>;

export const Default: Story = {
  args: {},
};
