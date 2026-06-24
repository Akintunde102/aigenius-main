import type { Meta, StoryObj } from '@storybook/react';
import { StructureFieldInput as StructureFieldInput } from './StructureFieldInput';

const meta: Meta<typeof StructureFieldInput> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureFieldInput',
  component: StructureFieldInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureFieldInput>;

export const Default: Story = {
  args: {},
};
