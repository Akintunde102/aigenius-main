import React from "react";

interface ChatHistorySearchBarProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    style?: React.CSSProperties;
}

const ChatHistorySearchBar: React.FC<ChatHistorySearchBarProps> = ({ value, onChange, className, style }) => (
    <input
        type="search"
        placeholder="Search conversations..."
        aria-label="Search conversations"
        style={style}
        className={
            className?.trim()
                ? `w-full ${className}`
                : "w-full border border-[#E2E8F0] bg-white px-2 py-1 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/25"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
    />
);

export default ChatHistorySearchBar; 