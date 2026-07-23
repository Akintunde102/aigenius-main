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
        </div>
    )
}));

jest.mock('../ModelSelectionGrid', () => ({
    ModelSelectionGrid: ({ models = [], sections, emptyState }: any) => {
        const allModels = sections?.length
            ? sections.flatMap((section: any) => section.models)
            : models;
        if (allModels.length === 0 && emptyState) return <>{emptyState}</>;
        return (
            <div data-testid="grid">
                {allModels.map((m: any) => <div key={m.id} data-testid="model-item">{m.name}</div>)}
            </div>
        );
    }
}));

jest.mock('../RecentModelChips', () => ({
    RecentModelChips: () => <div data-testid="recent-chips" />
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
        
        const favTab = screen.getByRole('button', { name: /Favorites/i });
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

    it('renders FavoritesEmptyState when no favorites exist', () => {
        render(<ModelSelectionModal {...defaultProps} pinnedModelIds={[]} favoritesLoaded={false} />);
        // favoritesLoaded false => no auto-switch to "all", so we see the empty state
        expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
    });

    it('renders inside the portal if modal-root exists', () => {
        const modalRoot = document.createElement('div');
        modalRoot.setAttribute('id', 'modal-root');
        document.body.appendChild(modalRoot);
        
        render(<ModelSelectionModal {...defaultProps} />);
        
        // Use container query or check child relationship
        expect(modalRoot).toContainElement(screen.getByText('Select Model'));
        
        // Clean up
        document.body.removeChild(modalRoot);
    });
});
