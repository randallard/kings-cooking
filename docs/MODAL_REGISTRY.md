# Modal Registry

Quick reference guide for all modal and overlay components in King's Cooking.

## Quick Reference Table

| Component | Type | Trigger | Phase | Location |
|-----------|------|---------|-------|----------|
| ModeSelector | Phase Screen | Initial load | mode-selection | ModeSelector.tsx |
| Setup Screen | Phase Screen | SELECT_MODE | setup | App.tsx (inline) |
| ColorSelectionScreen | Phase Screen | START_COLOR_SELECTION | color-selection | ColorSelectionScreen.tsx |
| PieceSelectionScreen | Phase Screen | SET_PLAYER_COLOR | piece-selection | PieceSelectionScreen.tsx |
| GameBoard | Phase Screen | COMPLETE_PIECE_SELECTION | playing | GameBoard.tsx |
| HandoffScreen | Phase Screen | CONFIRM_MOVE | handoff | HandoffScreen.tsx |
| **Player2NameEntryScreen** | Phase Screen | CONFIRM_MOVE + no P2 name | handoff | **Player2NameEntryScreen.tsx** |
| URLSharer | Phase Screen | URL_GENERATED | handoff | URLSharer.tsx |
| VictoryScreen | Phase Screen | GAME_OVER | victory | VictoryScreen.tsx |
| PiecePickerModal | Overlay Modal | pendingPromotion !== null | playing | PiecePickerModal.tsx |
| StoryPanel | Overlay Modal | showStoryPanel === true | playing | StoryPanel.tsx |
| HistoryComparisonModal | Overlay Modal | Divergence detection | any | HistoryComparisonModal.tsx |

## Finding Components Checklist

✅ **Check Phase**: What phase is the app in? (`state.phase`)
✅ **Check Mode**: Hot-seat or URL mode? (`state.mode`)
✅ **Check Conditions**: Special conditions? (player2Name empty, pendingPromotion set)
✅ **Check App.tsx**: Look at conditional rendering blocks
✅ **Check components/game/**: Most screens are in this directory
✅ **Check Local State**: Modal might be controlled by useState

## Related Documentation

- **State Machine**: `docs/ARCHITECTURE.md`
- **Component Patterns**: `claude_md_files/CLAUDE-REACT.md`
- **Phase Definitions**: `src/types/gameFlow.ts`
