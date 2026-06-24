# ChatHistorySidebar Component

This directory contains all components related to the chat history sidebar, including the improved Add Credits button.

## Components

### Core Components

- **SidebarHeader** - Top section with search and navigation
- **SidebarContent** - Main scrollable area with chat history
- **SidebarFooter** - Bottom section with credits, branding, and actions
- **CostDisplay** - Shows cost information for chat sessions
- **WalletModal** - Modal for adding credits to wallet

### New Components (Add Credits Feature)

- **AddCreditsButton** - Improved button component with 3 variants
- **AddCreditsButtonShowcase** - Demo page showing all button variants

## Recent Improvements

### Add Credits Button Enhancement

The Plus (+) button for adding credits has been completely redesigned with:

1. **Better UX**: Proper button styling instead of text
2. **Design Consistency**: Matches the blue primary action color scheme
3. **Three Variants**: Compact, Standard, and Prominent
4. **Micro-interactions**: Smooth hover, focus, and active states
5. **Accessibility**: Proper button element with ARIA labels
6. **Mobile-friendly**: Adequate touch targets (min 24x24px)

### Variant Selection

The sidebar footer now accepts an optional `addCreditsButtonVariant` prop:

```tsx
<SidebarFooter
    wallet={wallet}
    onAddCredits={handleAddCredits}
    addCreditsButtonVariant="compact" // compact | standard | prominent
    // ... other props
/>
```

**Default**: `compact` - Used when prop is not provided

### Dynamic Variant Selection Example

You can dynamically change the button variant based on wallet balance:

```tsx
// Show prominent button when balance is low
const buttonVariant = wallet < 100 ? 'prominent' : 'compact';

<SidebarFooter
    wallet={wallet}
    onAddCredits={handleAddCredits}
    addCreditsButtonVariant={buttonVariant}
/>
```

### Variant Use Cases

| Variant | Best For | When to Use |
|---------|----------|-------------|
| **Compact** | Normal operation | Sufficient balance (≥ required credits) |
| **Standard** | New users | Medium balance or onboarding |
| **Prominent** | Critical action | Low balance (< required credits) |

## Files

```
ChatHistorySidebar/
├── index.ts                        # Exports all components
├── SidebarHeader.tsx               # Top section
├── SidebarContent.tsx              # Main content area
├── SidebarFooter.tsx               # Bottom section (includes AddCreditsButton)
├── CostDisplay.tsx                 # Cost information
├── WalletModal.tsx                 # Wallet/payment modal
├── IntegrationsModal.tsx           # Integrations setup
├── AddCreditsButton.tsx            # New: Improved add credits button
├── AddCreditsButtonShowcase.tsx    # New: Demo page for button variants
└── README.md                       # This file
```

## Documentation

For detailed information about the Add Credits button improvements, see (archived notes):

- **Design Analysis**: [`docs/archive/DESIGN_DIRECTION_ANALYSIS.md`](../../../../docs/archive/DESIGN_DIRECTION_ANALYSIS.md)
- **Improvements Details**: [`docs/archive/ADD_CREDITS_BUTTON_IMPROVEMENTS.md`](../../../../docs/archive/ADD_CREDITS_BUTTON_IMPROVEMENTS.md)

## Showcase

To see all button variants in action, import and render the showcase component:

```tsx
import { AddCreditsButtonShowcase } from '@/app/components/ChatHistorySidebar';

// In your page or Storybook
<AddCreditsButtonShowcase />
```

This will display:
- All three button variants
- In-context examples
- Technical specifications
- Usage guidelines
- Interactive demo

## Props

### SidebarFooter Props

```typescript
interface SidebarFooterProps {
    wallet?: number | null;                              // Current wallet balance
    onAddCredits: () => void;                            // Callback when add credits is clicked
    onShowSavedChats?: () => void;                       // Optional: Show saved chats
    onIntegrations?: () => void;                         // Optional: Show integrations
    onLogout?: () => void;                               // Optional: Logout action
    addCreditsButtonVariant?: 'compact' | 'standard' | 'prominent';  // Button variant (default: 'compact')
}
```

