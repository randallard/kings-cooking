/**
 * @fileoverview Tests for ColorSelectionScreen component
 * @module components/game/ColorSelectionScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorSelectionScreen } from './ColorSelectionScreen';

describe('ColorSelectionScreen', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component with player name', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    expect(screen.getByRole('heading', { name: /choose your color/i })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should show light and dark color buttons', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const lightButton = screen.getByRole('button', { name: /choose light pieces/i });
    const darkButton = screen.getByRole('button', { name: /choose dark pieces/i });

    expect(lightButton).toBeInTheDocument();
    expect(darkButton).toBeInTheDocument();
  });

  it('should indicate light goes first', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    expect(screen.getByText(/goes first/i)).toBeInTheDocument();
  });

  it('should indicate dark goes second', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    expect(screen.getByText(/goes second/i)).toBeInTheDocument();
  });

  it('should dispatch SET_PLAYER_COLOR with light when light button clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const lightButton = screen.getByRole('button', { name: /choose light pieces/i });
    await user.click(lightButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_PLAYER_COLOR',
      color: 'light',
    });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('should dispatch SET_PLAYER_COLOR with dark when dark button clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const darkButton = screen.getByRole('button', { name: /choose dark pieces/i });
    await user.click(darkButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_PLAYER_COLOR',
      color: 'dark',
    });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('should have accessible button labels with ARIA attributes', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const lightButton = screen.getByRole('button', { name: /choose light pieces - go first/i });
    const darkButton = screen.getByRole('button', { name: /choose dark pieces - go second/i });

    expect(lightButton).toHaveAttribute('aria-label', 'Choose Light pieces - go first');
    expect(darkButton).toHaveAttribute('aria-label', 'Choose Dark pieces - go second');
  });

  it('should display sun icon for light', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const lightButton = screen.getByRole('button', { name: /choose light pieces/i });
    expect(lightButton.textContent).toContain('☀️');
  });

  it('should display moon icon for dark', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const darkButton = screen.getByRole('button', { name: /choose dark pieces/i });
    expect(darkButton.textContent).toContain('🌙');
  });
});
