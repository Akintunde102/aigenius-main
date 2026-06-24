import type { Meta, StoryObj } from '@storybook/react';
import { StructureFieldButtonInput as StructureFieldButtonInput } from './StructureFieldButtons';

const meta: Meta<typeof StructureFieldButtonInput> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureFieldButtons/StructureFieldButtonInput',
  component: StructureFieldButtonInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureFieldButtonInput>;

export const Default: Story = {
  args: {},
};
