import type { Meta, StoryObj } from '@storybook/react';
import { RecordInputForm as RecordInputForm } from './RecordInputForm';

const meta: Meta<typeof RecordInputForm> = {
  title: 'Components/RecordInputForm',
  component: RecordInputForm,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof RecordInputForm>;

export const Default: Story = {
  args: {},
};
