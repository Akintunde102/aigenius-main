import type { Meta, StoryObj } from '@storybook/react';
import useFileContext from './FileContext';

const meta: Meta<typeof useFileContext> = {
  title: 'Components/file/FileContext/useFileContext',
  component: useFileContext,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof useFileContext>;

export const Default: Story = {
  args: {},
};
