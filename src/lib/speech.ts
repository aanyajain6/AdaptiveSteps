import * as Speech from "expo-speech";

// Slightly slower than default: easier to follow for kids who process
// spoken language more slowly.
const RATE = 0.9;

/** Stops anything being read, then reads `lines` in order. */
export function speak(lines: string | string[]): void {
  Speech.stop();
  for (const line of Array.isArray(lines) ? lines : [lines]) {
    if (line.trim()) Speech.speak(line, { rate: RATE });
  }
}

export function stopSpeaking(): void {
  Speech.stop();
}
