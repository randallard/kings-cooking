/**
 * @fileoverview Tests for PlaybackControls component
 * @module components/game/PlaybackControls.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  it('should render all playback buttons', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forward/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to current/i })).toBeInTheDocument();
  });

  it('should show history indicator when not at latest', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    expect(screen.getByText(/viewing move 5 of 10/i)).toBeInTheDocument();
  });

  it('should not show history indicator when at latest', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={false}
        isAtLatest={true}
        currentMoveIndex={10}
        totalMoves={10}
      />
    );

    expect(screen.queryByText(/viewing move/i)).not.toBeInTheDocument();
  });

  it('should disable back button when cannot step back', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={false}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={0}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  it('should disable forward button when cannot step forward', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={false}
        isAtLatest={true}
        currentMoveIndex={10}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /forward/i })).toBeDisabled();
  });

  it('should disable reset button when at latest', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={false}
        isAtLatest={true}
        currentMoveIndex={10}
        totalMoves={10}
      />
    );

    // Reset button should be visible but disabled
    const resetButton = screen.getByRole('button', { name: /return to current/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toBeDisabled();
  });

  it('should call onStepBack when back button clicked', async () => {
    const user = userEvent.setup();
    const onStepBack = vi.fn();

    render(
      <PlaybackControls
        onStepBack={onStepBack}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onStepBack).toHaveBeenCalledTimes(1);
  });

  it('should call onStepForward when forward button clicked', async () => {
    const user = userEvent.setup();
    const onStepForward = vi.fn();

    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={onStepForward}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    await user.click(screen.getByRole('button', { name: /forward/i }));
    expect(onStepForward).toHaveBeenCalledTimes(1);
  });

  it('should call onReturnToCurrent when return button clicked', async () => {
    const user = userEvent.setup();
    const onReturnToCurrent = vi.fn();

    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={onReturnToCurrent}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    await user.click(screen.getByRole('button', { name: /return to current/i }));
    expect(onReturnToCurrent).toHaveBeenCalledTimes(1);
  });

  it('should not call onStepBack when back button is disabled', async () => {
    const user = userEvent.setup();
    const onStepBack = vi.fn();

    render(
      <PlaybackControls
        onStepBack={onStepBack}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={false}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={0}
        totalMoves={10}
      />
    );

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onStepBack).not.toHaveBeenCalled();
  });

  it('should have proper ARIA labels for accessibility', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /step back to previous move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step forward to next move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to current move/i })).toBeInTheDocument();
  });
});
