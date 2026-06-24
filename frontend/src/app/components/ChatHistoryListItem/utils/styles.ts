export const getListItemClassName = (
    isActive: boolean,
    isDeleting: boolean,
    isStarring: boolean,
    isStarred = false,
): string => {
    // Adjusted to match Claude aesthetics: compact py, larger px, and more gap.
    const base =
        "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-1 transition-colors duration-100 ease-out motion-reduce:transition-none";
    const state = isActive
        ? "hover:[background-color:var(--sidebar-row-active)] [background-color:var(--sidebar-row-active)]"
        : "bg-transparent hover:[background-color:var(--sidebar-row-hover)]";
    const disabled =
        isDeleting || isStarring ? "pointer-events-none opacity-60" : "";
    /**
     * Starred: no icon — hairline inset + hair-wide letter-spacing so the row reads “slightly
     * different” to peripheral vision without a focal symbol.
     */
    const starredCue = isStarred
        ? "shadow-[inset_1px_0_0_0_rgba(248,250,252,0.045)] tracking-[0.018em]"
        : "";

    return `${base} ${state} ${disabled} ${starredCue}`.trim();
};

export const shouldPreventClick = (
    showDeleteModal: boolean,
    showStarModal: boolean,
    isDeleting: boolean,
    isStarring: boolean
): boolean => {
    return showDeleteModal || showStarModal || isDeleting || isStarring;
};
