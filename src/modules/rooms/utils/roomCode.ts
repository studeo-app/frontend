const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isValidRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

export function parseRoomCodeFromInput(value: string): string {
  return normalizeRoomCode(value);
}
