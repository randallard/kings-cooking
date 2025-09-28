# WebRTC Testing Strategies for Chess Multiplayer Games

## Overview

This document provides comprehensive testing strategies and tools for WebRTC implementations in chess multiplayer games, focusing on DataChannel communication, P2P connections, and real-time game synchronization.

## 1. WebRTC Testing Libraries

### MockRTC (Primary Recommendation)
- **GitHub**: https://github.com/httptoolkit/mockrtc
- **Installation**: `npm install --save-dev mockrtc`
- **Key Features**:
  - Mock RTCPeerConnection with realistic behavior
  - Simulate WebRTC errors reproducibly
  - Capture and inspect traffic between peers
  - Create proxy peers for message transformation

**Usage Example**:
```javascript
import * as MockRTC from 'mockrtc';

const mockRTC = MockRTC.getRemote({ recordMessages: true });

describe("WebRTC Tests", () => {
  beforeEach(() => mockRTC.start());
  afterEach(() => mockRTC.stop());

  it("should handle chess moves via DataChannel", async () => {
    const mockPeer = await mockRTC
      .buildPeer()
      .waitForChannel('chess-moves')
      .sleep(100)
      .send('{"move": "e2-e4", "player": "white"}')
      .thenEcho();

    const localConnection = new RTCPeerConnection();
    const dataChannel = localConnection.createDataChannel("chess-moves");

    MockRTC.hookWebRTCConnection(localConnection, mockPeer);
    // Test your chess move logic
  });
});
```

### WebRtcPerf (Performance Testing)
- **GitHub**: https://github.com/vpalmisano/webrtcperf
- **Use Case**: Load testing with multiple concurrent connections
- **Features**:
  - Puppeteer-based headless browser spawning
  - Network throttling support
  - RTC statistics collection
  - Multi-platform support (NodeJS + Chromium)

### RestComm WebRTC Test Framework
- **GitHub**: https://github.com/RestComm/webrtc-test
- **Use Case**: Functional and load testing
- **Technology**: Node.js based

## 2. Unit Testing Patterns

### Jest/Vitest RTCPeerConnection Mocking

**Basic Mock Setup**:
```javascript
// Jest
beforeEach(() => {
  global.RTCPeerConnection = jest.fn(() => ({
    onconnectionstatechange: null,
    onicecandidate: null,
    ondatachannel: null,
    createDataChannel: jest.fn(() => ({
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: jest.fn(),
      close: jest.fn(),
      readyState: 'connecting'
    })),
    createOffer: jest.fn(() => Promise.resolve({})),
    createAnswer: jest.fn(() => Promise.resolve({})),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    addIceCandidate: jest.fn(() => Promise.resolve()),
    close: jest.fn()
  }));
});
```

**Vitest Version**:
```javascript
import { vi, describe, it, beforeEach } from 'vitest';

beforeEach(() => {
  global.RTCPeerConnection = vi.fn(() => ({
    // Same mock structure as Jest but with vi.fn()
    createDataChannel: vi.fn(() => ({
      send: vi.fn(),
      close: vi.fn()
    })),
    createOffer: vi.fn(() => Promise.resolve({})),
    // ... other methods
  }));
});
```

### DataChannel Testing Patterns

**Chess Move Communication Test**:
```javascript
describe('Chess Move DataChannel', () => {
  it('should send and receive chess moves', () => {
    const mockDataChannel = {
      onmessage: null,
      send: jest.fn(),
      readyState: 'open'
    };

    const chessGame = new ChessGame(mockDataChannel);

    // Test sending a move
    chessGame.makeMove('e2', 'e4');
    expect(mockDataChannel.send).toHaveBeenCalledWith(
      JSON.stringify({ from: 'e2', to: 'e4', player: 'white' })
    );

    // Test receiving a move
    const receivedMove = { from: 'e7', to: 'e5', player: 'black' };
    mockDataChannel.onmessage({ data: JSON.stringify(receivedMove) });

    expect(chessGame.board.getPosition('e5')).toBe('black-pawn');
  });
});
```

## 3. Integration Testing

