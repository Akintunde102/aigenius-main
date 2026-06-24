import type { Meta, StoryObj } from '@storybook/react';
import { ModalContainer as ModalContainer } from './ModalContainer';

const meta: Meta<typeof ModalContainer> = {
  title: 'Components/model-interface/features/modals/components/ModalContainer',
  component: ModalContainer,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModalContainer>;

export const Default: Story = {
  args: {},
};
