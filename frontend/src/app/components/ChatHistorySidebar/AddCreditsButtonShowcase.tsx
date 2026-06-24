'use client';
import React, { useState } from 'react';
import AddCreditsButton from './AddCreditsButton';

/**
 * AddCreditsButtonShowcase Component
 * 
 * A showcase page to demonstrate all variants of the AddCreditsButton
 * This is useful for:
 * - Design review and approval
 * - Developer reference
 * - A/B testing preparation
 * - Documentation screenshots
 * 
 * Usage: Import and render this component in a page or Storybook
 */
const AddCreditsButtonShowcase: React.FC = () => {
    const [lastClicked, setLastClicked] = useState<string>('');

    const handleClick = (variant: string) => {
        setLastClicked(variant);
        console.log(`Clicked: ${variant} variant`);
        // In production, this would trigger the actual add credits modal
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Add Credits Button Variants
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Three carefully designed variants for different contexts and user states.
                        Each follows the AIGenius design system and provides excellent UX.
                    </p>
                    {lastClicked && (
                        <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-md">
                            Last clicked: <strong>{lastClicked}</strong> variant
                        </div>
                    )}
                </div>

                {/* Variants Grid */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">

                    {/* Compact Variant */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="mb-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2">
                                Default
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Compact</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Icon-only button for inline use. Perfect for sidebar footer where space is limited.
                            </p>
                        </div>

                        {/* Demo in context */}
                        <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">In context:</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="flex items-center text-[10px] text-gray-400 font-normal">
                                    <span className="mr-1">Credits:</span>
                                    <span>1,234.56</span>
                                </span>
                                <AddCreditsButton
                                    onClick={() => handleClick('Compact')}
                                    variant="compact"
                                />
                            </div>
                        </div>

                        {/* Standalone */}
                        <div className="flex justify-center mb-4">
                            <AddCreditsButton
                                onClick={() => handleClick('Compact')}
                                variant="compact"
                            />
                        </div>

                        {/* Specs */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Size:</span>
                                <span className="font-mono text-gray-900">24×24px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Icon Size:</span>
                                <span className="font-mono text-gray-900">14px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Best For:</span>
                                <span className="text-gray-900">Inline, Compact</span>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Features:</h4>
                            <ul className="space-y-1 text-xs text-gray-600">
                                <li>✓ Icon scales on hover</li>
                                <li>✓ Color transition</li>
                                <li>✓ Button scales on click</li>
                                <li>✓ Focus ring</li>
                            </ul>
                        </div>
                    </div>

                    {/* Standard Variant */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="mb-4">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-2">
                                Recommended for New Users
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Standard</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Icon + text button for better clarity. Great for onboarding and medium prominence.
                            </p>
                        </div>

                        {/* Demo in context */}
                        <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">In context:</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="flex items-center text-[10px] text-gray-400 font-normal">
                                    <span className="mr-1">Credits:</span>
                                    <span>567.89</span>
                                </span>
                                <AddCreditsButton
                                    onClick={() => handleClick('Standard')}
                                    variant="standard"
                                />
                            </div>
                        </div>

                        {/* Standalone */}
                        <div className="flex justify-center mb-4">
                            <AddCreditsButton
                                onClick={() => handleClick('Standard')}
                                variant="standard"
                            />
                        </div>

                        {/* Specs */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Size:</span>
                                <span className="font-mono text-gray-900">~40×24px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Icon Size:</span>
                                <span className="font-mono text-gray-900">12px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Best For:</span>
                                <span className="text-gray-900">Medium emphasis</span>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Features:</h4>
                            <ul className="space-y-1 text-xs text-gray-600">
                                <li>✓ Icon rotates 90° on hover</li>
                                <li>✓ Gradient background</li>
                                <li>✓ Shadow on hover</li>
                                <li>✓ Text + Icon clarity</li>
                            </ul>
                        </div>
                    </div>

                    {/* Prominent Variant */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                        <div className="mb-4">
                            <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-full mb-2">
                                High Priority
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Prominent</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Full button with shine effect. Use when adding credits is critical (low balance).
                            </p>
                        </div>

                        {/* Demo in context */}
                        <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">In context:</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="flex items-center text-[10px] text-red-500 font-semibold">
                                    <span className="mr-1">Credits:</span>
                                    <span>12.34 ⚠️</span>
                                </span>
                                <AddCreditsButton
                                    onClick={() => handleClick('Prominent')}
                                    variant="prominent"
                                />
                            </div>
                        </div>

                        {/* Standalone */}
                        <div className="flex justify-center mb-4">
                            <AddCreditsButton
                                onClick={() => handleClick('Prominent')}
                                variant="prominent"
                            />
                        </div>

                        {/* Specs */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Size:</span>
                                <span className="font-mono text-gray-900">~90×28px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Icon Size:</span>
                                <span className="font-mono text-gray-900">14px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Best For:</span>
                                <span className="text-gray-900">High visibility</span>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Features:</h4>
                            <ul className="space-y-1 text-xs text-gray-600">
                                <li>✓ Shine sweep animation</li>
                                <li>✓ Icon rotates + scales</li>
                                <li>✓ Scale up on hover</li>
                                <li>✓ Premium feel</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Usage Guidelines */}
                <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Usage Guidelines</h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">When to Use</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Compact</h4>
                                    <p className="text-gray-600">
                                        • Normal operation<br />
                                        • Sufficient balance<br />
                                        • Active users<br />
                                        • Space-constrained areas
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Standard</h4>
                                    <p className="text-gray-600">
                                        • New user onboarding<br />
                                        • Medium balance<br />
                                        • First-time visitors<br />
                                        • More space available
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">Prominent</h4>
                                    <p className="text-gray-600">
                                        • Low/empty balance<br />
                                        • Critical warnings<br />
                                        • Encourage action<br />
                                        • Maximum visibility
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Design System</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="font-medium text-gray-900">Colors:</span>
                                    <span className="text-gray-600"> Cyan (primary action)</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Icons:</span>
                                    <span className="text-gray-600"> Feather Icons (FiPlus)</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Transitions:</span>
                                    <span className="text-gray-600"> 200ms smooth</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">States:</span>
                                    <span className="text-gray-600"> Default, Hover, Focus, Active</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Accessibility:</span>
                                    <span className="text-gray-600"> WCAG AA compliant</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-2">Color Swatches</h4>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded bg-cyan-50 border border-gray-200" title="cyan-50"></div>
                                    <div className="w-8 h-8 rounded bg-cyan-500" title="cyan-500"></div>
                                    <div className="w-8 h-8 rounded bg-cyan-600" title="cyan-600"></div>
                                    <div className="w-8 h-8 rounded bg-cyan-700" title="cyan-700"></div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Implementation</h3>
                            <div className="bg-gray-900 rounded-md p-4 text-white text-xs font-mono overflow-x-auto">
                                <pre>{`<AddCreditsButton 
  onClick={handleAdd}
  variant="compact"
/>

// Variants:
// - compact (default)
// - standard
// - prominent`}</pre>
                            </div>

                            <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-2 text-sm">Dynamic Variant Selection</h4>
                                <div className="bg-gray-900 rounded-md p-4 text-white text-xs font-mono overflow-x-auto">
                                    <pre>{`const variant = 
  wallet < 100 
    ? 'prominent' 
    : 'compact';`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Demo */}
                <div className="mt-8 bg-gradient-to-br from-cyan-50 to-emerald-50 rounded-lg shadow-lg p-8 border border-cyan-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Interactive Demo</h2>
                    <p className="text-center text-gray-600 mb-8">
                        Hover and click each button to experience the micro-interactions
                    </p>

                    <div className="flex flex-wrap justify-center items-center gap-8">
                        <div className="text-center">
                            <AddCreditsButton onClick={() => handleClick('Compact (Demo)')} variant="compact" />
                            <p className="mt-2 text-xs text-gray-600">Compact</p>
                        </div>
                        <div className="text-center">
                            <AddCreditsButton onClick={() => handleClick('Standard (Demo)')} variant="standard" />
                            <p className="mt-2 text-xs text-gray-600">Standard</p>
                        </div>
                        <div className="text-center">
                            <AddCreditsButton onClick={() => handleClick('Prominent (Demo)')} variant="prominent" />
                            <p className="mt-2 text-xs text-gray-600">Prominent</p>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-600">
                        <p>Try keyboard navigation: <kbd className="px-2 py-1 bg-white rounded border">Tab</kbd> + <kbd className="px-2 py-1 bg-white rounded border">Enter</kbd></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddCreditsButtonShowcase;
