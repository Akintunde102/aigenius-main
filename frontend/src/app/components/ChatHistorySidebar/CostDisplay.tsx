import React from "react";
import { ChatSession, Model } from '@/app/components/model-interface/shared/types';
import { formatCost } from '@/lib/utils/modelInterfaceUtils';
import { getSessionTotalCost } from '@/lib/utils/chatCostUtils';

interface CostDisplayProps {
    chatHistory: (ChatSession & { id?: string })[];
    models: Model[];
}

const CostDisplay: React.FC<CostDisplayProps> = React.memo(({ chatHistory, models }) => {
    const allConversationsUSD = React.useMemo(() => {
        return (chatHistory || []).reduce((sum, session) => {
            return sum + getSessionTotalCost(session, models || []);
        }, 0);
    }, [chatHistory, models]);

    return (
        <div className="pointer-events-none absolute left-0 top-0 z-20 w-full bg-transparent">
            <div className="px-3 pb-0.5 pt-1.5">
                <span className="text-[10px] font-medium text-slate-400">
                    {chatHistory && chatHistory.length > 0
                        ? `Total cost: ${formatCost(allConversationsUSD, false)}, ${formatCost(allConversationsUSD, true)}`
                        : "No conversations yet"}
                </span>
            </div>
        </div>
    );
});

export default CostDisplay;