### Real WebRTC Connection Testing

**Test Configuration**:
```javascript
describe('Real WebRTC Integration', () => {
  let localConnection, remoteConnection;

  beforeEach(async () => {
    localConnection = new RTCPeerConnection({
      iceServers: [] // Use no STUN/TURN for local testing
    });
    remoteConnection = new RTCPeerConnection({
      iceServers: []
    });
  });

  it('should establish P2P connection for chess game', async () => {
    const localChannel = localConnection.createDataChannel('chess');

    // Set up signaling simulation
    localConnection.onicecandidate = ({ candidate }) => {
      if (candidate) remoteConnection.addIceCandidate(candidate);
    };

    remoteConnection.onicecandidate = ({ candidate }) => {
      if (candidate) localConnection.addIceCandidate(candidate);
    };

    remoteConnection.ondatachannel = ({ channel }) => {
      channel.onmessage = ({ data }) => {
        // Test chess move synchronization
        const move = JSON.parse(data);
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
      };
    };

    // Complete connection establishment
    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
    await remoteConnection.setRemoteDescription(offer);

    const answer = await remoteConnection.createAnswer();
    await remoteConnection.setLocalDescription(answer);
    await localConnection.setRemoteDescription(answer);
  });
});
```

## 4. E2E Testing with Playwright

### Browser Permissions Configuration

**playwright.config.ts**:
```typescript
export default defineConfig({
  use: {
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30000,
    video: 'on-first-retry',
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-running-insecure-content'
      ]
    }
  }
});
```

### Multi-Instance Testing

**Two-Player Chess Game Test**:
```javascript
test('Two players can play chess via WebRTC', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const player1 = await context1.newPage();
  const player2 = await context2.newPage();

  // Navigate both players to the game
  await player1.goto('/chess-game');
  await player2.goto('/chess-game');

  // Player 1 creates a game
  await player1.click('[data-testid="create-game"]');
  const gameCode = await player1.textContent('[data-testid="game-code"]');

  // Player 2 joins the game
  await player2.fill('[data-testid="join-code"]', gameCode);
  await player2.click('[data-testid="join-game"]');

  // Wait for WebRTC connection
  await player1.waitForSelector('[data-testid="connection-status"][data-status="connected"]');
  await player2.waitForSelector('[data-testid="connection-status"][data-status="connected"]');

  // Test chess moves
  await player1.click('[data-square="e2"]');
  await player1.click('[data-square="e4"]');

  // Verify move appears on both boards
  await expect(player1.locator('[data-square="e4"]')).toHaveClass(/white-pawn/);
  await expect(player2.locator('[data-square="e4"]')).toHaveClass(/white-pawn/);
});
```

### CDP Overrides for WebRTC Testing

**Network Condition Simulation**:
```javascript
test('Chess game handles poor network conditions', async ({ page, context }) => {
  const cdpSession = await context.newCDPSession(page);

  // Simulate high latency
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 500, // 500ms latency
    downloadThroughput: 100 * 1024 / 8, // 100 Kbps
    uploadThroughput: 100 * 1024 / 8
  });

  await page.goto('/chess-game');

  // Test that game remains playable under poor conditions
  await page.click('[data-testid="make-move"]');

  // Verify move synchronization still works (may take longer)
  await expect(page.locator('[data-testid="opponent-move"]')).toBeVisible({ timeout: 10000 });
});
```

**STUN Server Mocking**:
```javascript
test.beforeEach(async ({ page }) => {
  // Mock RTCPeerConnection to use only local candidates
  await page.addInitScript(() => {
    const originalRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(config) {
      const newConfig = config ? { ...config, iceServers: [] } : { iceServers: [] };
      return new originalRTCPeerConnection(newConfig);
    };
  });
});
```

## 5. Test Environment Setup

### Docker STUN/TURN Server for Testing

**docker-compose.yml**:
```yaml
version: '3'
services:
  coturn:
    image: coturn/coturn:4.6.3
    restart: always
    network_mode: "host"
    environment:
      - DETECT_EXTERNAL_IP=yes
      - STATIC_AUTH_SECRET=your-secret-key
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49152-65535:49152-65535/udp"
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf
```

