import type { Meta, StoryObj } from '@storybook/react';
import { PublicHeader as PublicHeader } from './PublicPageShellClient';

const meta: Meta<typeof PublicHeader> = {
  title: 'Components/PublicPageShellClient/PublicHeader',
  component: PublicHeader,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PublicHeader>;

export const Default: Story = {
  args: {},
};
