/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => {
    return new Proxy({}, { get: () => () => null });
});

import { DefaultToolStreamingCard } from '../DefaultToolStreamingCard';
import { expandDefaultToolCard } from './expand-default-tool-card';

describe('DefaultToolStreamingCard publishing (host_markdown & publish_html)', () => {
    it('renders deterministic links for host_markdown when published', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{
                    tool: 'host_markdown',
                    displayName: 'Host Markdown',
                    logs: [],
                    loading: false,
                    success: true,
                    arguments: { action: 'publish', slug: 'white-house-briefings' },
                }}
                result={JSON.stringify({
                    success: true,
                    action: 'publish',
                    slug: 'white-house-briefings',
                    title: 'White House Briefings',
                    path: '/h/white-house-briefings',
                    url: 'https://aigenius.noboxlabs.xyz/h/white-house-briefings',
                })}
            />,
        );

        const links = screen.getAllByRole('link', { name: /Open page|Open Hosted Page/i });
        expect(links.length).toBeGreaterThan(0);
        expect(links[0]).toHaveAttribute('href', 'https://aigenius.noboxlabs.xyz/h/white-house-briefings');
        expandDefaultToolCard(/Host Markdown/i);
        expect(screen.getByText('/h/white-house-briefings')).toBeInTheDocument();
    });

    it('renders draft link for host_markdown create_draft', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{
                    tool: 'host_markdown',
                    displayName: 'Host Markdown',
                    logs: [],
                    loading: false,
                    success: true,
                    arguments: { action: 'create_draft', slug: 'draft-doc' },
                }}
                result={JSON.stringify({
                    success: true,
                    action: 'create_draft',
                    slug: 'draft-doc',
                    title: 'Draft Document',
                    path: '/h/draft-doc',
                    url: 'https://aigenius.noboxlabs.xyz/h/draft-doc',
                })}
            />,
        );

        const links = screen.getAllByRole('link', { name: /View draft|View Markdown Draft/i });
        expect(links.length).toBeGreaterThan(0);
        expect(links[0]).toHaveAttribute('href', 'https://aigenius.noboxlabs.xyz/h/draft-doc');
    });

    it('does not render open link when host_markdown fails', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{
                    tool: 'host_markdown',
                    displayName: 'Host Markdown',
                    logs: [],
                    loading: false,
                    success: false,
                    arguments: { action: 'publish', slug: 'bad-page' },
                }}
                result={JSON.stringify({
                    success: false,
                    error: 'Validation failed',
                })}
            />,
        );

        expect(screen.queryByRole('link', { name: /Open page|Open Hosted Page/i })).not.toBeInTheDocument();
    });

    it('renders deterministic link for publish_html when published', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{
                    tool: 'publish_html',
                    displayName: 'Publish Web App',
                    logs: [],
                    loading: false,
                    success: true,
                    arguments: { slug: 'counter-app' },
                }}
                result={JSON.stringify({
                    success: true,
                    slug: 'counter-app',
                    title: 'Counter App',
                    status: 'active',
                    url: 'https://counter-app.runpage.site',
                })}
            />,
        );

        const links = screen.getAllByRole('link', { name: /Open app|Open Published Web App/i });
        expect(links.length).toBeGreaterThan(0);
        expect(links[0]).toHaveAttribute('href', 'https://counter-app.runpage.site');
    });
});
