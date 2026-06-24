import type { Meta, StoryObj } from '@storybook/react';
import { ModelListItem as ModelListItem } from './ModelListItem';

const meta: Meta<typeof ModelListItem> = {
  title: 'Components/model-interface/features/models/components/ModelListItem',
  component: ModelListItem,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelListItem>;

export const Default: Story = {
  args: {},
};
