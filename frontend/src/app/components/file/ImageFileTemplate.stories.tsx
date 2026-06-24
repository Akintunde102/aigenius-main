import type { Meta, StoryObj } from '@storybook/react';
import { ImageFileTemplate as ImageFileTemplate } from './ImageFileTemplate';

const meta: Meta<typeof ImageFileTemplate> = {
  title: 'Components/file/ImageFileTemplate',
  component: ImageFileTemplate,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ImageFileTemplate>;

export const Default: Story = {
  args: {},
};
