import type { Meta, StoryObj } from '@storybook/react';
import { FavoritesEmptyState as FavoritesEmptyState } from './FavoritesEmptyState';

const meta: Meta<typeof FavoritesEmptyState> = {
  title: 'Components/model-interface/features/models/components/FavoritesEmptyState',
  component: FavoritesEmptyState,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FavoritesEmptyState>;

export const Default: Story = {
  args: {},
};
