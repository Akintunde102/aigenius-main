import type { Meta, StoryObj } from '@storybook/react';
import { ShareUploadAccess as ShareUploadAccess } from './ShareUploadAccess';

const meta: Meta<typeof ShareUploadAccess> = {
  title: 'Components/modals/ShareUploadAccess',
  component: ShareUploadAccess,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ShareUploadAccess>;

export const Default: Story = {
  args: {},
};
