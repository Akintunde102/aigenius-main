/**
 * Lightweight UX when a reply finishes on a conversation that is not open in the main pane.
 */
export async function notifyBackgroundConversationReady(options: {
  title: string;
}): Promise<void> {
  const label = options.title.trim() || 'Chat';
  const { toast } = await import('react-hot-toast');
  toast(`Reply ready in ${label}`, { duration: 4500 });
}
