"use client";

export const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating orbs */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-primary rounded-full opacity-20 animate-float"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-primary rounded-full opacity-20 animate-float-delayed"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-primary rounded-full opacity-10 animate-pulse-glow"></div>

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-primary/5"></div>
        </div>
    );
};
