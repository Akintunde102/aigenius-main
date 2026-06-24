const composerShell =
    "relative overflow-hidden rounded-2xl border shadow-none [background-color:var(--chat-composer-bg)] [border-color:var(--chat-composer-border)]";

export const getContainerStyles = (_sidebarStyle: boolean) => ({
    container: composerShell,
    inputArea:
        "flex min-h-[30px] items-start bg-transparent px-3 pt-3 pb-1 [background-clip:padding-box]",
});

export const getModalityIconColor = (modality: string, sidebarStyle: boolean) => {
    const baseClass = sidebarStyle ? "" : "";

    if (modality.toLowerCase().includes("text")) {
        return "text-[#3B82F6]";
    }
    if (modality.toLowerCase().includes("image")) {
        return "text-[#DB2777]";
    }
    if (modality.toLowerCase().includes("audio")) {
        return "text-[#059669]";
    }
    if (modality.toLowerCase().includes("video")) {
        return "text-[#475569]";
    }
    return "text-[#94A3B8]";
};
