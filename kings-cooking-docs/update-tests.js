// Quick script to bulk-update test files to new schema
const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, '__tests__');

// Files to update
const files = [
  'tic-tac-toe-url-encoder.test.ts',
  'tic-tac-toe-delta.test.ts',
  'tic-tac-toe-storage.test.ts',
];

files.forEach(file => {
  const filePath = path.join(testsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace player1Name: 'X' with player1: { id: crypto.randomUUID(), name: 'X' }
  content = content.replace(/player1Name:\s*'([^']+)'/g, "player1: { id: crypto.randomUUID(), name: '$1' }");
  content = content.replace(/player1Name:\s*"([^"]+)"/g, 'player1: { id: crypto.randomUUID(), name: "$1" }');
  content = content.replace(/player1Name:\s*''/g, "player1: { id: '', name: '' }");
  content = content.replace(/player1Name:\s*""/g, 'player1: { id: "", name: "" }');

  // Replace player2Name: 'X' with player2: { id: crypto.randomUUID(), name: 'X' }
  content = content.replace(/player2Name:\s*'([^']+)'/g, "player2: { id: crypto.randomUUID(), name: '$1' }");
  content = content.replace(/player2Name:\s*"([^"]+)"/g, 'player2: { id: crypto.randomUUID(), name: "$1" }');
  content = content.replace(/player2Name:\s*''/g, "player2: { id: '', name: '' }");
  content = content.replace(/player2Name:\s*""/g, 'player2: { id: "", name: "" }');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${file}`);
});

console.log('Done!');
