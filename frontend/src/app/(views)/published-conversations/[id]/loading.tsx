/* Skeleton for the conversation page: a quiet top bar and a few message blocks, tonal and borderless. */
const BLOCK = 'rounded bg-black/[0.07] dark:bg-white/[0.09]';

export default function PublishedConversationDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-4 py-6 motion-reduce:animate-none sm:px-6" aria-hidden="true">
      <div className="mb-8 flex items-center gap-3">
        <div className={`h-4 flex-1 ${BLOCK}`} />
        <div className="h-8 w-8 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" />
        <div className="h-8 w-8 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className={`h-3 w-20 ${BLOCK}`} />
            <div className={`h-3 w-full opacity-80 ${BLOCK}`} />
            <div className={`h-3 w-full opacity-80 ${BLOCK}`} />
            <div className={`h-3 w-2/3 opacity-80 ${BLOCK}`} />
          </div>
        ))}
      </div>
    </div>
  );
}