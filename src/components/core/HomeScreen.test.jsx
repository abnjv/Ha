import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeProvider';
import HomeScreen from './HomeScreen';

// Mock firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => 'mock collection'),
    query: vi.fn(() => 'mock query'),
    limit: vi.fn(() => 'mock limit'),
    orderBy: vi.fn(() => 'mock orderBy'),
    onSnapshot: vi.fn((query, callback) => {
      // Immediately invoke callback with empty snapshot to simulate no data
      callback({ docs: [] });
      return () => {}; // Return an unsubscribe function
    }),
  };
});

// Mock the entire AuthContext module
vi.mock('../../context/AuthContext', async () => {
  const React = await import('react');
  const AuthContext = React.createContext();
  return {
    AuthProvider: ({ children }) => <>{children}</>, // A dummy provider that does nothing
    useAuth: () => ({
      user: { uid: 'test-user-id', displayName: 'Test User' },
      logout: vi.fn(),
      db: {},
      appId: 'test-app-id',
    }),
    AuthContext,
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
    // Reset mocks before each test if needed
    vi.clearAllMocks();
  });

  it('renders the main dashboard headings', async () => {
    renderWithProviders(<HomeScreen />);

    // Use findBy* to wait for the component to render after async operations
    expect(await screen.findByRole('heading', { name: /publicRooms/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Metaverse Features/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /recentChats/i })).toBeInTheDocument();
  });

  it('renders the browse and all chats buttons', async () => {
    renderWithProviders(<HomeScreen />);

    expect(await screen.findByRole('button', { name: /browseAllRooms/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /allChats/i })).toBeInTheDocument();
  });
});
