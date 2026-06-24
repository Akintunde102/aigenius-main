import type { Meta, StoryObj } from '@storybook/react';
import { MobileToggleButton as MobileToggleButton } from './MobileToggleButton';

const meta: Meta<typeof MobileToggleButton> = {
  title: 'Components/model-interface/features/mobile/components/MobileToggleButton',
  component: MobileToggleButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MobileToggleButton>;

export const Default: Story = {
  args: {},
};
