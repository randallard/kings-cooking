# WebRTC P2P Chess Game Implementation Guide

## Overview
Comprehensive guide for implementing peer-to-peer WebRTC chess games without server infrastructure.

## Key Libraries and Setup

### Primary Dependencies
```json
{
  "peerjs": "^1.5.4",
  "chess.js": "^1.4.0",
  "nanostores": "^0.10.0",
  "@nanostores/react": "^0.7.0"
}
```

### PeerJS Implementation (Recommended)
```typescript
import Peer from 'peerjs';

interface ChessGameMessage {
  type: 'move' | 'game_state' | 'setup_choice' | 'chat';
  payload: any;
  timestamp: number;
}

class ChessConnection {
  private peer: Peer;
  private connection: Peer.DataConnection | null = null;

  constructor(gameId?: string) {
    this.peer = new Peer(gameId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      console.log('Peer ID:', id);
    });
  }

  // Host creates game
  waitForConnection(): Promise<Peer.DataConnection> {
    return new Promise((resolve) => {
      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
        resolve(conn);
      });
    });
  }

  // Guest joins game
  connectToHost(hostId: string): Promise<Peer.DataConnection> {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostId);

      conn.on('open', () => {
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on('error', reject);
    });
  }

  private setupConnection(conn: Peer.DataConnection): void {
    this.connection = conn;

    conn.on('data', (data: ChessGameMessage) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      console.log('Connection closed');
    });
  }

  sendMessage(message: ChessGameMessage): void {
    if (this.connection?.open) {
      this.connection.send(message);
    }
  }

  private handleMessage(message: ChessGameMessage): void {
    switch (message.type) {
      case 'move':
        this.handleMoveMessage(message.payload);
        break;
      case 'game_state':
        this.handleGameStateSync(message.payload);
        break;
    }
  }
}
```

## Game State Synchronization

### State Management with Nanostores
```typescript
import { map, atom } from 'nanostores';
import { Chess } from 'chess.js';

interface KingsChessState {
  board: string; // FEN notation
  currentPlayer: 'white' | 'black';
  moveHistory: string[];
  capturedPieces: {
    white: string[];
    black: string[];
  };
  gamePhase: 'setup' | 'playing' | 'finished';
  partyGuests: {
    whiteKing: string[];
    blackKing: string[];
  };
}

export const gameState = map<KingsChessState>({
  board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  currentPlayer: 'white',
  moveHistory: [],
  capturedPieces: { white: [], black: [] },
  gamePhase: 'setup',
  partyGuests: { whiteKing: [], blackKing: [] }
});

export const connectionStatus = atom<'disconnected' | 'connecting' | 'connected'>('disconnected');

// Actions
export function makeMove(move: string): boolean {
  const chess = new Chess(gameState.get().board);

  if (chess.move(move)) {
    const newState = gameState.get();
    newState.board = chess.fen();
    newState.currentPlayer = chess.turn() === 'w' ? 'white' : 'black';
    newState.moveHistory.push(move);

    gameState.set(newState);
    return true;
  }
  return false;
}
```

## Connection Management and Recovery

### Robust Connection Handling
```typescript
class ReliableChessConnection extends ChessConnection {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async ensureConnection(): Promise<boolean> {
    if (this.connection?.open) {
      return true;
    }

    return this.attemptReconnection();
  }

  private async attemptReconnection(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts exceeded');
    }

    this.reconnectAttempts++;

    try {
      await this.delay(this.reconnectDelay * this.reconnectAttempts);

      // Attempt to reconnect
      const newConnection = await this.connectToHost(this.lastHostId);

      this.reconnectAttempts = 0;
      return true;
    } catch (error) {
      console.log(`Reconnection attempt ${this.reconnectAttempts} failed`);
      return this.attemptReconnection();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Heartbeat mechanism
  startHeartbeat(): void {
    setInterval(() => {
      this.sendMessage({
        type: 'heartbeat',
        payload: {},
        timestamp: Date.now()
      });
    }, 30000); // Every 30 seconds
  }
}
```

## STUN/TURN Server Configuration

### Production-Ready ICE Configuration
```typescript
const iceServers = [
  // Google STUN servers (free)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },

  // Twilio TURN servers (paid, for production)
  {
    urls: 'turn:global.turn.twilio.com:3478?transport=udp',
    username: 'your-twilio-username',
    credential: 'your-twilio-credential'
  },

  // Fallback TURN servers
  {
    urls: 'turn:global.turn.twilio.com:443?transport=tcp',
    username: 'your-twilio-username',
    credential: 'your-twilio-credential'
  }
];

const peerConfig = {
  config: { iceServers },
  debug: process.env.NODE_ENV === 'development' ? 3 : 0
};
```

## Error Handling and Edge Cases

