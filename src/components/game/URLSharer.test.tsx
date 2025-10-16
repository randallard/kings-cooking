/**
 * @fileoverview Tests for URLSharer component
 * @module components/game/URLSharer.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { URLSharer } from './URLSharer';

describe('URLSharer', () => {
  const testUrl = 'https://example.com/game/12345';

  // Store original clipboard
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('should render URL input with correct value', () => {
      render(<URLSharer url={testUrl} />);

      const input = screen.getByLabelText('Game share URL');
      expect(input).toHaveValue(testUrl);
    });

    it('should render copy button', () => {
      render(<URLSharer url={testUrl} />);

      expect(
        screen.getByRole('button', { name: /copy game link/i })
      ).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<URLSharer url={testUrl} />);

      expect(screen.getByText('Share this game:')).toBeInTheDocument();
    });

    it('should make input read-only', () => {
      render(<URLSharer url={testUrl} />);

      const input = screen.getByLabelText('Game share URL');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('Copy Functionality', () => {
    it('should copy URL to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(testUrl);
      });
    });

    it('should show success message after successful copy', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(
          screen.getByText('Link copied to clipboard!')
        ).toBeInTheDocument();
      });
    });

    it('should update button text to "Copied!" after success', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('✓ Copied!');
      });
    });

    it('should call onCopy callback after successful copy', async () => {
      const user = userEvent.setup();
      const onCopy = vi.fn();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} onCopy={onCopy} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onCopy).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error message if copy fails', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Copy failed'));

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(
        () => {
          expect(
            screen.getByText(/failed to copy/i)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Fallback Functionality', () => {
    it('should use execCommand fallback when Clipboard API unavailable', async () => {
      const user = userEvent.setup();

      // Remove Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock document.execCommand (add if doesn't exist)
      const execCommandSpy = vi.fn(() => true);
      document.execCommand = execCommandSpy;

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
      });
    });

    it('should show success when execCommand succeeds', async () => {
      const user = userEvent.setup();

      // Remove Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const execCommandSpy = vi.fn(() => true);
      document.execCommand = execCommandSpy;

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(
          screen.getByText('Link copied to clipboard!')
        ).toBeInTheDocument();
      });
    });

    it('should show error when execCommand fails', async () => {
      const user = userEvent.setup();

      // Remove Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const execCommandSpy = vi.fn(() => false);
      document.execCommand = execCommandSpy;

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should select all text when input is clicked', async () => {
      const user = userEvent.setup();
      render(<URLSharer url={testUrl} />);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const input = screen.getByLabelText(
        'Game share URL'
      ) as HTMLInputElement;

      // Mock select method
      const selectSpy = vi.spyOn(input, 'select');

      await user.click(input);

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for input', () => {
      render(<URLSharer url={testUrl} />);

      const input = screen.getByLabelText('Game share URL');
      expect(input).toBeInTheDocument();
    });

    it('should have proper ARIA label for copy button', () => {
      render(<URLSharer url={testUrl} />);

      const button = screen.getByRole('button', {
        name: 'Copy game link to clipboard',
      });
      expect(button).toBeInTheDocument();
    });

    it('should announce success with polite live region', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
        expect(status).toHaveTextContent('Link copied to clipboard!');
      });
    });

    it('should associate label with input', () => {
      render(<URLSharer url={testUrl} />);

      const label = screen.getByText('Share this game:');
      const input = screen.getByLabelText('Game share URL');

      expect(label).toHaveAttribute('for', input.id);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', async () => {
      const user = userEvent.setup();
      render(<URLSharer url={testUrl} />);

      await user.tab();

      const input = screen.getByLabelText('Game share URL');
      expect(input).toHaveFocus();
    });

    it('should trigger copy with Enter on button', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      // Tab to button
      await user.tab();
      await user.tab();

      const button = screen.getByRole('button');
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(
        () => {
          expect(writeTextMock).toHaveBeenCalledWith(testUrl);
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL', () => {
      render(<URLSharer url="" />);

      const input = screen.getByLabelText('Game share URL');
      expect(input).toHaveValue('');
    });

    it('should handle very long URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      render(<URLSharer url={longUrl} />);

      const input = screen.getByLabelText('Game share URL');
      expect(input).toHaveValue(longUrl);
    });

    it('should not crash if onCopy is not provided', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<URLSharer url={testUrl} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('✓ Copied!');
      });
    });
  });
});
