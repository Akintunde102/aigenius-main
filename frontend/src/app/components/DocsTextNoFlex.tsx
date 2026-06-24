import React from "react";

interface DocsTextNoFlex {
    title: string;
    text: string;
}

const DocsTextNoFlex: React.FC<DocsTextNoFlex> = ({ title, text }) => {
    return (
        <div className="mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200 hover:bg-white/80 transition-all duration-200">
            <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 text-xs font-medium rounded-md border border-blue-200 mb-2">
                        {title}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DocsTextNoFlex;
