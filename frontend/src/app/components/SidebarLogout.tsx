import React from "react";

const SidebarLogout = ({ onLogout }: { onLogout: () => void }) => (
    <ul className="mb-5 w-full">
        <li className="flex items-center w-full">
            <a className="w-full" onClick={onLogout}>
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
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <p className="pl-4">Logout</p>
            </a>
        </li>
    </ul>
);

export default SidebarLogout; 