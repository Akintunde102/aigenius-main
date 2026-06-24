import React from "react";
import Link from "next/link";

interface SidebarLinkProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
    target?: string;
    className?: string;
    style?: React.CSSProperties;
    badge?: React.ReactNode;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ href, icon, label, active, onClick, target, className = "", style, badge }) => {
    const combinedClassName = `${active ? "active" : ""} ${className}`.trim();
    if (target === "_blank") {
        return (
            <a className={combinedClassName} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} style={style}>
                {icon}
                <span className="pl-5 flex w-full items-center justify-between">
                    <span>{label}</span>
                    {badge && <span className="ml-2 flex-shrink-0">{badge}</span>}
                </span>
            </a>
        );
    }
    return (
        <Link className={combinedClassName} href={href} onClick={onClick} style={style}>
            {icon}
            <span className="pl-5 flex w-full items-center justify-between">
                <span>{label}</span>
                {badge && <span className="ml-2 flex-shrink-0">{badge}</span>}
            </span>
        </Link>
    );
};

export default SidebarLink; 