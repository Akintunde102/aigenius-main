import React from "react";

interface FavoritesEmptyStateProps {
  onBrowse: () => void;
}

export function FavoritesEmptyState({ onBrowse }: FavoritesEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
      <div className="text-4xl select-none">⭐</div>
      <div>
        <p className="text-gray-700 dark:text-zinc-200 font-semibold text-base mb-1">No favourites yet</p>
        <p className="text-gray-400 dark:text-zinc-500 text-sm max-w-xs">
          You&apos;ve removed all your favourites. Head over to <span className="font-medium text-gray-600 dark:text-zinc-300">All Models</span> to pin the ones you use most.
        </p>
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="app-modal-btn-primary inline-flex gap-2 px-4 py-2 text-sm shadow-sm"
      >
        Browse All Models
      </button>
    </div>
  );
}
