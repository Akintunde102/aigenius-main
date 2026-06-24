import type { Meta, StoryObj } from '@storybook/react';
import { StructureInputs as StructureInputs } from './StructureInputs';

const meta: Meta<typeof StructureInputs> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureInputs',
  component: StructureInputs,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureInputs>;

export const Default: Story = {
  args: {},
};
