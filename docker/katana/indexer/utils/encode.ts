import { hash, num } from "https://esm.sh/starknet@5.19.5";

export function encodeIntAsBytes(n: bigint): string {
  const arr = new Uint8Array(32);
  let bigIntValue: bigint = n;

  for (let i = 31; i >= 0; i--) {
    const byteValue: BigInt = bigIntValue & BigInt("0xFF");
    arr[i] = Number(byteValue);
    bigIntValue >>= BigInt(8);
  }

  return arrayBufferToBase64(arr.buffer);
}

export function checkExistsInt(val: any): any | null {
  if (val === 0) {
    return null;
  } else {
    return val;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function getLevelFromXp(val: any): any | null {
  if (val === 0) {
    return 1;
  } else {
    return Math.floor(Math.sqrt(val));
  }
}

// Helper function to ensure we're working with strings
function formatString(value: any): string {
  const num = parseInt(value.toString());
  return num.toString();
}

// Update this function to compute the hash using SHA-256
export function computeHash(
  token: string | null,
  tokenId: string | null
): string {
  const tokenStr = formatString(token);
  const tokenIdStr = formatString(tokenId);
  const combinedString = `${tokenStr}:${tokenIdStr}`;
  return hash.getSelectorFromName(combinedString);
}
