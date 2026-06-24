import React from "react";
import { RiSettings3Line } from "react-icons/ri";
import { LuUploadCloud } from "react-icons/lu";
import { Bot, Sparkles } from "lucide-react";
import SidebarLink from "./SidebarLink";
import { clearAuthSession } from "@/lib/utils/auth-session";

const Spacer = () => <div className="border-t mt-5 pt-5"></div>;

const SidebarNav = ({ pathname, onLinkClick }: { pathname: string, onLinkClick: () => void }) => (
    <div id="sidebar" className="flex flex-col bg-[#fff] gap-y-2">
        <div className="border-t pb-5"></div>
        <SidebarLink
            href="/"
            icon={
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-home"
                >
                    <path d="M9.43414 20.803V13.0557C9.43414 12.5034 9.88186 12.0557 10.4341 12.0557H14.7679C15.3202 12.0557 15.7679 12.5034 15.7679 13.0557V20.803M12.0181 3.48798L5.53031 7.9984C5.26145 8.18532 5.10114 8.49202 5.10114 8.81948L5.10117 18.803C5.10117 19.9075 5.9966 20.803 7.10117 20.803H18.1012C19.2057 20.803 20.1012 19.9075 20.1012 18.803L20.1011 8.88554C20.1011 8.55988 19.9426 8.25462 19.6761 8.06737L13.1639 3.49088C12.8204 3.24951 12.3627 3.24836 12.0181 3.48798Z"></path>
                </svg>
            }
            label="Projects"
            active={pathname === "/"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/logs"
            icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <circle cx="3" cy="6" r="1"></circle>
                    <circle cx="3" cy="12" r="1"></circle>
                    <circle cx="3" cy="18" r="1"></circle>
                </svg>
            }
            label="Logs"
            active={pathname === "/logs"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/access-tokens"
            icon={
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-auth"
                >
                    <path d="M5.24121 15.0674H12.7412M5.24121 15.0674V18.0674H12.7412V15.0674M5.24121 15.0674V12.0674H12.7412V15.0674M15 7.60547V4.60547C15 2.94861 13.6569 1.60547 12 1.60547C10.3431 1.60547 9 2.94861 9 4.60547V7.60547M5.20898 9.60547L5.20898 19.1055C5.20898 20.21 6.10441 21.1055 7.20898 21.1055H16.709C17.8136 21.1055 18.709 20.21 18.709 19.1055V9.60547C18.709 8.5009 17.8136 7.60547 16.709 7.60547L7.20899 7.60547C6.10442 7.60547 5.20898 8.5009 5.20898 9.60547Z"></path>
                </svg>
            }
            label="Access Tokens"
            active={pathname === "/access-tokens"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/config"
            icon={<RiSettings3Line size={20} />}
            label="Config"
            active={pathname === "/config"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/upload"
            icon={<LuUploadCloud size={20} />}
            label="Upload"
            active={pathname === "/upload"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/workflows"
            icon={<Sparkles size={20} />}
            label="Workflows"
            active={pathname === "/workflows"}
            onClick={onLinkClick}
        />
        <Spacer />
        <SidebarLink
            href="/model-interface"
            icon={<Bot size={20} />}
            label="AI Genius"
            active={pathname === "/model-interface"}
            onClick={onLinkClick}
            className="ai-genius-link"
            style={{ backgroundImage: "url('../../assets/element-4.svg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <Spacer />
        <SidebarLink
            href="https://www.docs.nobox.cloud/"
            icon={
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sbui-icon"
                >
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            }
            label="Guides"
            active={pathname === "docs"}
            onClick={onLinkClick}
            target="_blank"
        />
        <SidebarLink
            href="https://hackmd.io/iX7teLb4RL2cnOH5r2i0Ow"
            icon={
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sbui-icon"
                >
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            }
            label="API Reference"
            active={pathname === "api-ref"}
            onClick={onLinkClick}
            target="_blank"
        />
        <SidebarLink
            href="#"  // Using href="#" as a placeholder since it's a button action
            icon={
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-log-out"
                >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            }
            label="Logout"
            active={false}
            className="text-[#496080] hover:bg-gray-100 p-2 rounded"  // Added classes to match existing links
            onClick={() => {
                clearAuthSession();
                window.location.href = '/login';  // Redirect to login
                onLinkClick(); // Call the onLinkClick function to close sidebar if on mobile
            }}
        />
    </div>
);

export default SidebarNav; 
