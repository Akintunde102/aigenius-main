/* Skeleton for the list page: same layout as the new page, tonal shapes, no borders. */
const BLOCK = 'rounded bg-black/[0.07] dark:bg-white/[0.09]';

export default function PublishedConversationsLoading() {
  return (
    <div className="w-full animate-pulse pb-24 motion-reduce:animate-none" aria-hidden="true">
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 sm:px-8 lg:pt-24">
        <div className={`h-14 w-3/4 max-w-xl rounded-xl ${BLOCK}`} />
        <div className={`mt-5 h-5 w-96 max-w-full ${BLOCK}`} />
        <div className="mt-10 h-11 max-w-md rounded-full bg-black/[0.05] dark:bg-white/[0.07]" />

        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-black/[0.04] p-6 dark:bg-white/[0.05]">
              <div className={`h-6 w-4/5 ${BLOCK}`} />
              <div className={`mt-3 h-4 w-full opacity-70 ${BLOCK}`} />
              <div className={`mt-2 h-4 w-3/4 opacity-70 ${BLOCK}`} />
              <div className={`mt-5 h-3 w-full opacity-60 ${BLOCK}`} />
              <div className={`mt-2 h-3 w-5/6 opacity-60 ${BLOCK}`} />
              <div className="mt-8 flex gap-3">
                <div className={`h-3 w-24 opacity-70 ${BLOCK}`} />
                <div className={`h-3 w-20 opacity-70 ${BLOCK}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}