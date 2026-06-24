import type { Meta, StoryObj } from '@storybook/react';
import Image from './editor';

const meta: Meta<typeof Image> = {
  title: 'Components/ContentType/editor/Image',
  component: Image,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Image>;

export const Default: Story = {
  args: {},
};
