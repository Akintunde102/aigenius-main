import type { Meta, StoryObj } from '@storybook/react';
import DocsTextNoFlex from './DocsTextNoFlex';

const meta: Meta<typeof DocsTextNoFlex> = {
  title: 'Components/DocsTextNoFlex',
  component: DocsTextNoFlex,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DocsTextNoFlex>;

export const Default: Story = {
  args: {},
};
