import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// Mock AuthContext
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { uid: 'test-user-id', displayName: 'Test User' },
      logout: vi.fn(),
      db: {}, // This is now safe because firestore functions are mocked
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
    // Reset mocks before each test if needed
    vi.clearAllMocks();
  });

  it('renders the main dashboard headings', async () => {
    renderWithProviders(<HomeScreen />);

    // Use findBy* to wait for the component to render after async operations
    expect(await screen.findByRole('heading', { name: /Public Rooms/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Recent Chats/i })).toBeInTheDocument();
  });

  it('renders the browse and all chats buttons', async () => {
    renderWithProviders(<HomeScreen />);

    expect(await screen.findByRole('button', { name: /Browse All Rooms.../i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /All Chats.../i })).toBeInTheDocument();
  });
});
