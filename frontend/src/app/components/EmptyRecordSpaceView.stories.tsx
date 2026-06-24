import type { Meta, StoryObj } from '@storybook/react';
import { EmptyRecordSpaceView as EmptyRecordSpaceView } from './EmptyRecordSpaceView';

const meta: Meta<typeof EmptyRecordSpaceView> = {
  title: 'Components/EmptyRecordSpaceView',
  component: EmptyRecordSpaceView,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof EmptyRecordSpaceView>;

export const Default: Story = {
  args: {},
};
