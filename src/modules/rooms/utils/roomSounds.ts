/**
 * roomSounds.ts
 * ─────────────────────────────────────────────────────────────────────
 * Centralized synthesized sound engine for room events.
 * All sounds are generated via Web Audio API — zero external dependencies,
 * zero network requests, zero Lighthouse impact.
 */

export type RoomSoundType = 'join' | 'leave' | 'screen-share' | 'hangup' | 'message'

/**
 * Plays a short synthesized sound for a room event.
 * Silently fails if Web Audio API is not available.
 */
export function playSynthesizedSound(type: RoomSoundType): void {
  const AudioContextConstructor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const ctx = new AudioContextConstructor()
    const now = ctx.currentTime

    if (type === 'join') {
      // Pleasant ascending chime (C5 → E5 → G5 → C6)
      const frequencies = [523.25, 659.25, 783.99, 1046.5]
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + index * 0.07)

        gain.gain.setValueAtTime(0.06, now + index * 0.07)
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + index * 0.07)
        osc.stop(now + index * 0.07 + 0.22)
      })
    } else if (type === 'leave') {
      // Pleasant descending chime (G5 → E5 → C5)
      const frequencies = [783.99, 659.25, 523.25]
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + index * 0.07)

        gain.gain.setValueAtTime(0.06, now + index * 0.07)
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + index * 0.07)
        osc.stop(now + index * 0.07 + 0.22)
      })
    } else if (type === 'screen-share') {
      // Tech double beep (A5 at 0ms, C6 at 80ms)
      const notes = [
        { freq: 880.0, delay: 0 },
        { freq: 1046.5, delay: 0.08 },
      ]
      notes.forEach((note) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(note.freq, now + note.delay)

        gain.gain.setValueAtTime(0.05, now + note.delay)
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.12)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + note.delay)
        osc.stop(now + note.delay + 0.15)
      })
    } else if (type === 'hangup') {
      // Realistic phone hang-up: short dial-tone burst (350 Hz + 440 Hz mixed),
      // then a quick descending pitch drop to simulate the line going dead.
      // ── Phase 1 (0 ms–160 ms): classic PSTN dial-tone (two sine waves mixed) ──
      const dialFreqs = [350, 440]
      dialFreqs.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        gain.gain.setValueAtTime(0.07, now)
        gain.gain.setValueAtTime(0.07, now + 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.20)
      })

      // ── Phase 2 (220 ms–380 ms): pitch-dropping "thud" — line goes dead ──
      const dropOsc = ctx.createOscillator()
      const dropGain = ctx.createGain()
      dropOsc.type = 'sine'
      dropOsc.frequency.setValueAtTime(260, now + 0.22)
      dropOsc.frequency.exponentialRampToValueAtTime(80, now + 0.38)  // Drop to low thud
      dropGain.gain.setValueAtTime(0.09, now + 0.22)
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40)
      dropOsc.connect(dropGain)
      dropGain.connect(ctx.destination)
      dropOsc.start(now + 0.22)
      dropOsc.stop(now + 0.42)
    } else if (type === 'message') {
      // Soft two-tone notification (G5 → B5) — subtle, non-intrusive
      const notes = [
        { freq: 783.99, delay: 0 },      // G5
        { freq: 987.77, delay: 0.06 },   // B5
      ]
      notes.forEach((note) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle' // Softer timbre than 'sine' for notifications
        osc.frequency.setValueAtTime(note.freq, now + note.delay)

        gain.gain.setValueAtTime(0.04, now + note.delay)
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.18)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + note.delay)
        osc.stop(now + note.delay + 0.2)
      })
    }
  } catch (err) {
    console.warn('[Sound] Failed to play synthesized sound:', err)
  }
}

/**
 * Creates a cooldown-gated version of playSynthesizedSound.
 * Returns a function that plays the sound at most once per `cooldownMs`.
 */
export function createCooldownSound(type: RoomSoundType, cooldownMs = 2000): () => void {
  let lastPlayed = 0
  return () => {
    const now = Date.now()
    if (now - lastPlayed < cooldownMs) return
    lastPlayed = now
    playSynthesizedSound(type)
  }
}
