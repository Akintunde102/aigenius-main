import type { Meta, StoryObj } from '@storybook/react';
import NoSSR from './NoSSR';

const meta: Meta<typeof NoSSR> = {
  title: 'Components/NoSSR',
  component: NoSSR,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof NoSSR>;

export const Default: Story = {
  args: {},
};
