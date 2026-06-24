import type { Meta, StoryObj } from '@storybook/react';
import { ModalityIcon as ModalityIcon } from './ModalityIcon';

const meta: Meta<typeof ModalityIcon> = {
  title: 'Components/model-interface/features/models/components/ModalityIcon',
  component: ModalityIcon,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModalityIcon>;

export const Default: Story = {
  args: {},
};
