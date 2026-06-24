import React from 'react';
import { formatTime } from '@/lib/utils/modelInterfaceUtils';

interface TimeDividerProps {
    timestamp: number;
}

export const TimeDivider: React.FC<TimeDividerProps> = ({ timestamp }) => (
    <div className="w-full flex items-center my-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-xs text-gray-500">{formatTime(timestamp)}</span>
        <div className="flex-grow border-t border-gray-300"></div>
    </div>
);