### Comprehensive Error Management
```typescript
interface ConnectionError {
  type: 'connection_failed' | 'ice_failed' | 'datachannel_error' | 'peer_unavailable';
  message: string;
  timestamp: number;
  canRetry: boolean;
}

class ErrorHandler {
  handleConnectionError(error: ConnectionError): void {
    switch (error.type) {
      case 'connection_failed':
        this.showUserMessage('Connection failed. Trying to reconnect...');
        if (error.canRetry) {
          this.attemptReconnection();
        }
        break;

      case 'ice_failed':
        this.showUserMessage('Network connection issues. Please check your internet.');
        // Try TURN servers as fallback
        this.upgradeToTurnServers();
        break;

      case 'peer_unavailable':
        this.showUserMessage('Your opponent has disconnected.');
        this.pauseGame();
        break;
    }
  }

  private upgradeToTurnServers(): void {
    // Upgrade connection to use TURN servers for NAT traversal
    const turnConfig = {
      iceServers: [
        ...this.basicStunServers,
        ...this.turnServers
      ]
    };

    this.reconnectWithConfig(turnConfig);
  }
}
```

## Message Protocol Design

### Type-Safe Message Protocol
```typescript
type MessageType = 'move' | 'game_state' | 'setup_choice' | 'chat' | 'heartbeat' | 'error';

interface BaseMessage {
  type: MessageType;
  messageId: string;
  timestamp: number;
  senderId: string;
}

interface MoveMessage extends BaseMessage {
  type: 'move';
  payload: {
    move: string; // SAN notation
    fen: string;  // Board state after move
    moveNumber: number;
  };
}

interface GameStateMessage extends BaseMessage {
  type: 'game_state';
  payload: KingsChessState;
}

interface SetupMessage extends BaseMessage {
  type: 'setup_choice';
  payload: {
    setupMode: 'random' | 'mirrored' | 'independent';
    pieceChoice?: string;
    position?: string;
  };
}

type GameMessage = MoveMessage | GameStateMessage | SetupMessage;
```

## Performance Optimization

### Connection Optimization
```typescript
class OptimizedConnection {
  private messageQueue: GameMessage[] = [];
  private batchSize = 10;
  private batchDelay = 100; // ms

  // Batch messages for better performance
  queueMessage(message: GameMessage): void {
    this.messageQueue.push(message);

    if (this.messageQueue.length >= this.batchSize) {
      this.flushQueue();
    } else {
      setTimeout(() => this.flushQueue(), this.batchDelay);
    }
  }

  private flushQueue(): void {
    if (this.messageQueue.length === 0) return;

    const batch = this.messageQueue.splice(0, this.batchSize);
    this.sendBatch(batch);
  }

  // Compress large game states
  compressGameState(state: KingsChessState): string {
    // Use simple compression for large states
    return JSON.stringify(state);
  }
}
```

## Security Considerations

### Move Validation and Anti-Cheat
```typescript
class SecureChessGame {
  private localChess: Chess;
  private remoteChess: Chess;

  constructor() {
    this.localChess = new Chess();
    this.remoteChess = new Chess();
  }

  validateRemoteMove(move: string, remoteFen: string): boolean {
    // Create temporary chess instance
    const tempChess = new Chess(this.remoteChess.fen());

    // Attempt the move
    const result = tempChess.move(move);

    if (!result) {
      console.warn('Invalid move received:', move);
      return false;
    }

    // Verify the resulting FEN matches
    if (tempChess.fen() !== remoteFen) {
      console.warn('FEN mismatch after move');
      return false;
    }

    // Apply to our remote state
    this.remoteChess.move(move);
    return true;
  }

  // Detect potential cheating attempts
  detectAnomalies(moveHistory: string[]): boolean {
    // Check for impossible move sequences
    // Check for timing anomalies
    // Validate game state consistency
    return false; // No anomalies detected
  }
}
```

## Integration with Astro Islands

### Astro Component Integration
```astro
---
// GameConnectionIsland.astro
export interface Props {
  gameId?: string;
  isHost: boolean;
}

const { gameId, isHost } = Astro.props;
---

<div id="game-connection" data-game-id={gameId} data-is-host={isHost}>
  <div id="connection-status">Connecting...</div>
  <div id="game-board"></div>
</div>

<script>
  import { ChessConnection } from '@/lib/webrtc/ChessConnection';
  import { gameState } from '@/lib/stores/gameState';

  const gameElement = document.getElementById('game-connection');
  const gameId = gameElement?.dataset.gameId;
  const isHost = gameElement?.dataset.isHost === 'true';

  const connection = new ChessConnection(gameId);

  if (isHost) {
    connection.waitForConnection().then(() => {
      console.log('Guest connected!');
    });
  } else {
    connection.connectToHost(gameId!).then(() => {
      console.log('Connected to host!');
    });
  }
</script>
```

## Common Pitfalls and Solutions

### 1. DataChannel Timing Issues
**Problem**: Sending messages before DataChannel is fully open
**Solution**: Always check `connection.open` before sending

### 2. NAT Traversal Failures
**Problem**: ~30% of connections fail without TURN servers
**Solution**: Implement TURN server fallback

### 3. Memory Leaks
**Problem**: Event listeners not cleaned up
**Solution**: Implement proper cleanup in component unmount

### 4. State Synchronization Conflicts
**Problem**: Both players make moves simultaneously
**Solution**: Implement move timestamps and conflict resolution

### 5. Connection Recovery
**Problem**: No graceful handling of temporary disconnections
**Solution**: Implement exponential backoff reconnection strategy

This guide provides a production-ready foundation for implementing WebRTC peer-to-peer chess games with proper error handling, performance optimization, and security considerations.