import type { Meta, StoryObj } from '@storybook/react';
import ClearCachesOnReload from './ClearCachesOnReload';

const meta: Meta<typeof ClearCachesOnReload> = {
  title: 'Components/ClearCachesOnReload',
  component: ClearCachesOnReload,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ClearCachesOnReload>;

export const Default: Story = {
  args: {},
};
