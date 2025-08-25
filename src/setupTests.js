import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Runs a cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str) => str, // The mock 't' function returns the key
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'en',
      },
    };
  },
}));

// Mock AuthContext to prevent Firebase initialization in tests
vi.mock('src/context/AuthContext.jsx', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
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