### AddCreditsButton Props

```typescript
interface AddCreditsButtonProps {
    onClick: () => void;                                 // Required: Click handler
    variant?: 'compact' | 'standard' | 'prominent';     // Optional: Button variant (default: 'standard')
}
```

## Usage Examples

### Basic Usage (Default Compact)

```tsx
import { SidebarFooter } from '@/app/components/ChatHistorySidebar';

<SidebarFooter
    wallet={wallet}
    onAddCredits={() => setShowWalletModal(true)}
    onShowSavedChats={() => setShowSaved(true)}
    onIntegrations={() => setShowIntegrations(true)}
    onLogout={handleLogout}
/>
```

### With Dynamic Variant

```tsx
import { SidebarFooter } from '@/app/components/ChatHistorySidebar';

// Determine variant based on balance
const getButtonVariant = (balance: number) => {
    if (balance < 100) return 'prominent';
    if (balance < 500) return 'standard';
    return 'compact';
};

<SidebarFooter
    wallet={wallet}
    onAddCredits={() => setShowWalletModal(true)}
    addCreditsButtonVariant={getButtonVariant(wallet)}
    // ... other props
/>
```

### Standalone Button Usage

```tsx
import { AddCreditsButton } from '@/app/components/ChatHistorySidebar';

// Use the button independently
<AddCreditsButton 
    onClick={handleAddCredits} 
    variant="prominent" 
/>
```

## Design System Alignment

The Add Credits button follows the AIGenius design system:

- **Colors**: Blue (primary action) - `blue-50`, `blue-500`, `blue-600`, `blue-700`
- **Icons**: Feather Icons (`react-icons/fi`) - `FiPlus`
- **Transitions**: 200ms smooth transitions
- **Typography**: Font weights and sizes consistent with design tokens
- **Spacing**: Standard padding and gap patterns
- **Accessibility**: WCAG AA compliant with proper focus states

## Testing

### Visual Testing
- [ ] All three variants render correctly
- [ ] Hover states work as expected
- [ ] Active/click states provide feedback
- [ ] Focus rings visible for keyboard navigation
- [ ] Button scales appropriately on interaction

### Functional Testing
- [ ] onClick callback is triggered
- [ ] Button is keyboard accessible (Tab + Enter)
- [ ] Works on touch devices (mobile)
- [ ] Variant prop changes appearance correctly
- [ ] Default variant is 'compact' when not specified

### Accessibility Testing
- [ ] Screen reader announces "Add Credits" button
- [ ] Tab navigation reaches button
- [ ] Button role is properly assigned
- [ ] ARIA labels are correct
- [ ] Color contrast meets WCAG standards

## Future Enhancements

Potential improvements for consideration:

1. **Badge Indicator**: Show red dot when balance is critically low
2. **Pulse Animation**: Subtle pulse when balance < 50 credits
3. **Loading State**: Show spinner during payment processing
4. **Keyboard Shortcut**: Add CMD/CTRL + K shortcut
5. **Haptic Feedback**: Vibration on mobile tap (iOS/Android)
6. **Toast Notification**: "Credits running low" when balance < 100

## Contributing

When modifying these components:

1. Maintain design system consistency
2. Follow accessibility best practices
3. Test on multiple devices and screen sizes
4. Update this README if adding new features
5. Run linter before committing

## Related Components

- **AddToWallet** (modals/AddToWallet.tsx) - The modal opened by this button
- **WalletModal** (WalletModal.tsx) - Wrapper for AddToWallet
- **ChatHistorySidebar** (ChatHistorySidebar.tsx) - Parent component

## Questions?

For questions about:
- Design decisions: See [`docs/archive/DESIGN_DIRECTION_ANALYSIS.md`](../../../../docs/archive/DESIGN_DIRECTION_ANALYSIS.md)
- UX improvements: See [`docs/archive/ADD_CREDITS_BUTTON_IMPROVEMENTS.md`](../../../../docs/archive/ADD_CREDITS_BUTTON_IMPROVEMENTS.md)
- Implementation: Review the component source code
- Demo: Render AddCreditsButtonShowcase component
