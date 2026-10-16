import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MeModal from './MeModal';
import { getUserDetails } from '@/lib/calls/get-logged-user-details';

jest.mock('@/lib/calls/get-logged-user-details', () => ({
  getUserDetails: jest.fn(),
}));

jest.mock('@/lib/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
    languageInfo: { code: 'en' },
  }),
}));

const mockGetUserDetails = getUserDetails as jest.MockedFunction<typeof getUserDetails>;

describe('MeModal', () => {
  beforeEach(() => {
    const root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
    mockGetUserDetails.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      verified: true,
      pricePlan: 'pro',
      createdAt: '2024-01-10T00:00:00.000Z',
      config: { wallet: 42.5 },
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('loads account details and closes on escape', async () => {
    const onClose = jest.fn();
    render(<MeModal onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    });
    expect(mockGetUserDetails).toHaveBeenCalledWith(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
