/**
 * @fileoverview Tests for DarkModeToggle component
 * @module components/game/DarkModeToggle.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DarkModeToggle } from './DarkModeToggle';

describe('DarkModeToggle', () => {
  // Store original values
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render toggle button', () => {
      render(<DarkModeToggle />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have accessible label for light mode', () => {
      render(<DarkModeToggle />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should have title attribute', () => {
      render(<DarkModeToggle />);

      expect(screen.getByRole('button')).toHaveAttribute('title', 'Switch to dark mode');
    });

    it('should render sun icon in light mode', () => {
      const { container } = render(<DarkModeToggle />);

      const sunIcon = container.querySelector('svg circle');
      expect(sunIcon).toBeInTheDocument();
    });
  });

  describe('Theme Initialization', () => {
    it('should initialize with light mode by default', () => {
      render(<DarkModeToggle />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should initialize with stored preference', () => {
      localStorage.setItem('theme-preference', 'dark');

      render(<DarkModeToggle />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should initialize with system preference when no stored value', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<DarkModeToggle />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should use custom storage key', () => {
      localStorage.setItem('custom-key', 'dark');

      render(<DarkModeToggle storageKey="custom-key" />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should ignore invalid stored values', () => {
      localStorage.setItem('theme-preference', 'invalid');

      render(<DarkModeToggle />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle from light to dark', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      localStorage.setItem('theme-preference', 'dark');

      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should update button label after toggle', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should update icon after toggle', () => {
      const { container } = render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Moon icon has path element instead of circle
      const moonIcon = container.querySelector('svg path');
      expect(moonIcon).toBeInTheDocument();
    });

    it('should toggle multiple times', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      fireEvent.click(button);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      fireEvent.click(button);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Local Storage', () => {
    it('should persist theme to localStorage', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(localStorage.getItem('theme-preference')).toBe('dark');
    });

    it('should persist to custom storage key', () => {
      render(<DarkModeToggle storageKey="custom-key" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(localStorage.getItem('custom-key')).toBe('dark');
    });

    it('should update localStorage on every toggle', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(localStorage.getItem('theme-preference')).toBe('dark');

      fireEvent.click(button);
      expect(localStorage.getItem('theme-preference')).toBe('light');
    });
  });

  describe('Callbacks', () => {
    it('should call onThemeChange when initialized', () => {
      const onThemeChange = vi.fn();

      render(<DarkModeToggle onThemeChange={onThemeChange} />);

      expect(onThemeChange).toHaveBeenCalledWith('light');
    });

    it('should call onThemeChange when toggled', () => {
      const onThemeChange = vi.fn();

      render(<DarkModeToggle onThemeChange={onThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onThemeChange).toHaveBeenCalledWith('dark');
    });

    it('should not crash when onThemeChange is not provided', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('System Preference Changes', () => {
    it('should listen for system preference changes', () => {
      const addEventListenerSpy = vi.fn();

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<DarkModeToggle />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should cleanup event listener on unmount', () => {
      const removeEventListenerSpy = vi.fn();

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      }));

      const { unmount } = render(<DarkModeToggle />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have proper ARIA label in light mode', () => {
      render(<DarkModeToggle />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should have proper ARIA label in dark mode', () => {
      localStorage.setItem('theme-preference', 'dark');

      render(<DarkModeToggle />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<DarkModeToggle />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should be focusable', () => {
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      localStorage.setItem = mockSetItem;

      // Should not crash
      expect(() => {
        render(<DarkModeToggle />);
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle missing matchMedia gracefully', () => {
      // Remove matchMedia
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error - Testing missing matchMedia
      delete window.matchMedia;

      expect(() => {
        render(<DarkModeToggle />);
      }).not.toThrow();

      window.matchMedia = originalMatchMedia;
    });

    it('should work with empty storage key', () => {
      render(<DarkModeToggle storageKey="" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should maintain theme across re-renders', () => {
      const { rerender } = render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      rerender(<DarkModeToggle />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Icons', () => {
    it('should render sun icon for light theme', () => {
      const { container } = render(<DarkModeToggle />);

      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });

    it('should render moon icon for dark theme', () => {
      localStorage.setItem('theme-preference', 'dark');

      const { container } = render(<DarkModeToggle />);

      const path = container.querySelector('path[d*="21 12.79"]');
      expect(path).toBeInTheDocument();
    });

    it('should switch icons when toggled', () => {
      const { container } = render(<DarkModeToggle />);

      // Initially sun
      expect(container.querySelector('circle')).toBeInTheDocument();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Now moon
      expect(container.querySelector('circle')).not.toBeInTheDocument();
      expect(container.querySelector('path[d*="21 12.79"]')).toBeInTheDocument();
    });
  });
});
