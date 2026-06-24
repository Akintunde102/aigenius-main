import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';

interface AddCreditsButtonProps {
    onClick: () => void;
    variant?: 'compact' | 'standard' | 'prominent';
}

/**
 * AddCreditsButton Component
 * 
 * A well-designed button for adding credits to the wallet that follows
 * the AIGenius design system principles.
 * 
 * Features:
 * - Three variants for different use cases
 * - Smooth hover and active states
 * - Accessible with proper ARIA labels
 * - Micro-interactions for better UX
 * - Consistent with design system colors
 */
const AddCreditsButton: React.FC<AddCreditsButtonProps> = ({ 
    onClick, 
    variant = 'standard' 
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Compact variant - minimal footprint, inline with credits
    if (variant === 'compact') {
        return (
            <button
                aria-label="Add Credits"
                className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 active:scale-95 group"
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title="Add credits to your wallet"
            >
                <FiPlus 
                    size={14} 
                    className="transition-transform duration-200 group-hover:scale-110" 
                    strokeWidth={2.5}
                />
            </button>
        );
    }

    // Standard variant - slightly larger with more visual weight
    if (variant === 'standard') {
        return (
            <button
                aria-label="Add Credits"
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 border border-blue-200 hover:from-blue-500 hover:to-blue-600 hover:text-white hover:border-blue-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 active:scale-95 group"
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title="Add credits to your wallet"
            >
                <FiPlus 
                    size={12} 
                    className="transition-transform duration-200 group-hover:rotate-90" 
                    strokeWidth={3}
                />
                <span className="text-[10px] font-semibold">Add</span>
            </button>
        );
    }

    // Prominent variant - most visible, for emphasis
    if (variant === 'prominent') {
        return (
            <button
                aria-label="Add Credits"
                className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-700 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-95 group overflow-hidden"
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title="Add credits to your wallet"
            >
                {/* Shine effect on hover */}
                <div 
                    className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform transition-transform duration-500 ${
                        isHovered ? 'translate-x-full' : '-translate-x-full'
                    }`}
                    style={{ width: '50%' }}
                />
                
                <div className="relative flex items-center gap-1.5">
                    <FiPlus 
                        size={14} 
                        className="transition-all duration-200 group-hover:rotate-90 group-hover:scale-110" 
                        strokeWidth={2.5}
                    />
                    <span className="text-xs font-semibold">Add Credits</span>
                </div>
            </button>
        );
    }

    return null;
};

export default AddCreditsButton;
