import type { Meta, StoryObj } from '@storybook/react';
import { findResultLinkFromArgs as findResultLinkFromArgs } from './WorkflowSchemaForm';

const meta: Meta<typeof findResultLinkFromArgs> = {
  title: 'Components/workflows/WorkflowSchemaForm/findResultLinkFromArgs',
  component: findResultLinkFromArgs,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof findResultLinkFromArgs>;

export const Default: Story = {
  args: {},
};
