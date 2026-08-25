import type { Meta, StoryObj } from '@storybook/nextjs';
import AddCreditsButtonShowcase from './AddCreditsButtonShowcase';

const meta: Meta<typeof AddCreditsButtonShowcase> = {
  title: 'Components/ChatHistorySidebar/AddCreditsButtonShowcase',
  component: AddCreditsButtonShowcase,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddCreditsButtonShowcase>;

export const Default: Story = {
  args: {},
};
