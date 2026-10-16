import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageProvider } from '@/lib/providers/LanguageProvider';
import { SiteHeader } from '../SiteHeader';
import { SiteFooter } from '../SiteFooter';
import { PublicPageShell } from '@/app/components/PublicPageShell';

// Mock framer-motion to simplify DOM output
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, animate, transition, exit, viewport, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, whileInView, initial, animate, transition, exit, viewport, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollY: { on: () => () => {} } }),
  useMotionValueEvent: () => {},
  useReducedMotion: () => false,
  useTransform: () => 0,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

describe('Published conversations and pages crawlability & navigation links', () => {
  it('renders crawlable anchor links to published conversations and published pages in SiteHeader', () => {
    render(
      <LanguageProvider>
        <SiteHeader initialPlatform="windows" />
      </LanguageProvider>,
    );

    const convLinks = screen.getAllByRole('link', { name: /Published conversations/i });
    expect(convLinks.length).toBeGreaterThanOrEqual(1);
    expect(convLinks.some((link) => link.getAttribute('href') === '/published-conversations')).toBe(true);

    const pagesLinks = screen.getAllByRole('link', { name: /Published pages/i });
    expect(pagesLinks.length).toBeGreaterThanOrEqual(1);
    expect(pagesLinks.some((link) => link.getAttribute('href') === '/h')).toBe(true);
  });

  it('renders crawlable anchor links to published conversations and published pages in SiteFooter', () => {
    render(
      <LanguageProvider>
        <SiteFooter />
      </LanguageProvider>,
    );

    const convLink = screen.getByRole('link', { name: /Published conversations/i });
    expect(convLink).toHaveAttribute('href', '/published-conversations');

    const pagesLink = screen.getByRole('link', { name: /Published pages/i });
    expect(pagesLink).toHaveAttribute('href', '/h');
  });

  it('renders crawlable anchor links in PublicPageShell header and footer', () => {
    render(
      <LanguageProvider>
        <PublicPageShell>
          <div>Public content</div>
        </PublicPageShell>
      </LanguageProvider>,
    );

    const convLinks = screen.getAllByRole('link', { name: /Published conversations/i });
    expect(convLinks.length).toBeGreaterThanOrEqual(1);
    expect(convLinks.some((link) => link.getAttribute('href') === '/published-conversations')).toBe(true);

    const pagesLinks = screen.getAllByRole('link', { name: /Published pages/i });
    expect(pagesLinks.length).toBeGreaterThanOrEqual(1);
    expect(pagesLinks.some((link) => link.getAttribute('href') === '/h')).toBe(true);
  });
});
