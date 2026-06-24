import React from "react";
import Image from "next/image";
import { RxCross2 } from "react-icons/rx";

const SidebarLogo = ({ isMobile, onClose }: { isMobile: boolean, onClose: () => void }) => (
    <div className="sidebar-logo flex flex-col justify-center py-4 px-4 gap-2">
        {/* Mobile close button */}
        {isMobile && (
            <div className="flex justify-end w-full mb-2">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close sidebar"
                >
                    <RxCross2 size={20} />
                </button>
            </div>
        )}
        <a href="/" onClick={onClose}>
            <div className="lg:pr-2 flex gap-2 items-center">
                <Image
                    src="/logo.png"
                    alt=""
                    width={30}
                    height={30}
                />
                <p className="text-xl font-medium">Nobox</p>
            </div>
        </a>
    </div>
);

export default SidebarLogo; 