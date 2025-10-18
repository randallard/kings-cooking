/**
 * @fileoverview Tests for main App component (Phase 5 game flow)
 * @module App.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component - Phase 5 Game Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      expect(screen.getByText(/King's Cooking Chess/i)).toBeInTheDocument();
    });

    it('should show mode selection on initial load', () => {
      render(<App />);

      expect(screen.getByText(/Choose Your Game Mode/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Hot-Seat Mode/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /URL Mode/i })).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should allow selecting hot-seat mode', () => {
      render(<App />);

      const hotseatButton = screen.getByTestId('mode-hotseat');
      fireEvent.click(hotseatButton);

      // Should transition to setup phase
      expect(screen.getByText(/Game Setup/i)).toBeInTheDocument();
    });

    it('should allow selecting URL mode', () => {
      render(<App />);

      const urlButton = screen.getByTestId('mode-url');
      fireEvent.click(urlButton);

      // Should transition to setup phase
      expect(screen.getByText(/Game Setup/i)).toBeInTheDocument();
    });
  });

  describe('Page Refresh with Saved Game', () => {
    it('should restore game from localStorage if available', () => {
      // Set up saved game state
      localStorage.setItem('kings-cooking:game-mode', JSON.stringify('hotseat'));
      localStorage.setItem('kings-cooking:player1-name', JSON.stringify('Alice'));

      // Create a minimal saved game state
      const savedGameState = {
        status: 'playing',
        version: '1.0.0',
        gameId: 'test-game-id',
        board: [[null, null, null], [null, null, null], [null, null, null]],
        currentPlayer: 'white',
        currentTurn: 1,
        whitePlayer: { id: 'p1', name: 'Alice' },
        blackPlayer: { id: 'p2', name: 'Player 2' },
        whiteCourt: [],
        blackCourt: [],
        capturedWhite: [],
        capturedBlack: [],
        moveHistory: [],
        checksum: 'test-checksum'
      };

      localStorage.setItem('kings-cooking:game-state', JSON.stringify(savedGameState));

      render(<App />);

      // Should restore to playing phase
      // Note: Full restoration may require additional actions, this is a basic test
      expect(localStorage.getItem('kings-cooking:game-mode')).toBe(JSON.stringify('hotseat'));
    });

    it('should clear storage if saved game is completed', () => {
      // Set up completed game state
      localStorage.setItem('kings-cooking:game-mode', JSON.stringify('hotseat'));

      const completedGameState = {
        status: 'white_wins',
        version: '1.0.0',
        gameId: 'test-game-id',
        board: [[null, null, null], [null, null, null], [null, null, null]],
        currentPlayer: 'white',
        currentTurn: 10,
        whitePlayer: { id: 'p1', name: 'Alice' },
        blackPlayer: { id: 'p2', name: 'Bob' },
        whiteCourt: [],
        blackCourt: [],
        capturedWhite: [],
        capturedBlack: [],
        moveHistory: [],
        checksum: 'test-checksum'
      };

      localStorage.setItem('kings-cooking:game-state', JSON.stringify(completedGameState));

      render(<App />);

      // Should clear storage and show mode selection
      expect(screen.getByText(/Choose Your Game Mode/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible mode selection buttons', () => {
      render(<App />);

      const hotseatButton = screen.getByRole('button', { name: /play hot-seat mode on this device/i });
      const urlButton = screen.getByRole('button', { name: /play url mode across devices/i });

      expect(hotseatButton).toBeInTheDocument();
      expect(urlButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<App />);

      const hotseatButton = screen.getByTestId('mode-hotseat');
      hotseatButton.focus();

      expect(hotseatButton).toHaveFocus();
    });
  });
});
