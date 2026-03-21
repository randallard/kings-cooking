   # URL Mode Comprehensive Flow Analysis

   ## Scenario Matrix

   | Mode | P1 Color | After COMPLETE_PIECE_SELECTION | First URL Contains | P2 Action | Game Starts |
   |------|----------|-------------------------------|-------------------|-----------|-------------|
   | **Random** | Light | → PLAYING | (none) | - | P1 makes move → URL → P2 name → sees move |
   | **Random** | Dark | → HANDOFF → URL | Full state, 0 moves | Name entry | P2 makes move (is light) |
   | **Mirrored** | Light | → PLAYING | (none) | - | P1 makes move → URL → P2 name → sees move |
   | **Mirrored** | Dark | → HANDOFF → URL | Full state, 0 moves | Name entry | P2 makes move (is light) |
   | **Independent** | Light | → HANDOFF → URL | P1 pieces only | Name + Pick pieces → URL back | P1 gets P2 pieces → makes
   move → URL → P2 sees move |
   | **Independent** | Dark | → HANDOFF → URL | P1 pieces only | Name + Pick pieces → makes move | P2 move → URL → P1 sees move
    |

   ## Key Insights

   ### Current State After COMPLETE_PIECE_SELECTION
   - All modes create a full gameState with both players' pieces
   - Random/Mirrored: both player1Pieces and player2Pieces are set (identical)
   - Independent: both player1Pieces and player2Pieces are set (can be different)

   **PROBLEM**: In independent mode, we generate gameState with BOTH pieces, but P2 hasn't picked yet!

   ### The Real Independent Mode Flow Should Be:

   **P1 Side:**
   1. Setup → Name → Color → Pick pieces
   2. Dispatch COMPLETE_PIECE_SELECTION with ONLY player1Pieces
   3. Create gameState with ONLY P1's pieces on board
   4. Go to handoff → generate URL

   **P2 Side:**
   5. Opens URL → NOT: Sees incomplete game (only P1 pieces) - should go straight to name entry and pick pieces
   6. Name entry
   7. **Enters piece-selection phase** to pick their own pieces
   8. Picks pieces → dispatch SET_PLAYER_PIECES (player: 'player2')
   9. IF PLAYER 1 IS LIGHT: Generate URL with BOTH pieces now, ELSE: Play first move, then generate url

   **P1 Side (returns):**
   10. Opens URL → Both have pieces now
   11. Go to playing

   ## Required Changes

   ### 1. COMPLETE_PIECE_SELECTION Reducer Logic
   ```typescript
   if (state.mode === 'url') {
     if (state.selectionMode === 'independent') {
       // P1 picked their pieces, need to wait for P2
       // Create board with ONLY P1's pieces
       const boardWithOnlyP1Pieces = createBoardWithPieces(
         state.player1Pieces,
         [null, null, null], // P2 hasn't picked yet
         state.player1Color
       );

       return {
         phase: 'handoff',
         mode: 'url',
         player1Name: state.player1Name,
         player2Name: '',
         gameState: partialGameState,
         countdown: 0,
         generatedUrl: null,
         // Keep piece selection state for P2
         selectionMode: 'independent',
         player1Pieces: state.player1Pieces,
         player2Pieces: null, // P2 hasn't picked
         player1Color: state.player1Color,
       };
     } else {
       // Random/Mirrored: both pieces are set
       if (state.player1Color === 'light') {
         // P1 is light, goes to playing to make first move
         return {
           phase: 'playing',
           mode: 'url',
           player1Name: state.player1Name,
           player2Name: '',
           gameState: finalGameState,
           selectedPosition: null,
           legalMoves: [],
           pendingMove: null,
         };
       } else {
         // P1 is dark, P2 will be light and move first
         return {
           phase: 'handoff',
           mode: 'url',
           player1Name: state.player1Name,
           player2Name: '',
           gameState: finalGameState,
           countdown: 0,
           generatedUrl: null,
         };
       }
     }
   }
   ```

   ### 2. LOAD_FROM_URL for Independent Mode
   Need to detect when P2 receives incomplete game state (only P1 pieces):

   ```typescript
   // Check if this is independent mode with incomplete pieces
   if (payload.gameState./* some way to detect P1 picked but not P2 */) {
     return {
       phase: 'piece-selection',
       mode: 'url',
       player1Name: payload.gameState.lightPlayer.name,
       player2Name: myName || '',
       selectionMode: 'independent',
       player1Pieces: /* extract from gameState */,
       player2Pieces: null,
       player1Color: /* determine from gameState */,
     };
   }
   ```

   ### 3. Problem: How to detect incomplete board?
   We need a way to mark the gameState as "incomplete" in independent mode.

   Options:
   1. Add a field to GameState: `piecesComplete: boolean`
   2. Check the board - if one row is all null, it's incomplete
   3. Add a field to URL payload: `waitingForPiecePick: boolean`

   I think option 2 is cleanest - check if darkPlayer row or lightPlayer row is all null.

   ## Implementation Plan

   1. Modify `createBoardWithPieces()` to accept null for one player's pieces
   2. Update COMPLETE_PIECE_SELECTION to detect mode and create appropriate state
   3. Add LOAD_FROM_URL logic to detect incomplete board → piece-selection phase
   4. Add piece-selection completion for P2 → URL generation
   5. Test all 6 scenarios
