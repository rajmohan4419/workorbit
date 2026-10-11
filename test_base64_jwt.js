import assert from 'node:assert';

function base64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

function base64Decode(str) {
  const binString = atob(str);
  const bytes = Uint8Array.from(binString, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeJwt(token) {
  if (!token.trim()) return { header: '', payload: '' };
  const p = token.split('.');
  if (p.length !== 3) throw new Error('A JWT must contain three parts');
  const dec = s => {
    const normalized = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
    return JSON.stringify(JSON.parse(base64Decode(normalized)), null, 2);
  };
  return { header: dec(p[0]), payload: dec(p[1]) };
}

// Test cases
console.log('Testing Base64 encoding/decoding...');

// 1. ASCII string
const asciiStr = 'Hello OrbitBoard';
const asciiEncoded = base64Encode(asciiStr);
const asciiDecoded = base64Decode(asciiEncoded);
assert.strictEqual(asciiDecoded, asciiStr, 'ASCII encoding/decoding failed');

// 2. Unicode / UTF-8 string with multi-byte characters and emojis
const unicodeStr = 'Hello 🚀 OrbitBoard ✨ - こんにちは - 🔒';
const unicodeEncoded = base64Encode(unicodeStr);
const unicodeDecoded = base64Decode(unicodeEncoded);
assert.strictEqual(unicodeDecoded, unicodeStr, 'Unicode UTF-8 encoding/decoding failed');

// 3. JWT decoding test
console.log('Testing JWT decoding...');
const headerObj = { alg: 'HS256', typ: 'JWT' };
const payloadObj = { sub: '1234567890', name: 'John Doe 🚀', iat: 1516239022 };
const headerB64 = base64Encode(JSON.stringify(headerObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const payloadB64 = base64Encode(JSON.stringify(payloadObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const dummyJwt = `${headerB64}.${payloadB64}.signature`;

const jwtResult = decodeJwt(dummyJwt);
assert.deepStrictEqual(JSON.parse(jwtResult.header), headerObj, 'JWT header decoding failed');
assert.deepStrictEqual(JSON.parse(jwtResult.payload), payloadObj, 'JWT payload decoding failed');

console.log('All tests passed successfully!');
