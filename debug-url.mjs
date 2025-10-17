// Quick script to decode the URL payload
import LZString from 'lz-string';

const url = process.argv[2];

if (!url) {
  console.error('Usage: node debug-url.mjs <url-with-hash>');
  process.exit(1);
}

// Extract hash
const hash = url.includes('#') ? url.split('#')[1] : url;

console.log('Hash fragment:', hash);
console.log('');

// Decompress
const decompressed = LZString.decompressFromEncodedURIComponent(hash);

if (!decompressed) {
  console.error('Failed to decompress');
  process.exit(1);
}

console.log('Decompressed JSON:');
const payload = JSON.parse(decompressed);
console.log(JSON.stringify(payload, null, 2));
