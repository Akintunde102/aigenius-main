import React, { useState } from 'react';
import { ToolExecution } from '@/app/components/model-interface/shared/types';
import { FiTool, FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { getToolDisplayName } from './toolDisplayNames';

interface ToolExecutionDisplayProps {
    tool_executions: ToolExecution[];
}

export function ToolExecutionDisplay({ tool_executions }: ToolExecutionDisplayProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (!tool_executions || tool_executions.length === 0) {
        return null;
    }

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const getToolIcon = (_toolName: string) => {
        return <FiTool className="text-blue-600" size={14} />;
    };

    const parseResult = (result: string) => {
        try {
            return JSON.parse(result);
        } catch {
            return { raw: result };
        }
    };

    const isSuccess = (result: string) => {
        const parsed = parseResult(result);
        return !parsed.error;
    };

    return (
        <div className="my-3 space-y-2">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                <FiTool size={12} />
                <span>Tool Executions ({tool_executions.length})</span>
            </div>
            
            {tool_executions.map((execution, index) => {
                const success = isSuccess(execution.result);
                const parsed = parseResult(execution.result);
                const isExpanded = expandedIndex === index;

                return (
                    <div 
                        key={index}
                        className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
                    >
                        {/* Header */}
                        <button
                            onClick={() => toggleExpand(index)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {getToolIcon(execution.tool)}
                                <span className="text-sm font-medium text-gray-700">
                                    {getToolDisplayName(execution.tool)}
                                </span>

                                {success ? (
                                    <FiCheckCircle className="text-green-600" size={14} />
                                ) : (
                                    <FiAlertCircle className="text-red-600" size={14} />
                                )}
                            </div>
                            {isExpanded ? (
                                <FiChevronUp className="text-gray-500" size={16} />
                            ) : (
                                <FiChevronDown className="text-gray-500" size={16} />
                            )}
                        </button>

                        {/* Details */}
                        {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-200 bg-white">
                                {/* Arguments */}
                                {Object.keys(execution.arguments).length > 0 && (
                                    <div className="mb-2">
                                        <div className="text-xs font-semibold text-gray-600 mb-1">Input:</div>
                                        <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100 space-y-1">
                                            {Object.entries(execution.arguments).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="font-medium text-blue-900">{key}:</span>
                                                    <span className="text-gray-700 break-all">
                                                        {typeof value === 'string' ? value : JSON.stringify(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Result */}
                                <div>
                                    <div className="text-xs font-semibold text-gray-600 mb-1">Result:</div>
                                    <div className={`text-xs p-2 rounded border ${
                                        success 
                                            ? 'bg-green-50 border-green-100' 
                                            : 'bg-red-50 border-red-100'
                                    }`}>
                                        {parsed.error ? (
                                            <div className="text-red-700 font-medium">
                                                Error: {valueToDisplayString(parsed.error)}
                                            </div>
                                        ) : parsed.message ? (
                                            <div className="text-green-700 font-medium">
                                                {valueToDisplayString(parsed.message)}
                                            </div>
                                        ) : parsed.messages ? (
                                            <div className="space-y-1">
                                                <div className="text-gray-700 font-medium">
                                                    Found {parsed.messages.length} email(s)
                                                </div>
                                                {parsed.messages.slice(0, 3).map((msg: any, i: number) => (
                                                    <div key={i} className="text-gray-600 pl-2 border-l-2 border-green-300">
                                                        {valueToDisplayString(
                                                            msg.subject ?? msg.snippet ?? 'No subject',
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <pre className="text-gray-700 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                                                {JSON.stringify(parsed, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="mt-2 text-xs text-gray-400">
                                    {new Date(execution.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
