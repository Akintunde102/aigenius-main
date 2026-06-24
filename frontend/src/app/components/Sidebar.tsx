'use client';
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LINKS } from "@/lib/links";
import { useRouter } from "next/navigation";
import SidebarLogo from "./SidebarLogo";
import SidebarNav from "./SidebarNav";
import SidebarLogout from "./SidebarLogout";
import { clearAuthSession } from "@/lib/utils/auth-session";

const Sidebar = ({
    showSiteSidebar = true,
    setSidebarVisible }: { showSiteSidebar?: boolean, setSidebarVisible: any }) => {

    const pathname = usePathname();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    // Check if device is mobile
    useEffect(() => {

        const checkMobile = () => {
            // Include tablets and iPads in mobile detection (up to 1024px)
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        router.push(LINKS.internalPages.login.github);
    }

    const handleLinkClick = () => {
        // Close sidebar on mobile when a link is clicked
        if (isMobile) {
            setSidebarVisible(false);
        }
    };

    return (
        <aside className="flex flex-col h-full justify-between gap-4 w-80">
            <ul className="text-[#496080] font-light custom-scrollbar overflow-y-auto">
                <SidebarLogo isMobile={isMobile} onClose={() => setSidebarVisible(false)} />
                <SidebarNav pathname={pathname} onLinkClick={handleLinkClick} />
            </ul>
            <SidebarLogout onLogout={handleLogout} />
        </aside>
    );
};

export default Sidebar;
