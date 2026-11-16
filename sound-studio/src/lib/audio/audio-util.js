const SOUND_BYTE_LIMIT = 10 * 1000 * 1000; // 10mb

/**
 * Compute the RMS level across all channels of a sound.
 * @param {Float32Array[]} channels Channel data
 * @param {number} scaling Scaling factor used by Scratch's waveform
 * @returns {number} RMS level
 */
const computeRMS = function (channels, scaling = 0.55) {
    let sum = 0;
    let count = 0;
    for (let channel = 0; channel < channels.length; channel++) {
        const samples = channels[channel];
        for (let i = 0; i < samples.length; i++) {
            sum += Math.pow(samples[i], 2);
        }
        count += samples.length;
    }
    if (count === 0) return 0;
    // Calculate RMS, adapted from https://github.com/Tonejs/Tone.js/blob/master/Tone/component/Meter.js#L88
    const rms = Math.sqrt(sum / count);
    const val = rms / scaling;
    return Math.sqrt(val);
};

/**
 * Compute chunked RMS levels across all channels, for drawing the waveform.
 * @param {Float32Array[]} channels Channel data
 * @param {number} chunkSize Number of samples per chunk
 * @returns {number[]} RMS level per chunk
 */
const computeChunkedRMS = function (channels, chunkSize = 1024) {
    const sampleCount = channels[0] ? channels[0].length : 0;
    const chunkLevels = [];
    for (let i = 0; i < sampleCount; i += chunkSize) {
        const maxIndex = Math.min(sampleCount, i + chunkSize);
        let sum = 0;
        let count = 0;
        for (let channel = 0; channel < channels.length; channel++) {
            const samples = channels[channel];
            for (let j = i; j < maxIndex; j++) {
                sum += Math.pow(samples[j], 2);
            }
            count += maxIndex - i;
        }
        const rms = count === 0 ? 0 : Math.sqrt(sum / count);
        chunkLevels.push(Math.sqrt(rms / 0.55));
    }
    return chunkLevels;
};

/**
 @typedef SoundBuffer
 @type {Object}
 @property {Float32Array[]} channels Channel data (mono or stereo)
 @property {number} sampleRate Audio sample rate
 */

/**
 * Downsample the given buffer to try to reduce file size below SOUND_BYTE_LIMIT
 * @param {SoundBuffer} buffer - Buffer to resample
 * @param {function(SoundBuffer):Promise<SoundBuffer>} resampler - resampler function
 * @returns {SoundBuffer} Downsampled buffer with half the sample rate
 */
const downsampleIfNeeded = (buffer, resampler) => {
    const {channels, sampleRate} = buffer;
    const sampleCount = channels[0] ? channels[0].length : 0;
    const channelCount = channels.length;
    const duration = sampleCount / sampleRate;
    const encodedByteLength = sampleCount * channelCount * 2; /* bitDepth 16 bit */
    // Resolve immediately if already within byte limit
    if (encodedByteLength < SOUND_BYTE_LIMIT) {
        return Promise.resolve({channels, sampleRate});
    }
    // If encodeable at 22khz, resample and call submitNewSamples again
    if (duration * 22050 * 2 * channelCount < SOUND_BYTE_LIMIT) {
        return resampler({channels, sampleRate}, 22050);
    }
    // Cannot save this sound at 22khz, refuse to edit
    // In the future we could introduce further compression here
    return Promise.reject(new Error('Sound too large to save, refusing to edit'));
};

/**
 * Drop every other sample of an audio buffer as a last-resort way of downsampling.
 * @param {SoundBuffer} buffer - Buffer to resample
 * @returns {SoundBuffer} Downsampled buffer with half the sample rate
 */
const dropEveryOtherSample = buffer => {
    const newLength = Math.floor(buffer.channels[0].length / 2);
    const newChannels = buffer.channels.map(samples => {
        const newSamples = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            newSamples[i] = samples[i * 2];
        }
        return newSamples;
    });
    return {
        channels: newChannels,
        sampleRate: buffer.sampleRate / 2
    };
};

export {
    computeRMS,
    computeChunkedRMS,
    downsampleIfNeeded,
    dropEveryOtherSample
};
