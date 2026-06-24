import type { Meta, StoryObj } from '@storybook/react';
import { FieldInput as FieldInput } from './FieldInput';

const meta: Meta<typeof FieldInput> = {
  title: 'Components/modals/AddRecordSpaceModal/FieldInput',
  component: FieldInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FieldInput>;

export const Default: Story = {
  args: {},
};
