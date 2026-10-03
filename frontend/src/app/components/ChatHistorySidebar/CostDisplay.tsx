import React from "react";
import { ChatSession, Model } from '@/app/components/model-interface/shared/types';
import { formatCredits } from '@/lib/credits';
import { getSessionTotalCostCredits } from '@/lib/utils/chatCostUtils';

interface CostDisplayProps {
    chatHistory: (ChatSession & { id?: string })[];
    models: Model[];
}

const CostDisplay: React.FC<CostDisplayProps> = React.memo(({ chatHistory }) => {
    const allConversationsCredits = React.useMemo(() => {
        return (chatHistory || []).reduce((sum, session) => {
            return sum + getSessionTotalCostCredits(session);
        }, 0);
    }, [chatHistory]);

    return (
        <div className="pointer-events-none absolute left-0 top-0 z-20 w-full bg-transparent">
            <div className="px-3 pb-0.5 pt-1.5">
                <span className="text-[10px] font-medium text-slate-400">
                    {chatHistory && chatHistory.length > 0
                        ? `Total cost: ${formatCredits(allConversationsCredits, { compact: true })}`
                        : "No conversations yet"}
                </span>
            </div>
        </div>
    );
});

CostDisplay.displayName = 'CostDisplay';

export default CostDisplay;
