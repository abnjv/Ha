import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeProvider';
import HomeScreen from './HomeScreen';

// Mock the useAuth hook to provide a dummy user
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { uid: 'test-user-id' },
      logout: vi.fn(),
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

describe('HomeScreen', () => {
  it('renders the main heading after async operations', async () => {
    renderWithProviders(<HomeScreen />);

    // Use findBy* queries to wait for async state updates to complete
    const headingElement = await screen.findByRole('heading', { name: /مرحباً في AirChat!/i });
    expect(headingElement).toBeInTheDocument();
  });

  it('renders the chat rooms button after async operations', async () => {
    renderWithProviders(<HomeScreen />);

    const chatRoomsButton = await screen.findByRole('button', { name: /غرف المحادثة/i });
    expect(chatRoomsButton).toBeInTheDocument();
  });
});
