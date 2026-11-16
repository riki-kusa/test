import WavEncoder from 'wav-encoder';

const DEFAULT_SAMPLE_RATE = 44100;
const WAV_HEADER_BYTES = 44;

/**
 * Create a silent mono sound. Used as the starting document so the editor
 * always has a valid buffer to display.
 * @param {number} seconds Duration in seconds
 * @param {number} sampleRate Sample rate in Hz
 * @returns {{channels: Float32Array[], sampleRate: number}} The silent sound
 */
const makeSilentSound = (seconds = 1, sampleRate = DEFAULT_SAMPLE_RATE) => ({
    channels: [new Float32Array(Math.max(1, Math.round(seconds * sampleRate)))],
    sampleRate
});

/**
 * Decode an audio file, preserving all of its channels (mono or stereo).
 * @param {File|Blob} file Audio file to decode
 * @returns {Promise<{channels: Float32Array[], sampleRate: number}>} Decoded sound
 */
const decodeAudioFile = async file => {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channels = [];
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            channels.push(audioBuffer.getChannelData(channel).slice());
        }
        return {
            channels,
            sampleRate: audioBuffer.sampleRate
        };
    } finally {
        if (audioContext.close) audioContext.close();
    }
};

/**
 * Byte length of the 16-bit PCM WAV file that would be produced for a sound.
 * This matches the current size shown by Scratch/TurboWarp after a sound is
 * edited and re-encoded as WAV.
 * @param {Float32Array[]} channels Channel data
 * @returns {number} Size in bytes
 */
const getWavByteLength = channels => {
    const sampleCount = channels[0] ? channels[0].length : 0;
    return WAV_HEADER_BYTES + (sampleCount * channels.length * 2);
};

/**
 * Encode a sound (mono or stereo) as a 16-bit PCM WAV file.
 * @param {{channels: Float32Array[], sampleRate: number}} sound Sound to encode
 * @returns {Promise<Blob>} WAV blob
 */
const encodeWav = sound => WavEncoder.encode({
    sampleRate: sound.sampleRate,
    channelData: sound.channels
}).then(wavBuffer => new Blob([wavBuffer], {type: 'audio/wav'}));

export {
    DEFAULT_SAMPLE_RATE,
    decodeAudioFile,
    encodeWav,
    getWavByteLength,
    makeSilentSound
};
