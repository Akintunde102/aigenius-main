import type { Meta, StoryObj } from '@storybook/react';
import { FileTemplate as FileTemplate } from './FileTemplate';

const meta: Meta<typeof FileTemplate> = {
  title: 'Components/file/FileTemplate',
  component: FileTemplate,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileTemplate>;

export const Default: Story = {
  args: {},
};
