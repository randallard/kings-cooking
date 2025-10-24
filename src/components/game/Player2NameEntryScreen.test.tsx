/**
 * @fileoverview Tests for Player2NameEntryScreen component
 * @module components/game/Player2NameEntryScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Player2NameEntryScreen } from './Player2NameEntryScreen';
import { storage } from '@/lib/storage/localStorage';

// Mock storage module
vi.mock('@/lib/storage/localStorage', () => ({
  storage: {
    getPlayer2Name: vi.fn(),
    setPlayer2Name: vi.fn(() => true), // Return true for successful save
  },
}));

describe('Player2NameEntryScreen', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render heading and description', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('heading', { name: /player 2's turn/i })).toBeInTheDocument();
      expect(screen.getByText(/before we continue/i)).toBeInTheDocument();
    });

    it('should render NameForm component', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render continue button in disabled state initially', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const button = screen.getByRole('button', { name: /continue to game/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Name Entry Flow', () => {
    it('should enable button when valid name is entered', async () => {
      const user = userEvent.setup();
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /continue to game/i });

      // Initially disabled
      expect(button).toBeDisabled();

      // Enter valid name
      await user.type(input, 'Player Two');

      // Wait for validation
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should dispatch SET_PLAYER2_NAME and COMPLETE_HANDOFF on continue', async () => {
      const user = userEvent.setup();
      vi.mocked(storage.getPlayer2Name).mockReturnValue('Player Two');

      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Player Two');

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });

      const button = screen.getByRole('button', { name: /continue to game/i });
      await user.click(button);

      // Should dispatch both actions
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER2_NAME',
        name: 'Player Two',
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'COMPLETE_HANDOFF',
      });
    });

    it('should not dispatch if name is invalid', async () => {
      const user = userEvent.setup();
      vi.mocked(storage.getPlayer2Name).mockReturnValue('');

      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const button = screen.getByRole('button', { name: /continue to game/i });

      // Button should be disabled, but try clicking anyway
      expect(button).toBeDisabled();
      await user.click(button);

      // Should not dispatch
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
    });

    it('should have accessible button text', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /continue to game/i })).toBeInTheDocument();
    });
  });
});
