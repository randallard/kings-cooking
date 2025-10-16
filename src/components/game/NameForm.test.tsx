/**
 * @fileoverview Tests for NameForm component
 * @module components/game/NameForm.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { NameForm } from './NameForm';
import { storage } from '@/lib/storage/localStorage';

// Mock localStorage utilities
vi.mock('@/lib/storage/localStorage', () => ({
  storage: {
    getMyName: vi.fn(),
    setMyName: vi.fn(),
    getPlayer1Name: vi.fn(),
    setPlayer1Name: vi.fn(),
    getPlayer2Name: vi.fn(),
    setPlayer2Name: vi.fn(),
  },
  STORAGE_KEYS: {
    MY_NAME: 'kings-cooking:my-name',
    PLAYER1_NAME: 'kings-cooking:player1-name',
    PLAYER2_NAME: 'kings-cooking:player2-name',
  },
}));

describe('NameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no saved names
    vi.mocked(storage.getMyName).mockReturnValue(null);
    vi.mocked(storage.getPlayer1Name).mockReturnValue(null);
    vi.mocked(storage.getPlayer2Name).mockReturnValue(null);
    vi.mocked(storage.setMyName).mockReturnValue(true);
    vi.mocked(storage.setPlayer1Name).mockReturnValue(true);
    vi.mocked(storage.setPlayer2Name).mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('should render with default label for my-name', () => {
      render(<NameForm storageKey="my-name" />);

      expect(screen.getByLabelText('Your name:')).toBeInTheDocument();
    });

    it('should render with default label for player1', () => {
      render(<NameForm storageKey="player1" />);

      expect(screen.getByLabelText('Player 1 name:')).toBeInTheDocument();
    });

    it('should render with default label for player2', () => {
      render(<NameForm storageKey="player2" />);

      expect(screen.getByLabelText('Player 2 name:')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<NameForm storageKey="my-name" label="Custom Label:" />);

      expect(screen.getByLabelText('Custom Label:')).toBeInTheDocument();
    });

    it('should show helper text when not dirty', () => {
      render(<NameForm storageKey="my-name" />);

      expect(
        screen.getByText(/1-20 characters: letters, numbers/i)
      ).toBeInTheDocument();
    });

    it('should render placeholder text', () => {
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveAttribute('placeholder', 'Enter your name');
    });
  });

  describe('Loading Saved Names', () => {
    it('should load saved name for my-name storage key', () => {
      vi.mocked(storage.getMyName).mockReturnValue('Alice');

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveValue('Alice');
    });

    it('should load saved name for player1 storage key', () => {
      vi.mocked(storage.getPlayer1Name).mockReturnValue('Bob');

      render(<NameForm storageKey="player1" />);

      const input = screen.getByLabelText('Player 1 name:');
      expect(input).toHaveValue('Bob');
    });

    it('should load saved name for player2 storage key', () => {
      vi.mocked(storage.getPlayer2Name).mockReturnValue('Charlie');

      render(<NameForm storageKey="player2" />);

      const input = screen.getByLabelText('Player 2 name:');
      expect(input).toHaveValue('Charlie');
    });

    it('should render empty when no saved name exists', () => {
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveValue('');
    });
  });

  describe('Validation - Valid Names', () => {
    it('should accept alphanumeric names', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice123');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept names with dashes', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice-Smith');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept names with underscores', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice_Smith');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept names with spaces', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice Smith');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should accept 20 character names', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'a'.repeat(20));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show success icon for valid name', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Validation - Invalid Names', () => {
    it('should prevent typing more than 20 characters via maxLength', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');

      // Try to type 25 characters
      await user.type(input, 'a'.repeat(25));

      // Should only have 20 due to maxLength attribute
      expect(input).toHaveValue('a'.repeat(20));
    });

    it('should reject names with special characters', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@Smith');

      await waitFor(() => {
        expect(
          screen.getByText(/Only letters, numbers, spaces/i)
        ).toBeInTheDocument();
      });
    });

    it('should reject names with leading spaces', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, ' Alice');

      await waitFor(() => {
        expect(
          screen.getByText('Name cannot start or end with spaces')
        ).toBeInTheDocument();
      });
    });

    it('should reject names with trailing spaces', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice ');

      await waitFor(() => {
        expect(
          screen.getByText('Name cannot start or end with spaces')
        ).toBeInTheDocument();
      });
    });

    it('should show error icon for invalid name', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      await waitFor(() => {
        expect(screen.getByText('✗')).toBeInTheDocument();
      });
    });

    it('should prevent XSS with script tag', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, '<script>alert("xss")</script>');

      await waitFor(() => {
        expect(
          screen.getByText(/Only letters, numbers, spaces/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('localStorage Integration', () => {
    it('should save valid name to my-name storage after debounce', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      // Wait for debounce (300ms + buffer)
      await waitFor(() => {
        expect(storage.setMyName).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });
    });

    it('should save valid name to player1 storage after debounce', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="player1" />);

      const input = screen.getByLabelText('Player 1 name:');
      await user.type(input, 'Bob');

      await waitFor(() => {
        expect(storage.setPlayer1Name).toHaveBeenCalledWith('Bob');
      }, { timeout: 1000 });
    });

    it('should save valid name to player2 storage after debounce', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="player2" />);

      const input = screen.getByLabelText('Player 2 name:');
      await user.type(input, 'Charlie');

      await waitFor(() => {
        expect(storage.setPlayer2Name).toHaveBeenCalledWith('Charlie');
      }, { timeout: 1000 });
    });

    it('should not save invalid names', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      // Wait 400ms (longer than debounce) to ensure it doesn't save
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(storage.setMyName).not.toHaveBeenCalled();
    });

    it('should not save empty names', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      // Wait for debounce
      await waitFor(() => {
        expect(storage.setMyName).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });

      // Clear the input
      await user.clear(input);

      // Wait to ensure it doesn't save empty string
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Should only be called once for "Alice", not for empty string
      expect(storage.setMyName).toHaveBeenCalledTimes(1);
      expect(storage.setMyName).toHaveBeenCalledWith('Alice');
    });
  });

  describe('Debounce Behavior', () => {
    it('should wait 300ms before saving', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      // Should not save immediately
      expect(storage.setMyName).not.toHaveBeenCalled();

      // Should save after debounce
      await waitFor(() => {
        expect(storage.setMyName).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });
    });

    it('should cancel previous timer on rapid typing', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');

      // Type rapidly (each keystroke cancels previous timer)
      await user.type(input, 'A');
      await new Promise((resolve) => setTimeout(resolve, 100));

      await user.type(input, 'l');
      await new Promise((resolve) => setTimeout(resolve, 100));

      await user.type(input, 'ice');

      // Should not have saved intermediate values
      expect(storage.setMyName).not.toHaveBeenCalled();

      // Wait for final debounce
      await waitFor(() => {
        expect(storage.setMyName).toHaveBeenCalledTimes(1);
        expect(storage.setMyName).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });
    });
  });

  describe('onNameChange Callback', () => {
    it('should call onNameChange when valid name is saved', async () => {
      const user = userEvent.setup();
      const onNameChange = vi.fn();

      render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      await waitFor(() => {
        expect(onNameChange).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });
    });

    it('should not call onNameChange for invalid names', async () => {
      const user = userEvent.setup();
      const onNameChange = vi.fn();

      render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      // Wait to ensure callback is not called
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(onNameChange).not.toHaveBeenCalled();
    });

    it('should not crash if onNameChange is not provided', async () => {
      const user = userEvent.setup();

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      // Should not throw
      await waitFor(() => {
        expect(storage.setMyName).toHaveBeenCalledWith('Alice');
      }, { timeout: 1000 });
    });

    it('should show error if localStorage save fails', async () => {
      const user = userEvent.setup();
      vi.mocked(storage.setMyName).mockReturnValue(false);

      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      await waitFor(() => {
        expect(
          screen.getByText('Failed to save name. Please try again.')
        ).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveAttribute('aria-label', 'Your name:');
    });

    it('should set aria-invalid on error', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should not set aria-invalid when valid', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should link error message with aria-describedby', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      await waitFor(() => {
        expect(input).toHaveAttribute(
          'aria-describedby',
          'name-error-my-name'
        );
      });
    });

    it('should announce errors with assertive live region', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should hide success icon from screen readers', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice');

      const successIcon = screen.getByText('✓');
      expect(successIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should hide error icon from screen readers', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      await user.type(input, 'Alice@');

      await waitFor(() => {
        const errorIcon = screen.getByText('✗');
        expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have maxLength attribute', () => {
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveAttribute('maxLength', '20');
    });
  });

  describe('Edge Cases', () => {
    it('should clear error when input becomes valid', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');

      // Type invalid name
      await user.type(input, 'Alice@');
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Fix it
      await user.clear(input);
      await user.type(input, 'Alice');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should clear error when input is emptied', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');

      // Type invalid name
      await user.type(input, 'Alice@');
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Clear input
      await user.clear(input);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show helper text again when input is cleared', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');

      // Type something
      await user.type(input, 'Alice');

      // Helper text should be hidden
      expect(
        screen.queryByText(/1-20 characters: letters, numbers/i)
      ).not.toBeInTheDocument();

      // Clear input
      await user.clear(input);

      // Helper text should reappear
      expect(
        screen.getByText(/1-20 characters: letters, numbers/i)
      ).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      await user.tab();

      const input = screen.getByLabelText('Your name:');
      expect(input).toHaveFocus();
    });

    it('should allow typing with keyboard', async () => {
      const user = userEvent.setup();
      render(<NameForm storageKey="my-name" />);

      const input = screen.getByLabelText('Your name:');
      input.focus();

      await user.keyboard('Alice');

      expect(input).toHaveValue('Alice');
    });
  });
});