**turnserver.conf**:
```
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
realm=yourdomain.com
max-port=65535
min-port=49152
verbose
fingerprint
use-auth-secret
static-auth-secret=your-secret-key
stale-nonce=600
cert=/path/to/cert.pem
pkey=/path/to/private.key
no-stdout-log
```

### CI/CD Configuration

**GitHub Actions for WebRTC Testing**:
```yaml
name: WebRTC Tests

on: [push, pull_request]

jobs:
  webrtc-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start TURN server
        run: |
          docker run -d --name coturn \
            -p 3478:3478 -p 3478:3478/udp \
            -e DETECT_EXTERNAL_IP=yes \
            coturn/coturn:4.6.3

      - name: Run unit tests
        run: npm run test:unit

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TURN_SERVER_URL: turn:localhost:3478
          TURN_USERNAME: test
          TURN_PASSWORD: test
```

## 6. Performance and Load Testing

### Load Testing with WebRtcPerf

**Installation and Usage**:
```bash
# Install webrtcperf
npm install -g webrtcperf

# Run load test for chess game
webrtcperf \
  --url "https://your-chess-game.com" \
  --clients 50 \
  --duration 300 \
  --bandwidth 1000 \
  --latency 50 \
  --packet-loss 1
```

### Memory Leak Testing

**Jest Configuration for Memory Testing**:
```javascript
describe('WebRTC Memory Leaks', () => {
  it('should properly clean up connections', async () => {
    const connections = [];

    // Create multiple connections
    for (let i = 0; i < 100; i++) {
      const pc = new RTCPeerConnection();
      connections.push(pc);
    }

    // Monitor memory usage
    const memBefore = process.memoryUsage();

    // Clean up connections
    connections.forEach(pc => pc.close());

    // Force garbage collection if available
    if (global.gc) global.gc();

    const memAfter = process.memoryUsage();

    // Verify memory was freed
    expect(memAfter.heapUsed).toBeLessThan(memBefore.heapUsed * 1.1);
  });
});
```

## 7. Common Testing Pitfalls and Solutions

### Problem: RTCPeerConnection not available in test environment
**Solution**: Mock the global RTCPeerConnection constructor

### Problem: DataChannel events not firing in tests
**Solution**: Manually trigger event handlers in mocks

### Problem: Async connection establishment timing issues
**Solution**: Use proper async/await patterns and timeouts

### Problem: Browser permissions in headless testing
**Solution**: Use Playwright's permission configuration and fake media flags

### Problem: STUN/TURN server connectivity in CI
**Solution**: Use mock servers or local Docker containers

## 8. Test Organization Structure

```
tests/
├── unit/
│   ├── webrtc/
│   │   ├── connection.test.js
│   │   ├── datachannel.test.js
│   │   └── signaling.test.js
│   └── chess/
│       ├── game-logic.test.js
│       └── move-validation.test.js
├── integration/
│   ├── webrtc-connection.test.js
│   └── chess-synchronization.test.js
├── e2e/
│   ├── multiplayer-game.spec.js
│   └── network-conditions.spec.js
└── load/
    ├── connection-stress.test.js
    └── game-performance.test.js
```

## 9. Key NPM Packages

**Testing Libraries**:
- `mockrtc` - WebRTC mocking and testing
- `@playwright/test` - E2E testing framework
- `vitest` - Modern unit testing framework
- `jest` - Traditional unit testing (alternative to Vitest)

**WebRTC Utilities**:
- `simple-peer` - Simplified WebRTC wrapper
- `webrtc-adapter` - Browser compatibility shims

**Performance Testing**:
- `webrtcperf` - WebRTC performance testing
- `artillery` - Load testing with Playwright support

**Development**:
- `coturn` (Docker) - STUN/TURN server for testing
- `ws` - WebSocket server for signaling testing

This comprehensive testing strategy ensures robust, reliable WebRTC implementations for chess multiplayer games across all testing levels from unit to E2E to performance testing.