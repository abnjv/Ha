import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeProvider';
import { AuthProvider } from '../../context/AuthContext';
import HomeScreen from './HomeScreen';

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { uid: 'test-user-id' },
      userProfile: { name: 'Test User', avatar: 'https://placehold.co/128' },
      isLoading: false,
      logout: vi.fn(),
      sendNotification: vi.fn(),
      updateUserProfile: vi.fn(),
      socket: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
        id: 'test-socket-id',
      },
      db: {},
      storage: {},
      auth: {},
      appId: 'test-app-id',
    }),
  };
});

const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          {ui}
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('HomeScreen Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main dashboard headings', async () => {
    renderWithProviders(<HomeScreen />);
    expect(await screen.findByRole('heading', { name: /publicRooms/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /recentChats/i })).toBeInTheDocument();
  });

  it('renders the browse and all chats buttons', async () => {
    renderWithProviders(<HomeScreen />);
    expect(await screen.findByRole('button', { name: /browseAllRooms/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /allChats/i })).toBeInTheDocument();
  });
});
