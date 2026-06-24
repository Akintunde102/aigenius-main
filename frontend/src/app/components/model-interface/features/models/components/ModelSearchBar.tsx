import React from 'react';

interface ModelSearchBarProps {
    search: string;
    setSearch: (search: string) => void;
    placeholder?: string;
    className?: string;
    isMobile?: boolean;
}

export const ModelSearchBar: React.FC<ModelSearchBarProps> = React.memo(({
    search,
    setSearch,
    placeholder = "Search models...",
    className = "",
    isMobile = false
}) => {
    const [localSearch, setLocalSearch] = React.useState(search);

    // Sync from prop to local (e.g. if cleared from parent)
    React.useEffect(() => {
        setLocalSearch(search);
    }, [search]);

    // Debounce sync from local to parent
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== search) setSearch(localSearch);
        }, 150);
        return () => clearTimeout(timer);
    }, [localSearch, setSearch, search]);

    return (
        <div className={`${isMobile ? 'mb-2' : 'mb-3'} ${className}`}>
            <input
                type="text"
                placeholder={placeholder}
                className={`border border-[#e6e8f9] focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg w-full transition ${isMobile
                        ? 'px-2 py-1.5 text-xs'
                        : 'px-3 py-2 text-sm'
                    }`}
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
            />
        </div>
    );
});

ModelSearchBar.displayName = 'ModelSearchBar'; 