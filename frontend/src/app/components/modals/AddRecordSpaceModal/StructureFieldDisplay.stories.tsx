import type { Meta, StoryObj } from '@storybook/react';
import { StructureFieldDisplay as StructureFieldDisplay } from './StructureFieldDisplay';

const meta: Meta<typeof StructureFieldDisplay> = {
  title: 'Components/modals/AddRecordSpaceModal/StructureFieldDisplay',
  component: StructureFieldDisplay,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructureFieldDisplay>;

export const Default: Story = {
  args: {},
};
