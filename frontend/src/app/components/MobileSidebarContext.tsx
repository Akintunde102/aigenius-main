"use client";
import React, { createContext, useContext } from "react";

export interface MobileSidebarContextType {
    isMobile: boolean;
    mainSidebarVisible: boolean;
    setMainSidebarVisible: (visible: boolean) => void;
}

export const MobileSidebarContext = createContext<MobileSidebarContextType>({
    isMobile: false,
    mainSidebarVisible: false,
    setMainSidebarVisible: () => { },
});

export const useMobileSidebar = () => useContext(MobileSidebarContext);