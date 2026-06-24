import type { Meta, StoryObj } from '@storybook/react';
import GlobalToaster from './GlobalToaster';

const meta: Meta<typeof GlobalToaster> = {
  title: 'Components/GlobalToaster',
  component: GlobalToaster,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof GlobalToaster>;

export const Default: Story = {
  args: {},
};
