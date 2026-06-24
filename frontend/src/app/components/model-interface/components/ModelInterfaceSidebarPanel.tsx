import React from "react";
import ChatHistorySidebar from "../../ChatHistorySidebar";
import styles from "../ModelInterface.module.scss";

type Props = {
  isMobile: boolean;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
} & React.ComponentProps<typeof ChatHistorySidebar>;

export function ModelInterfaceSidebarPanel({
  isMobile,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  ...sidebarProps
}: Props) {
  const sidebarContent = (
    <>
      {isMobile && (
        <div
          className={`${styles.mobileBackdrop} ${mobileSidebarOpen ? styles.mobileBackdropVisible : styles.mobileBackdropHidden}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden={!mobileSidebarOpen}
        />
      )}
      <ChatHistorySidebar
        {...sidebarProps}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        isMobile={isMobile}
      />
    </>
  );

  if (isMobile) {
    return sidebarContent;
  }

  // Sidebar animates internally; keep outer wrapper fixed to prevent chat jump.
  return <div className="flex shrink-0">{sidebarContent}</div>;
}
