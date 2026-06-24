import type { Meta, StoryObj } from '@storybook/react';
import { StructureTypeFieldInput as StructureTypeFieldInput } from './StructureTypeFieldInput';

const meta: Meta<typeof StructureTypeFieldInput> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureTypeFieldInput',
  component: StructureTypeFieldInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureTypeFieldInput>;

export const Default: Story = {
  args: {},
};
