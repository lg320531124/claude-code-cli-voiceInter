// public/audioWorker.js
//
// WebWorker for audio processing
// - Audio compression (Opus encoding simulation)
// - Sample rate adjustment
// - Audio data chunking
// - Avoid blocking main thread

// Worker configuration
const config = {
  targetSampleRate: 16000,    // Whisper expects 16kHz
  chunkSize: 4096,           // Processing chunk size
  compressionQuality: 0.8
};

// Audio buffer for processing
let audioBuffer = [];
let totalSamples = 0;

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data, options } = e.data;

  switch (type) {
    case 'process':
      handleProcessAudio(data, options);
      break;

    case 'configure':
      handleConfigure(options);
      break;

    case 'compress':
      handleCompressAudio(data, options);
      break;

    case 'clear':
      handleClearBuffer();
      break;

    case 'getStats':
      handleGetStats();
      break;

    default:
      console.warn('[AudioWorker] Unknown message type:', type);
  }
};

// Configure worker settings
function handleConfigure(options) {
  if (options.targetSampleRate) {
    config.targetSampleRate = options.targetSampleRate;
  }
  if (options.chunkSize) {
    config.chunkSize = options.chunkSize;
  }
  if (options.compressionQuality) {
    config.compressionQuality = options.compressionQuality;
  }

  self.postMessage({
    type: 'configured',
    config: config
  });
}

// Process audio data
function handleProcessAudio(audioData, options) {
  try {
    // Convert Float32Array to Int16Array (PCM 16-bit)
    const int16Data = floatTo16BitPCM(audioData);

    // Resample if needed
    const resampledData = options.sourceSampleRate !== config.targetSampleRate
      ? resampleAudio(int16Data, options.sourceSampleRate || 48000, config.targetSampleRate)
      : int16Data;

    // Add to buffer
    audioBuffer.push(resampledData);
    totalSamples += resampledData.length;

    // Send processed chunk back
    self.postMessage({
      type: 'processed',
      data: resampledData,
      samples: resampledData.length,
      totalSamples: totalSamples
    });

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

// Compress audio data (simulate compression)
function handleCompressAudio(audioData, options) {
  try {
    // In a real implementation, this would use Opus or similar
    // For now, we simulate by reducing precision
    const compressed = simulateCompression(audioData, options.quality || config.compressionQuality);

    self.postMessage({
      type: 'compressed',
      data: compressed,
      originalSize: audioData.length,
      compressedSize: compressed.length,
      ratio: compressed.length / audioData.length
    });

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

// Clear audio buffer
function handleClearBuffer() {
  audioBuffer = [];
  totalSamples = 0;

  self.postMessage({
    type: 'cleared'
  });
}

// Get buffer statistics
function handleGetStats() {
  self.postMessage({
    type: 'stats',
    stats: {
      bufferChunks: audioBuffer.length,
      totalSamples: totalSamples,
      estimatedSize: totalSamples * 2, // 16-bit = 2 bytes per sample
      estimatedDuration: totalSamples / config.targetSampleRate
    }
  });
}

// Convert Float32 to Int16 PCM
function floatTo16BitPCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1]
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale to 16-bit range [-32768, 32767]
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Simple linear interpolation resampling
function resampleAudio(inputData, sourceRate, targetRate) {
  if (sourceRate === targetRate) {
    return inputData;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.ceil(inputData.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i * ratio;
    const index = Math.floor(sourceIndex);
    const fraction = sourceIndex - index;

    if (index + 1 < inputData.length) {
      // Linear interpolation
      output[i] = Math.round(
        inputData[index] * (1 - fraction) + inputData[index + 1] * fraction
      );
    } else {
      output[i] = inputData[index] || 0;
    }
  }

  return output;
}

// Simulate audio compression (reduce precision)
function simulateCompression(data, quality) {
  // Quality 0-1, where 1 is highest quality (no compression)
  // Lower quality = fewer bits per sample

  const bitsPerSample = Math.round(16 * quality);
  const maxVal = Math.pow(2, bitsPerSample - 1) - 1;
  const scale = maxVal / 32767;

  const compressed = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    compressed[i] = Math.round(data[i] * scale);
  }

  return compressed;
}

// Export nothing (worker file)
// This file runs in a separate thread