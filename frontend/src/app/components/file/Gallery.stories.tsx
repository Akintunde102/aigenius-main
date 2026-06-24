import type { Meta, StoryObj } from '@storybook/react';
import Gallery from './Gallery';

const meta: Meta<typeof Gallery> = {
  title: 'Components/file/Gallery',
  component: Gallery,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Gallery>;

export const Default: Story = {
  args: {},
};
