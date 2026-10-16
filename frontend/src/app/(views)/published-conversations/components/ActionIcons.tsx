import React from 'react';
import { FiInfo, FiCopy, FiRepeat, FiBookmark } from 'react-icons/fi';
import { Sparkles } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import { useLanguage } from '@/lib/providers/LanguageProvider';

interface ActionIconsProps {
    msg: ChatMessageType;
    isSaved: boolean;
    justSaved: boolean;
    loading: boolean;
    streaming: boolean;
    onCopy: () => void;
    onSave: () => void;
    onReplay: () => void;
    setShowUsageDetails: (show: boolean) => void;
}

export const ActionIcons: React.FC<ActionIconsProps> = ({
    msg,
    isSaved,
    justSaved,
    loading,
    streaming,
    onCopy,
    onSave,
    onReplay,
    setShowUsageDetails
}) => {
    const { t } = useLanguage();
    return (
    <div className="flex gap-2">

        {msg.role === 'assistant' && (
            <button
                className="text-gray-400 hover:text-yellow-500 transition-colors relative"
                title={msg.usage ?
                    `Tokens: ${msg.usage.prompt_tokens} prompt + ${msg.usage.completion_tokens} completion = ${msg.usage.total_tokens} total` :
                    (streaming ? t('chat.calculating') : t('chat.tokenDetails'))
                }
                onClick={() => setShowUsageDetails(true)}
            >
                <FiInfo size={14} />
                {streaming && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
            </button>
        )}

        <button
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title={t('chat.copy')}
            onClick={onCopy}
        >
            <FiCopy size={14} />
        </button>

        <button
            className={
                isSaved
                    ? "text-yellow-500 cursor-not-allowed"
                    : "text-gray-400 hover:text-blue-600 transition-colors"
            }
            title={isSaved ? t('chat.saved') : t('chat.saveMessage')}
            onClick={onSave}
            disabled={isSaved}
            style={{ position: 'relative' }}
        >
            <FiBookmark size={14} />
            {justSaved && (
                <span className="absolute -right-5 top-0 animate-sparkle">
                    <Sparkles size={16} className="text-yellow-400 drop-shadow" />
                </span>
            )}
        </button>

        {msg.role === "user" && (
            <button
                className="text-gray-400 hover:text-green-500 transition-colors"
                title={t('chat.replay')}
                onClick={onReplay}
                disabled={loading}
            >
                <FiRepeat size={14} />
            </button>
        )}
    </div>
    );
};
