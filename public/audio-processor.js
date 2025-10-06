class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // Get the first channel of the first input.
    const input = inputs[0];
    const channel = input[0];

    if (!channel) {
      return true;
    }

    // The browser provides audio data in Float32Array format, ranging from -1.0 to 1.0.
    // We need to convert it to 16-bit PCM format (Int16Array), ranging from -32768 to 32767.
    const pcm16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Post the 16-bit PCM data back to the main thread.
    // The second argument `[pcm16.buffer]` is a list of transferable objects.
    // This transfers ownership of the buffer to the main thread, which is more efficient.
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
