/** Keep microphone capture identical in the lobby and in the room. */
export function createRoomAudioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    sampleRate: { ideal: 48_000 },
    sampleSize: { ideal: 16 },
    channelCount: { ideal: 1 },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
}
