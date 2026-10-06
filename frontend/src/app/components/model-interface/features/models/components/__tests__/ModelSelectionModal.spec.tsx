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
            {props.onToggleCatalogFilter && (
                <button type="button" onClick={() => props.onToggleCatalogFilter('default')}>
                    Toggle Default Catalog
                </button>
            )}
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

    it('renders the unified model catalog with filters in the sidebar', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        expect(screen.getByTestId('filters')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /All Models/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Quick picks/i })).not.toBeInTheDocument();
    });

    it('syncs sort changes back to parent props via hook', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        fireEvent.click(screen.getByText('Set Cost'));

        expect(defaultProps.setOrderBy).toHaveBeenCalledWith('cost');
    });

    it('syncs filter changes back to parent props via hook', () => {
        render(<ModelSelectionModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Toggle Image'));

        expect(defaultProps.setImageFilterOnly).toHaveBeenCalled();
    });

    it('lists all models using hook sort order', () => {
        render(<ModelSelectionModal {...defaultProps} />);

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
        expect(screen.queryByText('No models found.')).not.toBeInTheDocument();
    });

    it('still lists the catalog while favorites metadata is fetching', () => {
        render(
            <ModelSelectionModal
                {...defaultProps}
                favoritesLoaded={false}
            />,
        );

        expect(screen.queryByRole('status', { name: /loading models/i })).not.toBeInTheDocument();
        expect(screen.getAllByTestId('model-item')).toHaveLength(2);
    });

    it('renders inside the portal if modal-root exists', () => {
        const modalRoot = document.createElement('div');
        modalRoot.setAttribute('id', 'modal-root');
        document.body.appendChild(modalRoot);
        
        render(<ModelSelectionModal {...defaultProps} />);
        
        expect(modalRoot).toContainElement(screen.getByRole('heading', { name: /All Models/i }));
        
        document.body.removeChild(modalRoot);
    });

    it('splits models by wallet affordability when the toggle is clicked', () => {
        const expensiveModel: Model = {
            ...mockModels[1],
            id: 'expensive',
            name: 'Model Expensive',
            averageUserSpendPerRequest: {
                promptCost: 0,
                completionCost: 0,
                expectedImageCost: 0,
                totalAverageCost: 0,
                totalAverageCostCredits: 50,
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

        fireEvent.click(screen.getByText('Toggle Affordability'));

        expect(screen.getByText('Models you can use')).toBeInTheDocument();
        expect(screen.getByText('Need more credits')).toBeInTheDocument();
    });

    it('does not render the Select Model heading', () => {
        render(<ModelSelectionModal {...defaultProps} />);

        expect(screen.queryByText('Select Model')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /All Models/i })).toBeInTheDocument();
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
        const title = screen.getByRole('heading', { name: /All Models/i });

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
