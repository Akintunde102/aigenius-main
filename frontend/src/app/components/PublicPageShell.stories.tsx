import type { Meta, StoryObj } from '@storybook/react';
import { PAGE_BG as PAGE_BG } from './PublicPageShell';

const meta: Meta<typeof PAGE_BG> = {
  title: 'Components/PublicPageShell/PAGE_BG',
  component: PAGE_BG,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PAGE_BG>;

export const Default: Story = {
  args: {},
};
