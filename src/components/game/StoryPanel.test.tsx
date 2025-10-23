/**
 * @fileoverview Tests for StoryPanel component
 * @module components/game/StoryPanel.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryPanel } from './StoryPanel';

describe('StoryPanel', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<StoryPanel isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render story content', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
      expect(screen.getByText(/HA! Not if I can help it!/i)).toBeInTheDocument();
    });

    it('should render instructions content', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Most pieces to make it to the opponent's castle wins!/i)).toBeInTheDocument();
      expect(screen.getByText(/click confirm to lock in your move/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<StoryPanel isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<StoryPanel isOpen={true} onClose={onClose} />);

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(<StoryPanel isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management', () => {
    it('should focus close button when opened', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      expect(closeButton).toHaveFocus();
    });

    it('should trap focus within panel on Tab', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });

      // Simulate Tab key
      fireEvent.keyDown(document, { key: 'Tab' });

      // Focus should still be on close button (trapped)
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Body Scroll Prevention', () => {
    it('should prevent body scroll when open', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<StoryPanel isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to main title', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'story-panel-main-title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'story-panel-description');
    });

    it('should hide backdrop from screen readers', () => {
      const { container } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Main Title', () => {
    it('should render "The Story" main title', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const mainTitle = screen.getByRole('heading', { name: /the story/i, level: 1 });
      expect(mainTitle).toBeInTheDocument();
    });

    it('should have correct heading hierarchy (h1 for main title, h2 for subsections)', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      expect(h1).toHaveTextContent(/the story/i);
      expect(h2).toHaveTextContent(/how to play/i);
    });

    it('should use main title for aria-labelledby', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'story-panel-main-title');
    });
  });

  describe('Story Section', () => {
    it('should render story section with ARIA label', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const storySection = screen.getByRole('region', { name: /game story/i });
      expect(storySection).toBeInTheDocument();
    });

    it('should display Dark King dialogue', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
    });

    it('should display Light King scroll message', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/we're coming over! you're cooking!/i)).toBeInTheDocument();
      expect(screen.getByText(/- Light King/i)).toBeInTheDocument();
    });
  });

  describe('Instructions Section', () => {
    it('should render instructions section with ARIA label', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const instructionsSection = screen.getByRole('region', { name: /how to play/i });
      expect(instructionsSection).toBeInTheDocument();
    });

    it('should display win condition', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Most pieces to make it to the opponent's castle wins!/i)).toBeInTheDocument();
    });

    it('should display move confirmation instruction', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/click confirm to lock in your move/i)).toBeInTheDocument();
    });
  });
});
