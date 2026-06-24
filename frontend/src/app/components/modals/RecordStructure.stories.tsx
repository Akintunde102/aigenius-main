import type { Meta, StoryObj } from '@storybook/react';
import { FieldDisplay as FieldDisplay } from './RecordStructure';

const meta: Meta<typeof FieldDisplay> = {
  title: 'Components/modals/RecordStructure/FieldDisplay',
  component: FieldDisplay,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FieldDisplay>;

export const Default: Story = {
  args: {},
};
