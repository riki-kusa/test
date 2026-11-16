const getOfflineContext = () => window.OfflineAudioContext || window.webkitOfflineAudioContext;

/**
 * Render channel data at a different sample rate, preserving its duration.
 * Used by the Format menu and by the selection-only format round trip.
 * @param {Float32Array[]} channels Channel data
 * @param {number} sourceRate Source sample rate
 * @param {number} targetRate Target sample rate
 * @returns {Promise<{channels: Float32Array[], sampleRate: number}>} Resampled audio
 */
const resampleChannels = (channels, sourceRate, targetRate) => new Promise((resolve, reject) => {
    const OfflineContext = getOfflineContext();
    if (!OfflineContext) {
        reject(new Error('OfflineAudioContext is not available'));
        return;
    }
    const channelCount = channels.length;
    const sourceLength = channels[0] ? channels[0].length : 0;
    if (sourceLength === 0) {
        resolve({channels: channels.map(() => new Float32Array(0)), sampleRate: targetRate});
        return;
    }

    const duration = sourceLength / sourceRate;
    const targetLength = Math.max(1, Math.round(duration * targetRate));
    let context;
    try {
        context = new OfflineContext(channelCount, targetLength, targetRate);
    } catch (error) {
        reject(error);
        return;
    }

    const input = context.createBuffer(channelCount, sourceLength, sourceRate);
    for (let channel = 0; channel < channelCount; channel++) {
        input.getChannelData(channel).set(channels[channel]);
    }
    const source = context.createBufferSource();
    source.buffer = input;
    source.connect(context.destination);

    const finish = renderedBuffer => {
        const output = [];
        for (let channel = 0; channel < channelCount; channel++) {
            output.push(renderedBuffer.getChannelData(channel));
        }
        resolve({channels: output, sampleRate: targetRate});
    };

    try {
        source.start();
        const rendering = context.startRendering();
        if (rendering && typeof rendering.then === 'function') {
            rendering.then(finish, reject);
        } else {
            context.oncomplete = event => finish(event.renderedBuffer);
        }
    } catch (error) {
        reject(error);
    }
});

/**
 * Apply a sample rate's bandwidth to just a selected range, without changing
 * the sound's sample rate, length or the audio outside the selection. This
 * matches PenguinMod's "format this selection" round trip.
 * @param {Float32Array[]} channels Whole sound channel data
 * @param {number} sampleRate Current sample rate
 * @param {number} startSample Selection start (inclusive)
 * @param {number} endSample Selection end (exclusive)
 * @param {number} targetRate Format sample rate
 * @returns {Promise<Float32Array[]>} New channel data
 */
const resampleSelection = async (channels, sampleRate, startSample, endSample, targetRate) => {
    const start = Math.max(0, Math.min(channels[0].length, startSample));
    const end = Math.max(start, Math.min(channels[0].length, endSample));
    const selected = channels.map(channel => channel.slice(start, end));
    const atTargetRate = await resampleChannels(selected, sampleRate, targetRate);
    const back = await resampleChannels(atTargetRate.channels, targetRate, sampleRate);

    const result = channels.map(channel => new Float32Array(channel));
    const count = Math.min(end - start, back.channels[0] ? back.channels[0].length : 0);
    for (let channel = 0; channel < result.length; channel++) {
        result[channel].set(back.channels[channel].subarray(0, count), start);
    }
    return result;
};

const isSampleRateSupported = sampleRate => {
    const OfflineContext = getOfflineContext();
    if (!OfflineContext) return false;
    try {
        // eslint-disable-next-line no-new
        new OfflineContext(1, 1, sampleRate);
        return true;
    } catch (error) {
        return false;
    }
};

export {
    resampleChannels,
    resampleSelection,
    isSampleRateSupported
};
