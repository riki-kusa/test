import SharedAudioContext from './shared-audio-context.js';

class AudioBufferPlayer {
    constructor (channels, sampleRate, outputNode = null) {
        this.audioContext = new SharedAudioContext();
        // Optional node between the source and the speakers, used by the
        // spectrum display. When omitted, play straight to the destination.
        this.outputNode = outputNode;
        const channelCount = channels.length;
        const sampleCount = channels[0] ? channels[0].length : 0;
        this.buffer = this.audioContext.createBuffer(channelCount, sampleCount, sampleRate);
        for (let channel = 0; channel < channelCount; channel++) {
            this.buffer.getChannelData(channel).set(channels[channel]);
        }
        this.source = null;

        this.startTime = null;
        this.updateCallback = null;
        this.trimStart = null;
        this.trimEnd = null;

        // Seeking restarts playback; invalidate any animation frame that was
        // scheduled for the previous position so update loops never multiply.
        this.updateFrame = null;
        this.playToken = 0;
    }

    play (trimStart, trimEnd, onUpdate, onEnded) {
        if (this.updateFrame !== null) {
            cancelAnimationFrame(this.updateFrame);
            this.updateFrame = null;
        }
        this.playToken++;
        const token = this.playToken;
        this.updateCallback = onUpdate;
        this.trimStart = trimStart;
        this.trimEnd = trimEnd;
        this.startTime = Date.now();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const trimStartTime = this.buffer.duration * trimStart;
        const trimmedDuration = (this.buffer.duration * trimEnd) - trimStartTime;

        this.source = this.audioContext.createBufferSource();
        this.source.onended = onEnded;
        this.source.buffer = this.buffer;
        this.source.connect(this.outputNode || this.audioContext.destination);
        this.source.start(0, trimStartTime, trimmedDuration);

        this.update(token);
    }

    update (token) {
        if (token !== this.playToken) return;
        this.updateFrame = null;
        const timeSinceStart = (Date.now() - this.startTime) / 1000;
        const percentage = timeSinceStart / this.buffer.duration;
        if (percentage + this.trimStart < this.trimEnd && this.source.onended) {
            this.updateCallback(percentage + this.trimStart);
            this.updateFrame = requestAnimationFrame(() => this.update(token));
        } else {
            this.updateCallback = null;
        }
    }

    stop () {
        this.playToken++;
        if (this.updateFrame !== null) {
            cancelAnimationFrame(this.updateFrame);
            this.updateFrame = null;
        }
        if (this.source) {
            this.source.onended = null; // Do not call onEnded callback if manually stopped
            try {
                this.source.stop();
            } catch (e) {
                // This is probably Safari, which dies when you call stop more than once
                // which the spec says is allowed: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
                console.log('Caught error while stopping buffer source node.'); // eslint-disable-line no-console
            }
        }
    }
}

export default AudioBufferPlayer;
