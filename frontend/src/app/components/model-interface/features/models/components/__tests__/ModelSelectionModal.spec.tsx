import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelectionModal } from '../ModelSelectionModal';
import { Model } from '@/app/components/model-interface/shared/types';
import '@testing-library/jest-dom';

// Mock subcomponents
jest.mock('../ModelSelectionFiltersNew', () => ({
    ModelSelectionFiltersNew: (props: any) => (
        <div data-testid="filters">
            <button onClick={() => props.setOrderBy('cost')}>Set Cost</button>
            <button onClick={() => props.setImageFilterOnly(!props.imageFilterOnly)}>Toggle Image</button>
            <button onClick={() => props.setGroupByAffordability(!props.groupByAffordability)}>Toggle Affordability</button>
        </div>
    )
}));

jest.mock('../ModelSelectionGrid', () => ({
    ModelSelectionGrid: ({ models = [], sections, emptyState }: any) => {
        const allModels = sections?.length
            ? sections.flatMap((section: any) => section.models)
            : models;
        if (allModels.length === 0 && emptyState) return <>{emptyState}</>;
        if (allModels.length === 0) return <div>No models found.</div>;
        return (
            <div data-testid="grid">
                {sections?.map((section: any) => (
                    section.title ? (
                        <h3 key={section.title} data-testid="section-title">{section.title}</h3>
                    ) : null
                ))}
                {allModels.map((m: any) => <div key={m.id} data-testid="model-item">{m.name}</div>)}
            </div>
        );
    }
}));

jest.mock('../RecentModelChips', () => ({
    RecentModelChips: ({ onPick, recentModels = [] }: any) => (
        <div data-testid="recent-chips">
            {recentModels.map((model: any) => (
                <button
                    key={model.id}
                    type="button"
                    onClick={() => onPick(model)}
                >
                    {model.name}
                </button>
            ))}
        </div>
    )
}));

jest.mock('../FavoritesEmptyState', () => ({
    FavoritesEmptyState: () => <div data-testid="favorites-empty" />
}));

const mockModels: Model[] = [
    { 
        id: '1', 
        name: 'Model A', 
        provider: 'google', 
        created_at: '2024-01-01T00:00:00Z',
        description: 'Mock A',
        context_length: 8192
    },
    { 
        id: '2', 
        name: 'Model B', 
        provider: 'openai', 
        created_at: '2024-02-01T00:00:00Z',
        description: 'Mock B',
        context_length: 4096
    },
];

