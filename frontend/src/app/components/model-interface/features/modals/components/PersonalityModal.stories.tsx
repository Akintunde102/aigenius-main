import type { Meta, StoryObj } from '@storybook/react';
import { PersonalityModal as PersonalityModal } from './PersonalityModal';

const meta: Meta<typeof PersonalityModal> = {
  title: 'Components/model-interface/features/modals/components/PersonalityModal',
  component: PersonalityModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PersonalityModal>;

export const Default: Story = {
  args: {},
};
