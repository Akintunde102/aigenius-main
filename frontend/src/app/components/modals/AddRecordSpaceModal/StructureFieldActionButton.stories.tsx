import type { Meta, StoryObj } from '@storybook/react';
import { StructureFieldActionButton as StructureFieldActionButton } from './StructureFieldActionButton';

const meta: Meta<typeof StructureFieldActionButton> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureFieldActionButton',
  component: StructureFieldActionButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureFieldActionButton>;

export const Default: Story = {
  args: {},
};
