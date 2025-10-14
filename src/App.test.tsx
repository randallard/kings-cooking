/**
 * @fileoverview Tests for main App component
 * @module App.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText(/King's Cooking/i)).toBeInTheDocument();
  });

  it('should display phase 1 completion message', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /King's Cooking - Phase 1 Foundation/i })).toBeInTheDocument();
  });

  it('should handle validation test button', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);
    const button = screen.getByText('Test Validation');
    fireEvent.click(button);

    expect(consoleSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Check console for validation results');

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should handle clear storage button', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);
    const button = screen.getByText('Clear Storage');
    fireEvent.click(button);

    expect(alertSpy).toHaveBeenCalledWith('Storage cleared');
    alertSpy.mockRestore();
  });
});
