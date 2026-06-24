import type { Meta, StoryObj } from '@storybook/react';
import DocsText from './DocsText';

const meta: Meta<typeof DocsText> = {
  title: 'Components/DocsText',
  component: DocsText,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DocsText>;

export const Default: Story = {
  args: {},
};
