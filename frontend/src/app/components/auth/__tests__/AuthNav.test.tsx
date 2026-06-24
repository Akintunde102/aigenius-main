import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthNav } from '../AuthNav';
import '@testing-library/jest-dom';

describe('AuthNav', () => {
    it('renders the branding text "AIGenius" with correct styling', () => {
        render(<AuthNav variant="login" />);
        const brandingText = screen.getByText(/AIGenius/i);
        expect(brandingText).toBeInTheDocument();
        expect(brandingText).toHaveClass('bg-clip-text', 'text-transparent', 'bg-gradient-primary');
    });

    it('contains a link to the home page', () => {
        render(<AuthNav variant="login" />);
        const homeLink = screen.getByRole('link', { name: /AIGenius/i });
        expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders signup link when variant is "login"', () => {
        render(<AuthNav variant="login" />);
        expect(screen.getByText(/Don't have an account\? Sign up/i)).toBeInTheDocument();
    });

    it('renders login link when variant is "signup"', () => {
        render(<AuthNav variant="signup" />);
        expect(screen.getByText(/Already have an account\? Sign in/i)).toBeInTheDocument();
    });
});
