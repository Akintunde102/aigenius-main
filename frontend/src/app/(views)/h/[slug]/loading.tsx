export default function HostedMarkdownLoading() {
    return (
        <div className="min-h-[50vh] bg-[var(--chat-canvas-bg)] px-4 py-16">
            <div className="mx-auto max-w-3xl animate-pulse space-y-4">
                <div className="h-8 w-2/3 rounded-lg bg-[var(--surface-muted)]" />
                <div className="h-4 w-full rounded bg-[var(--surface-muted)]" />
                <div className="h-4 w-5/6 rounded bg-[var(--surface-muted)]" />
            </div>
        </div>
    );
}