describe('ModelSelectionModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        models: mockModels,
        search: '',
        setSearch: jest.fn(),
        selectedModel: null,
        setSelectedModel: jest.fn(),
        selectedModelForDetails: null,
        setSelectedModelForDetails: jest.fn(),
        handleShowModelDetails: jest.fn(),
        pinnedModelIds: [],
        isModelPinned: jest.fn(() => false),
        togglePinModel: jest.fn(),
        recentModels: [],
        orderBy: 'default' as const,
        setOrderBy: jest.fn(),
        orderDir: 'asc' as const,
        setOrderDir: jest.fn(),
        imageFilterOnly: false,
        setImageFilterOnly: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders and switches between tabs', () => {
        render(<ModelSelectionModal {...defaultProps} />);
        
        const favTab = screen.getByRole('button', { name: /Quick picks/i });
        const allTab = screen.getByRole('button', { name: /All Models/i });
        
        expect(favTab).toBeInTheDocument();
        expect(allTab).toBeInTheDocument();

        // Switch to All Models
        fireEvent.click(allTab);
        expect(screen.getByTestId('filters')).toBeInTheDocument();
    });

    it('syncs sort changes back to parent props via hook', () => {
        render(<ModelSelectionModal {...defaultProps} />);
        
        // Go to All Models to see filters
        fireEvent.click(screen.getByRole('button', { name: /All Models/i }));

        // Click the mocked sort button from our mock ModelSelectionFiltersNew
        fireEvent.click(screen.getByText('Set Cost'));

        expect(defaultProps.setOrderBy).toHaveBeenCalledWith('cost');
    });

    it('syncs filter changes back to parent props via hook', () => {
        render(<ModelSelectionModal {...defaultProps} />);
        
        fireEvent.click(screen.getByRole('button', { name: /All Models/i }));
        fireEvent.click(screen.getByText('Toggle Image'));

        expect(defaultProps.setImageFilterOnly).toHaveBeenCalled();
    });

    it('lists all models on the All Models tab using hook sort order', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /All Models/i }));

        const items = screen.getAllByTestId('model-item');
        expect(items[0]).toHaveTextContent('Model A');
        expect(items[1]).toHaveTextContent('Model B');
    });

    it('shows a loading sign on first open while the catalog is still fetching', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                models={[]}
                modelsLoading
                favoritesLoaded={false}
            />,
        );

        expect(screen.getByRole('status', { name: /loading models/i })).toBeInTheDocument();
        expect(screen.queryByTestId('favorites-empty')).not.toBeInTheDocument();
        expect(screen.queryByText('No models found.')).not.toBeInTheDocument();
    });

    it('shows a loading sign on Quick picks while favorites are still fetching', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                pinnedModelIds={[]}
                favoritesLoaded={false}
            />,
        );

        expect(screen.getByRole('status', { name: /loading models/i })).toBeInTheDocument();
        expect(screen.queryByTestId('favorites-empty')).not.toBeInTheDocument();
    });

    it('still lists the catalog on All Models while favorites are fetching', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                favoritesLoaded={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /All Models/i }));

        expect(screen.queryByRole('status', { name: /loading models/i })).not.toBeInTheDocument();
        expect(screen.getAllByTestId('model-item')).toHaveLength(2);
    });

    it('renders FavoritesEmptyState when favorites have loaded and none exist', () => {
        render(<ModelSelectionModal {...defaultProps} pinnedModelIds={[]} favoritesLoaded />);
        fireEvent.click(screen.getByRole('button', { name: /Quick picks/i }));
        expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: /loading models/i })).not.toBeInTheDocument();
    });

    it('renders inside the portal if modal-root exists', () => {
        const modalRoot = document.createElement('div');
        modalRoot.setAttribute('id', 'modal-root');
        document.body.appendChild(modalRoot);
        
        render(<ModelSelectionModal {...defaultProps} />);
        
        // Use container query or check child relationship
        expect(modalRoot).toContainElement(screen.getByText('Models'));
        
        // Clean up
        document.body.removeChild(modalRoot);
    });

    it('splits models by wallet affordability when the toggle is clicked', () => {
        const expensiveModel: Model = {
            ...mockModels[1],
            id: 'expensive',
            name: 'Model Expensive',
            pricing: {
                prompt: '0.05',
                completion: '0.05',
            },
        };

        render(
            <ModelSelectionModal
                {...defaultProps}
                models={[mockModels[0], expensiveModel]}
                wallet={10}
                favoritesLoaded
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'All Models' }));
        fireEvent.click(screen.getByText('Toggle Affordability'));

        expect(screen.getByText('Models you can use')).toBeInTheDocument();
        expect(screen.getByText('Need more credits')).toBeInTheDocument();
    });

    it('splits models by wallet affordability on Quick picks when filter is toggled', () => {
        const expensiveModel: Model = {
            ...mockModels[1],
            id: 'expensive',
            name: 'Model Expensive',
            pricing: {
                prompt: '0.05',
                completion: '0.05',
            },
        };

        render(
            <ModelSelectionModal
                {...defaultProps}
                models={[mockModels[0], expensiveModel]}
                pinnedModelIds={[mockModels[0].id]}
                wallet={10}
                favoritesLoaded
            />,
        );

        expect(screen.getByRole('button', { name: 'Quick picks' })).toHaveClass(
            'app-tab-pill--active',
        );
        fireEvent.click(screen.getByText('Toggle Affordability'));
        expect(screen.getByText('Models you can use')).toBeInTheDocument();
    });

    it('labels the sidebar Models instead of Settings', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        expect(screen.getByText('Models')).toBeInTheDocument();
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('does not render the Select Model heading', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        expect(screen.queryByText('Select Model')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Models$/ })).toBeInTheDocument();
    });

    it('does not render Providers, Provide Feedback, or a user profile in the sidebar', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                models={[
                    { ...mockModels[0], id: 'google/gemini' },
                    { ...mockModels[1], id: 'openai/gpt' },
                ]}
            />,
        );

        expect(screen.queryByText('Providers')).not.toBeInTheDocument();
        expect(screen.queryByText('Provide Feedback')).not.toBeInTheDocument();
        expect(screen.queryByText('Akintunde Jegede')).not.toBeInTheDocument();
        expect(screen.queryByText('akintundejegede2025@gmail.com')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Google' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'OpenAI' })).not.toBeInTheDocument();
    });

    it('renders recently picked above the view title', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                recentModels={[mockModels[0]]}
            />,
        );

        const recent = screen.getByTestId('recent-chips');
        const title = screen.getByRole('heading', { name: /Models$/ });

        expect(recent.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('hides recently picked when there are no recent models', () => {
        render(<ModelSelectionModal {...defaultProps} recentModels={[]} />);

        expect(screen.queryByTestId('recent-chips')).not.toBeInTheDocument();
    });

    it('shows the info modal via handleShowModelDetails when a recently picked model is clicked', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                recentModels={[mockModels[0]]}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Model A' }));

        expect(defaultProps.handleShowModelDetails).toHaveBeenCalledWith(mockModels[0]);
    });
});
