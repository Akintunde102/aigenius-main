import { useState, useEffect } from 'react';

export const useGlistenEffect = () => {
    const [glisten, setGlisten] = useState(false);

    useEffect(() => {
        // Show glisten on first load only
        setGlisten(true);
        const timeout = setTimeout(() => setGlisten(false), 2200);
        return () => clearTimeout(timeout);
    }, []);

    return glisten;
};