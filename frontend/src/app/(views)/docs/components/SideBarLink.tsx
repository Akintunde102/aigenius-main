'use client'

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SideBarLink({
    href,
    title,
    onClick
}: {
    href: string;
    title: string;
    onClick?: () => void;
}) {
    const pathname = usePathname();

    return (
        <div className="px-2">
            <Link
                className={
                    pathname == href
                        ? "bg-blue-50 text-blue-700 font-semibold flex gap-3 px-4 py-3 items-center rounded-lg border border-blue-200 shadow-sm transition-all duration-200"
                        : "flex gap-3 px-4 py-3 items-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                }
                href={href}
                onClick={onClick}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    fill="none"
                    className="flex-shrink-0"
                >
                    <path
                        fill={pathname == href ? "#1d4ed8" : "#6b7280"}
                        d="M21.5 10.9V4.1c0-1.5-.64-2.1-2.23-2.1h-4.04C13.64 2 13 2.6 13 4.1v6.8c0 1.5.64 2.1 2.23 2.1h4.04c1.59 0 2.23-.6 2.23-2.1ZM11 13.1v6.8c0 1.5-.64 2.1-2.23 2.1H4.73c-1.59 0-2.23-.6-2.23-2.1v-6.8c0-1.5-.64-2.1-2.23-2.1v-2.8c0-1.5-.64-2.1-2.23-2.1H4.73C3.14 2 2.5 2.6 2.5 4.1v2.8c0 1.5.64 2.1 2.23 2.1h4.04C10.36 9 11 8.4 11 6.9Z"
                    />
                    <path
                        fill={pathname == href ? "#1d4ed8" : "#6b7280"}
                        d="M21.5 19.9v-2.8c0-1.5-.64-2.1-2.23-2.1h-4.04c-1.59 0-2.23.6-2.23 2.1v2.8c0 1.5.64 2.1 2.23 2.1h4.04c1.59 0 2.23-.6 2.23-2.1ZM11 6.9V4.1C11 2.6 10.36 2 8.77 2H4.73C3.14 2 2.5 2.6 2.5 4.1v2.8c0 1.5.64 2.1 2.23 2.1h4.04C10.36 9 11 8.4 11 6.9Z"
                        opacity={0.4}
                    />
                </svg>
                <span className="text-sm">{title}</span>
            </Link>
        </div>
    );
}
