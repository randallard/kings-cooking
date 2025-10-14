# Kings Cooking - Complete Project Documentation

## Game Overview

A turn-based chess variant where players race to reach the opponent's king's court to party. Game state is encrypted and shared via URLs, allowing players to use any communication platform.

## Technical Stack

### Core Technologies
- **Vite** - Fast development and build tooling
- **React 18** - Component-based UI
- **TypeScript** - Type safety and better DX
- **CSS Modules** - Scoped styling
- **GitHub Pages** - Static hosting
- **GitHub Actions** - Automated deployment

### Deployment Configuration
- Static build output deployed to GitHub Pages
- Automated deployment on main branch pushes
- Custom domain support (optional)
- HTTPS enabled by default

## Project Setup

### Initialize Project
```bash
npm create vite@latest kings-cooking --template react-ts
cd kings-cooking
npm install
```

### Additional Dependencies
```bash
npm install crypto-js lz-string
npm install -D @types/crypto-js
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Game Rules

### Objective
Get more pieces to your opponent's court (their back row) than they get to yours.

### Setup
- **Board**: 3x3 playable grid with goal zones off each end
- **Kings**: Located in their courts (off-board goal zones), never move
- **Goal**: Kings' courts are one space beyond the back edge of the 3x3 board
- **Piece Placement**: Each team's pieces start in the row closest to their own king's court
- **Team Assignment**: Mirrored (both teams get identical pieces)
- **No Pawns**: Pawns are excluded from piece selection
- **First Move**: Light team always starts

### Board Layout
```
[Light King's Court] ← Goal zone (off-board)
[   ][   ][   ]     ← Light team starting row
[   ][   ][   ]     ← Middle row (empty at start)
[   ][   ][   ]     ← Dark team starting row  
[Dark King's Court] ← Goal zone (off-board)
```

To score, pieces must move off the board into the opponent's king's court.

### Piece Selection Logic
Each team gets exactly 2 pieces randomly selected with these constraints:
- Maximum 1 Queen per team
- Maximum 2 Knights per team  
- Maximum 2 Rooks per team
- Maximum 2 Bishops per team
- No Pawns included
- Both teams receive identical pieces in mirrored positions

### Board Edges & Movement
- **Own King's Court Edge**: Cannot move backward off the board toward your own king's court
- **Side Edges** (left/right): Cannot move off these edges, pieces must stop at the board boundary
- **Opponent's King's Court Edge**: Pieces can move off this edge to score (reach the goal)
- **Standard Chess Rules**: All piece movements follow traditional chess rules within the 3x3 grid
- **Collision Detection**: Pieces cannot move through other pieces

### Special Movement Cases
- **Diagonal pieces** (Bishop/Queen) hitting side edges must stop at the boundary and wait for next turn to move into opponent's king's court
- **Straight-line pieces** (Rook/Queen) can move directly off the opponent's edge into their king's court if path is clear
- **Knight**: Can jump directly into opponent's king's court if their L-shaped move would land in the goal zone

### Victory Conditions
1. **Most Court Pieces**: Player with most pieces in opponent's court wins
2. **Solo Team Victory**: If only one team has pieces left on board, those pieces automatically count as having reached the goal
3. **Stalemate**: If both teams have pieces but no legal moves:
   - Count remaining pieces on board
   - Team with more pieces gets points equal to the difference
   - If equal pieces remain, declare tie
4. **Tie Game**: Both kings serve together in the center of the field

## User Stories

### Epic 1: Game Setup
- **US-1.1**: As a new player, I want to start a new game so I can play with a friend
- **US-1.2**: As a player, I want pieces randomly assigned to both teams so the game is fair and surprising
- **US-1.3**: As a player, I want to see the initial board setup so I understand the starting position

### Epic 2: Gameplay
- **US-2.1**: As a player, I want to tap a piece to see available moves so I know my options
- **US-2.2**: As a player, I want to tap a destination to move my piece there
- **US-2.3**: As a player, I want to switch between pieces before moving so I can consider all options
- **US-2.4**: As a player, I want to see when pieces reach the opponent's court so I know the score
- **US-2.5**: As a player, I want to see which pieces are captured/blocked so I understand the board state

### Epic 3: Turn Management
- **US-3.1**: As a player, I want to see whose turn it is so I know when to move
- **US-3.2**: As a player, I want to generate a game URL after my move so I can send it to my opponent
- **US-3.3**: As a player, I want clear instructions on sharing the URL so my opponent can take their turn

### Epic 4: Game Completion
- **US-4.1**: As a player, I want to see the final score when the game ends
- **US-4.2**: As a winner, I want to see a celebration screen showing my pieces at the opponent's court
- **US-4.3**: As a player in a tie, I want to see both kings serving together
- **US-4.4**: As a player, I want to start a new game easily after finishing

### Epic 5: Tutorial & Rules
- **US-5.1**: As a new player, I want to see a simple story introduction so I understand the game theme
- **US-5.2**: As a player, I want to see piece movement rules so I know how each piece moves
- **US-5.3**: As a player, I want to understand the goal edge mechanics so I know how to score
- **US-5.4**: As a confused player, I want access to rules during gameplay

## Component Architecture

### Core Components
```
App.tsx                 # Main router and game state
├── GameBoard.tsx       # 3x3 grid with pieces
├── PieceSelector.tsx   # Handle piece selection and moves
├── GameStatus.tsx      # Turn indicator and score
├── URLSharer.tsx       # Display URL for sharing
├── Tutorial.tsx        # Story and rules
├── Victory.tsx         # End game celebration
└── Rules.tsx          # Reference rules panel
```

### Utility Modules
```
utils/
├── gameLogic.ts        # Chess movement validation
├── pieceGeneration.ts  # Random piece selection
├── urlState.ts         # Encrypt/decrypt game state
├── compression.ts      # Compress state for URLs
└── types.ts           # TypeScript interfaces
```

## Data Structures

### Game State Interface
```typescript
interface GameState {
  board: (PieceType | null)[][];     // 3x3 grid
  currentTurn: 'light' | 'dark';
  moveCount: number;
  courtPieces: {
    light: number;
    dark: number;
  };
  gameStatus: 'setup' | 'playing' | 'finished';
  winner?: 'light' | 'dark' | 'tie';
  selectedPiece?: {
    row: number;
    col: number;
  };
}

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight';

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  captured?: boolean;
  reachedCourt?: boolean;
}
```

### Piece Selection Algorithm
```typescript
interface PiecePool {
  queen: number;    // max 1
  rook: number;     // max 2  
  bishop: number;   // max 2
  knight: number;   // max 2
}

function generateRandomTeam(): PieceType[] {
  const availablePieces: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
  const selectedPieces: PieceType[] = [];
  const pieceCount = { queen: 0, rook: 0, bishop: 0, knight: 0 };
  const maxPieces = { queen: 1, rook: 2, bishop: 2, knight: 2 };
  
  // Select exactly 2 pieces for each team
  while (selectedPieces.length < 2) {
    const randomPiece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
    
    if (pieceCount[randomPiece] < maxPieces[randomPiece]) {
      selectedPieces.push(randomPiece);
      pieceCount[randomPiece]++;
    }
  }
  
  return selectedPieces;
}
```

## URL State Management

### Encryption & Compression
```typescript
// Game state flow:
// GameState -> JSON -> LZ-String compress -> AES encrypt -> Base64 -> URL

function encodeGameState(gameState: GameState, secret: string): string {
  const json = JSON.stringify(gameState);
  const compressed = LZString.compress(json);
  const encrypted = CryptoJS.AES.encrypt(compressed, secret).toString();
  const encoded = btoa(encrypted);
  return encoded;
}

function decodeGameState(encoded: string, secret: string): GameState {
  const encrypted = atob(encoded);
  const decrypted = CryptoJS.AES.decrypt(encrypted, secret).toString(CryptoJS.enc.Utf8);
  const json = LZString.decompress(decrypted);
  return JSON.parse(json);
}
```

### URL Structure
```
https://username.github.io/kings-cooking/game?s=base64_encrypted_state
```

## Chess Movement Logic

### Movement Validation
```typescript
function getValidMoves(piece: PieceType, from: Position, board: Board): Position[] {
  const moves: Position[] = [];
  
  switch (piece) {
    case 'queen':
      moves.push(...getRookMoves(from, board));
      moves.push(...getBishopMoves(from, board));
      break;
    case 'rook':
      moves.push(...getRookMoves(from, board));
      break;
    case 'bishop':
      moves.push(...getBishopMoves(from, board));
      break;
    case 'knight':
      moves.push(...getKnightMoves(from, board));
      break;
    case 'king':
      // Kings don't move in this variant
      break;
  }
  
  return moves.filter(move => isValidDestination(move, board));
}

function isValidDestination(pos: Position, board: Board, currentPlayer: 'light' | 'dark'): boolean {
  // Moving into opponent's king's court (goal zones)
  if (pos.row < 0) {
    // Light team moving into dark king's court
    return currentPlayer === 'light';
  }
  if (pos.row > 2) {
    // Dark team moving into light king's court  
    return currentPlayer === 'dark';
  }
  
  // Cannot move off side edges
  if (pos.col < 0 || pos.col > 2) {
    return false;
  }
  
  // Position is within the 3x3 playable board
  // Cannot move to occupied square
  return board[pos.row][pos.col] === null;
}
```

## GitHub Actions Workflow

### Deployment Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v3
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Vite Configuration for GitHub Pages
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/kings-cooking/', // Replace with your repo name
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

## Development Phases

### Phase 1: Core Setup (Week 1)
- [x] Initialize Vite + React + TypeScript project
- [x] Set up GitHub repository and Pages
- [x] Create basic component structure
- [x] Implement URL state encoding/decoding
- [x] Set up deployment workflow

### Phase 2: Game Logic (Week 1-2)
- [ ] Implement piece movement validation
- [ ] Create random piece selection algorithm
- [ ] Build 3x3 game board component
- [ ] Add piece selection and movement UI
- [ ] Implement turn management

### Phase 3: Game Flow (Week 2)
- [ ] Create game state management
- [ ] Implement victory condition detection
- [ ] Build URL sharing interface
- [ ] Add game status displays
- [ ] Handle edge cases and invalid states

### Phase 4: Tutorial & Polish (Week 2-3)
- [ ] Create simple story tutorial
- [ ] Add rules reference panel
- [ ] Implement victory celebration screens
- [ ] Add error handling and validation
- [ ] Cross-browser testing

### Phase 5: Deployment & Testing (Week 3)
- [ ] Deploy to GitHub Pages
- [ ] Test on mobile devices
- [ ] Validate URL sharing across platforms
- [ ] Performance optimization
- [ ] Final QA and bug fixes

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Game logic, piece movement, state management
- **Integration Tests**: URL encoding/decoding, game flow
- **Manual Testing**: Cross-browser, mobile, URL sharing
- **Performance**: Bundle size < 500KB, load time < 2s

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### Security Considerations
- Game state encryption prevents tampering
- No sensitive data stored locally
- URL validation prevents malformed states
- Input sanitization for all user interactions

## Success Metrics

### Technical Metrics
- Load time < 2 seconds
- Bundle size < 500KB
- 99% uptime on GitHub Pages
- Cross-browser compatibility

### User Experience Metrics
- Tutorial completion rate > 80%
- Game completion rate > 90%
- URL sharing success rate > 95%
- Zero game-breaking bugs

### Performance Targets
- First Contentful Paint < 1s
- Time to Interactive < 2s
- Smooth 60fps animations
- Works on 3G connections

## Future Enhancements

### Version 1.1 (Optional)
- [ ] Sound effects toggle
- [ ] Piece movement animations
- [ ] Game history in URL parameters
- [ ] Custom game secrets/passwords

### Version 1.2 (Optional)
- [ ] Multiple board sizes (4x4, 5x5)
- [ ] Different piece pools (with pawns option)
- [ ] Tournament bracket tracking
- [ ] Statistics dashboard

## File Structure

```
kings-cooking/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── pieces/          # SVG piece assets
├── src/
│   ├── components/
│   │   ├── GameBoard.tsx
│   │   ├── PieceSelector.tsx
│   │   ├── GameStatus.tsx
│   │   ├── URLSharer.tsx
│   │   ├── Tutorial.tsx
│   │   ├── Victory.tsx
│   │   └── Rules.tsx
│   ├── utils/
│   │   ├── gameLogic.ts
│   │   ├── pieceGeneration.ts
│   │   ├── urlState.ts
│   │   ├── compression.ts
│   │   └── types.ts
│   ├── styles/
│   │   ├── index.css
│   │   ├── Board.module.css
│   │   └── components.module.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .github/
│   └── workflows/
│       └── deploy.yml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```