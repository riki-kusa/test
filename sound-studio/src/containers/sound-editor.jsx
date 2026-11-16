import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {
    computeChunkedRMS,
    dropEveryOtherSample
} from '../lib/audio/audio-util.js';
import AudioEffects from '../lib/audio/audio-effects.js';
import SoundEditorComponent from '../components/sound-editor/sound-editor.jsx';
import AudioBufferPlayer from '../lib/audio/audio-buffer-player.js';
import SharedAudioContext from '../lib/audio/shared-audio-context.js';
import {resampleChannels, resampleSelection} from '../lib/audio/resample.js';
import log from '../lib/log.js';

const UNDO_STACK_SIZE = 99;

const MAX_RMS = 1.2;

/**
 * Standalone version of Scratch's sound editor container. Instead of talking
 * to the VM, it reports edited channel data and name changes back to the app.
 */
class SoundEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'copy',
            'copyCurrentBuffer',
            'handleStoppedPlaying',
            'handleChangeName',
            'handlePlay',
            'handleStopPlaying',
            'handleUpdatePlayhead',
            'handleDelete',
            'handleDeleteInverse',
            'handleUpdateTrim',
            'handleEffect',
            'handleModify',
            'handleFormat',
            'handleCopyToNew',
            'handleUndo',
            'handleRedo',
            'submitNewSamples',
            'seekTo',
            'handleCopy',
            'handlePaste',
            'paste',
            'handleKeyPress',
            'handleContainerClick',
            'setRef',
            'resampleBufferToRate'
        ]);
        // A shared analyser between the player and the speakers feeds the small
        // spectrum display without affecting the audio.
        this.audioContext = new SharedAudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.72;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -20;
        this.analyser.connect(this.audioContext.destination);

        this.state = {
            copyBuffer: null,
            chunkLevels: computeChunkedRMS(props.channels),
            isPlaying: false,
            playhead: null, // [0 -> 1] position of the playback cursor, null hides it
            trimStart: null,
            trimEnd: null
        };

        this.redoStack = [];
        this.undoStack = [];

        this.ref = null;
    }
    componentDidMount () {
        this.audioBufferPlayer = new AudioBufferPlayer(
            this.props.channels,
            this.props.sampleRate,
            this.analyser
        );

        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentDidUpdate (prevProps) {
        if (prevProps.docId !== this.props.docId) { // A different sound has been opened
            this.redoStack = [];
            this.undoStack = [];
            this.resetState(this.props.channels, this.props.sampleRate);
            this.setState({
                copyBuffer: null,
                isPlaying: false,
                playhead: null,
                trimStart: null,
                trimEnd: null
            });
        }
    }
    componentWillUnmount () {
        this.audioBufferPlayer.stop();
        this.analyser.disconnect();

        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleKeyPress (event) {
        // Escape clears the selection even when a button or input still has focus:
        // the trimmer prevents mousedown from moving focus, so this is the reliable
        // way to dismiss a selection after interacting with the toolbar.
        if (event.key === 'Escape') {
            if (this.state.trimStart !== null) {
                event.preventDefault();
                this.handleUpdateTrim(null, null);
            }
            return;
        }
        // Ignore other keyboard shortcuts while typing or while a button has focus,
        // so the page's own controls keep working normally.
        if (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            (event.target.closest && event.target.closest('button, [role="button"], [contenteditable="true"]'))) {
            return;
        }
        if (event.key === ' ') {
            event.preventDefault();
            if (this.state.isPlaying) {
                this.handleStopPlaying();
            } else {
                this.handlePlay();
            }
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (this.state.trimStart === null || this.state.trimEnd === null) return;
            event.preventDefault();
            if (event.shiftKey) {
                this.handleDeleteInverse();
            } else {
                this.handleDelete();
            }
        }
        if (event.metaKey || event.ctrlKey) {
            if (event.shiftKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (this.redoStack.length > 0) {
                    this.handleRedo();
                }
            } else if (event.key === 'z') {
                if (this.undoStack.length > 0) {
                    event.preventDefault();
                    this.handleUndo();
                }
            } else if (event.key === 'c') {
                event.preventDefault();
                this.handleCopy();
            } else if (event.key === 'v') {
                event.preventDefault();
                this.handlePaste();
            } else if (event.key === 'a') {
                event.preventDefault();
                this.handleUpdateTrim(0, 1);
            }
        }
    }
    resetState (channels, sampleRate) {
        this.audioBufferPlayer.stop();
        this.audioBufferPlayer = new AudioBufferPlayer(channels, sampleRate, this.analyser);
        this.setState({
            chunkLevels: computeChunkedRMS(channels)
        });
    }
    submitNewSamples (channels, sampleRate, skipUndo) {
        try {
            if (!skipUndo) {
                this.redoStack = [];
                if (this.undoStack.length >= UNDO_STACK_SIZE) {
                    this.undoStack.shift(); // Drop the first element off the array
                }
                this.undoStack.push(this.getUndoItem());
            }
            this.resetState(channels, sampleRate);
            this.props.onChannelsChange(channels, sampleRate);
            return Promise.resolve(true); // Edit was successful
        } catch (e) {
            // This standalone editor has no Scratch upload size limit, so edits
            // are only rejected if the browser cannot allocate the new buffer.
            log.error(`Encountered error while trying to apply sound update: ${e.message}`);
            return Promise.resolve(false); // Edit was not applied
        }
    }
    handlePlay () {
        this.audioBufferPlayer.stop();
        const end = this.state.trimEnd === null ? 1 : this.state.trimEnd;
        let start = this.state.playhead === null ? 0 : this.state.playhead;
        if (start >= end) {
            // Starting at (or past) the end restarts from the beginning, or from
            // the selection start when a selection exists.
            start = this.state.trimStart === null ? 0 : this.state.trimStart;
        }
        if (start >= end) return;
        this.setState({
            isPlaying: true,
            playhead: start
        });
        this.audioBufferPlayer.play(
            start,
            end,
            this.handleUpdatePlayhead,
            this.handleStoppedPlaying);
    }
    handleStopPlaying () {
        this.audioBufferPlayer.stop();
        this.setState({isPlaying: false});
    }
    handleStoppedPlaying () {
        // Natural end of playback: leave the cursor at the end of the played range.
        const end = this.state.trimEnd === null ? 1 : this.state.trimEnd;
        this.setState({
            isPlaying: false,
            playhead: end
        });
    }
    handleUpdatePlayhead (playhead) {
        this.setState({playhead});
    }
    handleChangeName (name) {
        const trimmed = name.trim();
        if (trimmed) this.props.onChangeName(trimmed);
    }
    handleDelete () {
        if (this.state.trimStart === null || this.state.trimEnd === null) return;
        const {channels, sampleRate} = this.copyCurrentBuffer();
        const sampleCount = channels[0].length;
        const startIndex = Math.floor(this.state.trimStart * sampleCount);
        const endIndex = Math.floor(this.state.trimEnd * sampleCount);
        const newChannels = channels.map(samples => {
            const firstPart = samples.slice(0, startIndex);
            const secondPart = samples.slice(endIndex, sampleCount);
            const newLength = firstPart.length + secondPart.length;
            let newSamples;
            if (newLength === 0) {
                newSamples = new Float32Array(1);
            } else {
                newSamples = new Float32Array(newLength);
                newSamples.set(firstPart, 0);
                newSamples.set(secondPart, firstPart.length);
            }
            return newSamples;
        });
        this.submitNewSamples(newChannels, sampleRate).then(() => {
            this.setState({
                trimStart: null,
                trimEnd: null
            });
        });
    }
    handleDeleteInverse () {
        // Delete everything outside of the trimmers
        if (this.state.trimStart === null || this.state.trimEnd === null) return;
        const {channels, sampleRate} = this.copyCurrentBuffer();
        const sampleCount = channels[0].length;
        const startIndex = Math.floor(this.state.trimStart * sampleCount);
        const endIndex = Math.floor(this.state.trimEnd * sampleCount);
        const clippedChannels = channels.map(samples => {
            const clipped = samples.slice(startIndex, endIndex);
            return clipped.length === 0 ? new Float32Array(1) : clipped;
        });
        this.submitNewSamples(clippedChannels, sampleRate).then(success => {
            if (success) {
                this.setState({
                    trimStart: null,
                    trimEnd: null
                });
            }
        });
    }
    seekTo (position) {
        if (!this.state.isPlaying) return;
        if (position >= 1) {
            this.audioBufferPlayer.stop();
            this.setState({
                isPlaying: false,
                playhead: 1
            });
            return;
        }
        // Restart playback from the new position and keep going to the end.
        // A seek click clears any selection, so there is no trim end to honor.
        this.audioBufferPlayer.stop();
        this.setState({playhead: position});
        this.audioBufferPlayer.play(
            position,
            1,
            this.handleUpdatePlayhead,
            this.handleStoppedPlaying);
    }
    handleUpdateTrim (trimStart, trimEnd) {
        // A zero-length selection is how AudioSelector reports a click. Treat it
        // as a cursor move instead of a selection: seek while playing, and keep
        // the cursor at the click position otherwise.
        const isCursorMove = trimStart !== null && trimStart === trimEnd;
        this.setState({
            trimStart: isCursorMove ? null : trimStart,
            trimEnd: isCursorMove ? null : trimEnd,
            playhead: trimStart === null ? this.state.playhead : trimStart
        });
        if (isCursorMove) {
            this.seekTo(trimStart);
            return;
        }
        if (trimStart === null) {
            // Clearing the selection should not interrupt playback.
            return;
        }
        // A real range selection pauses playback so the user can edit it.
        this.handleStopPlaying();
    }
    effectFactory (name) {
        return () => this.handleEffect(name);
    }
    copyCurrentBuffer () {
        // Cannot reliably use props.channels because it gets detached by Firefox
        const buffer = this.audioBufferPlayer.buffer;
        const channels = [];
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            channels.push(buffer.getChannelData(channel));
        }
        return {
            channels,
            sampleRate: buffer.sampleRate
        };
    }
    handleEffect (effect) {
        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;

        // Offline audio context needs at least 2 samples
        if (this.audioBufferPlayer.buffer.length < 2) {
            return;
        }

        try {
            const effects = new AudioEffects(this.audioBufferPlayer.buffer, effect, trimStart, trimEnd);
            effects.process((renderedBuffer, adjustedTrimStart, adjustedTrimEnd) => {
                const channels = [];
                for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
                    channels.push(renderedBuffer.getChannelData(channel));
                }
                const sampleRate = renderedBuffer.sampleRate;
                this.submitNewSamples(channels, sampleRate).then(success => {
                    if (success) {
                        if (this.state.trimStart === null) {
                            this.handlePlay();
                        } else {
                            this.setState({
                                playhead: adjustedTrimStart,
                                trimStart: adjustedTrimStart,
                                trimEnd: adjustedTrimEnd
                            }, this.handlePlay);
                        }
                    }
                });
            });
        } catch (error) {
            log.error(`Could not apply audio effect: ${error.message}`);
            if (this.props.onError) this.props.onError('音声エフェクトを適用できませんでした。');
        }
    }
    handleModify (pitch, volume) {
        this.handleEffect({pitch, volume});
    }
    handleFormat (sampleRate, wholeSound) {
        const {channels, sampleRate: currentRate} = this.copyCurrentBuffer();
        if (sampleRate === currentRate) return Promise.resolve(true);

        const finish = promise => promise.then(newChannels => {
            const newRate = wholeSound ? sampleRate : currentRate;
            return this.submitNewSamples(newChannels, newRate).then(success => {
                if (success) this.handlePlay();
                return success;
            });
        }).catch(error => {
            log.error(`Could not format sound: ${error.message}`);
            if (this.props.onError) this.props.onError('このサンプルレートに変換できませんでした。');
            return false;
        });

        if (wholeSound) {
            return finish(resampleChannels(channels, currentRate, sampleRate)
                .then(result => result.channels));
        }

        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;
        const sampleCount = channels[0].length;
        const startSample = Math.floor(trimStart * sampleCount);
        const endSample = Math.ceil(trimEnd * sampleCount);
        return finish(resampleSelection(channels, currentRate, startSample, endSample, sampleRate));
    }
    handleCopyToNew () {
        if (!this.props.onCopyToNew) return;
        const {channels, sampleRate} = this.copyCurrentBuffer();
        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;
        const sampleCount = channels[0].length;
        const startSample = Math.floor(trimStart * sampleCount);
        const endSample = Math.ceil(trimEnd * sampleCount);
        const copied = channels.map(channel => channel.slice(startSample, endSample));
        this.props.onCopyToNew(copied, sampleRate);
    }
    tooLoud () {
        const numChunks = this.state.chunkLevels.length;
        const startIndex = this.state.trimStart === null ?
            0 : Math.floor(this.state.trimStart * numChunks);
        const endIndex = this.state.trimEnd === null ?
            numChunks - 1 : Math.ceil(this.state.trimEnd * numChunks);
        const trimChunks = this.state.chunkLevels.slice(startIndex, endIndex);
        return Math.max(...trimChunks) > MAX_RMS;
    }
    getUndoItem () {
        return {
            ...this.copyCurrentBuffer(),
            trimStart: this.state.trimStart,
            trimEnd: this.state.trimEnd
        };
    }
    handleUndo () {
        this.redoStack.push(this.getUndoItem());
        const {channels, sampleRate, trimStart, trimEnd} = this.undoStack.pop();
        if (channels) {
            return this.submitNewSamples(channels, sampleRate, true).then(success => {
                if (success) {
                    this.setState({
                        playhead: trimStart === null ? this.state.playhead : trimStart,
                        trimStart: trimStart,
                        trimEnd: trimEnd
                    }, this.handlePlay);
                }
            });
        }
    }
    handleRedo () {
        const {channels, sampleRate, trimStart, trimEnd} = this.redoStack.pop();
        if (channels) {
            this.undoStack.push(this.getUndoItem());
            return this.submitNewSamples(channels, sampleRate, true).then(success => {
                if (success) {
                    this.setState({
                        playhead: trimStart === null ? this.state.playhead : trimStart,
                        trimStart: trimStart,
                        trimEnd: trimEnd
                    }, this.handlePlay);
                }
            });
        }
    }
    handleCopy () {
        this.copy();
    }
    copy (callback) {
        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;

        const newCopyBuffer = this.copyCurrentBuffer();
        const trimStartSamples = trimStart * newCopyBuffer.channels[0].length;
        const trimEndSamples = trimEnd * newCopyBuffer.channels[0].length;
        newCopyBuffer.channels = newCopyBuffer.channels.map(samples =>
            samples.slice(trimStartSamples, trimEndSamples));

        this.setState({
            copyBuffer: newCopyBuffer
        }, callback);
    }
    resampleBufferToRate (buffer, newRate) {
        return new Promise((resolve, reject) => {
            const sampleRateRatio = newRate / buffer.sampleRate;
            const channelCount = buffer.channels.length;
            const newLength = Math.ceil(sampleRateRatio * buffer.channels[0].length);
            let offlineContext;
            // Try to use either OfflineAudioContext or webkitOfflineAudioContext to resample
            // The constructors will throw if trying to resample at an unsupported rate
            // (e.g. Safari/webkitOAC does not support lower than 44khz).
            try {
                if (window.OfflineAudioContext) {
                    offlineContext = new window.OfflineAudioContext(channelCount, newLength, newRate);
                } else if (window.webkitOfflineAudioContext) {
                    offlineContext = new window.webkitOfflineAudioContext(channelCount, newLength, newRate);
                }
            } catch {
                // If no OAC available and downsampling by 2, downsample by dropping every other sample.
                if (newRate === buffer.sampleRate / 2) {
                    return resolve(dropEveryOtherSample(buffer));
                }
                return reject(new Error('Could not resample'));
            }
            const source = offlineContext.createBufferSource();
            const audioBuffer = offlineContext.createBuffer(
                channelCount, buffer.channels[0].length, buffer.sampleRate);
            for (let channel = 0; channel < channelCount; channel++) {
                audioBuffer.getChannelData(channel).set(buffer.channels[channel]);
            }
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();
            offlineContext.startRendering();
            offlineContext.oncomplete = ({renderedBuffer}) => {
                const channels = [];
                for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
                    channels.push(renderedBuffer.getChannelData(channel));
                }
                resolve({
                    channels,
                    sampleRate: newRate
                });
            };
        });
    }
    paste () {
        // If there's no selection, paste at the end of the sound
        const {channels} = this.copyCurrentBuffer();
        const copyChannels = this.state.copyBuffer.channels;
        if (this.state.trimStart === null) {
            const originalLength = channels[0].length;
            const newLength = originalLength + copyChannels[0].length;
            const newChannels = channels.map((samples, channel) => {
                const newSamples = new Float32Array(newLength);
                newSamples.set(samples, 0);
                newSamples.set(copyChannels[channel], originalLength);
                return newSamples;
            });
            this.submitNewSamples(newChannels, this.props.sampleRate, false).then(success => {
                if (success) {
                    this.handlePlay();
                }
            });
        } else {
            // else replace the selection with the pasted sound
            const sampleCount = channels[0].length;
            const trimStartSamples = this.state.trimStart * sampleCount;
            const trimEndSamples = this.state.trimEnd * sampleCount;
            const newChannels = channels.map((samples, channel) => {
                const firstPart = samples.slice(0, trimStartSamples);
                const lastPart = samples.slice(trimEndSamples);
                const pasted = copyChannels[channel];
                const newLength = firstPart.length + pasted.length + lastPart.length;
                const newSamples = new Float32Array(newLength);
                newSamples.set(firstPart, 0);
                newSamples.set(pasted, firstPart.length);
                newSamples.set(lastPart, firstPart.length + pasted.length);
                return newSamples;
            });

            const trimStartSeconds = trimStartSamples / this.props.sampleRate;
            const trimEndSeconds = trimStartSeconds +
                (copyChannels[0].length / this.state.copyBuffer.sampleRate);
            const newDurationSeconds = newChannels[0].length / this.state.copyBuffer.sampleRate;
            const adjustedTrimStart = trimStartSeconds / newDurationSeconds;
            const adjustedTrimEnd = trimEndSeconds / newDurationSeconds;
            this.submitNewSamples(newChannels, this.props.sampleRate, false).then(success => {
                if (success) {
                    this.setState({
                        trimStart: adjustedTrimStart,
                        trimEnd: adjustedTrimEnd
                    }, this.handlePlay);
                }
            });
        }
    }
    handlePaste () {
        if (!this.state.copyBuffer) return;
        if (this.state.copyBuffer.sampleRate === this.props.sampleRate) {
            this.paste();
        } else {
            this.resampleBufferToRate(this.state.copyBuffer, this.props.sampleRate).then(buffer => {
                this.setState({
                    copyBuffer: buffer
                }, this.paste);
            });
        }
    }
    setRef (element) {
        this.ref = element;
    }
    handleContainerClick (e) {
        // If the click is on the sound editor's div (and not any other element), delesect
        if (e.target === this.ref && this.state.trimStart !== null) {
            this.handleUpdateTrim(null, null);
        }
    }
    render () {
        const {effectTypes} = AudioEffects;
        const channelCount = this.props.channels.length;
        const duration = this.props.channels[0] ?
            this.props.channels[0].length / this.props.sampleRate : 0;
        return (
            <SoundEditorComponent
                analyser={this.analyser}
                canPaste={this.state.copyBuffer !== null}
                canRedo={this.redoStack.length > 0}
                canUndo={this.undoStack.length > 0}
                channels={this.props.channels}
                chunkLevels={this.state.chunkLevels}
                docId={this.props.docId}
                dataFormat={this.props.dataFormat}
                duration={duration}
                isPlaying={this.state.isPlaying}
                isStereo={channelCount !== 1}
                name={this.props.name}
                playhead={this.state.playhead}
                sampleRate={this.props.sampleRate}
                setRef={this.setRef}
                size={this.props.size}
                tooLoud={this.tooLoud()}
                trimEnd={this.state.trimEnd}
                trimStart={this.state.trimStart}
                onChangeName={this.handleChangeName}
                onContainerClick={this.handleContainerClick}
                onCopy={this.handleCopy}
                onCopyToNew={this.handleCopyToNew}
                onDelete={this.handleDelete}
                onEcho={this.effectFactory(effectTypes.ECHO)}
                onFadeIn={this.effectFactory(effectTypes.FADEIN)}
                onFadeOut={this.effectFactory(effectTypes.FADEOUT)}
                onFaster={this.effectFactory(effectTypes.FASTER)}
                onLouder={this.effectFactory(effectTypes.LOUDER)}
                onMute={this.effectFactory(effectTypes.MUTE)}
                onLowPass={this.effectFactory(effectTypes.LOWPASS)}
                onHighPass={this.effectFactory(effectTypes.HIGHPASS)}
                onModify={this.handleModify}
                onFormat={this.handleFormat}
                onPaste={this.handlePaste}
                onPlay={this.handlePlay}
                onRedo={this.handleRedo}
                onReverse={this.effectFactory(effectTypes.REVERSE)}
                onRobot={this.effectFactory(effectTypes.ROBOT)}
                onSetTrim={this.handleUpdateTrim}
                onSlower={this.effectFactory(effectTypes.SLOWER)}
                onSofter={this.effectFactory(effectTypes.SOFTER)}
                onStop={this.handleStopPlaying}
                onUndo={this.handleUndo}
            />
        );
    }
}

SoundEditor.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.instanceOf(Float32Array)).isRequired,
    dataFormat: PropTypes.string,
    docId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    sampleRate: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
    onChannelsChange: PropTypes.func.isRequired,
    onChangeName: PropTypes.func.isRequired,
    onCopyToNew: PropTypes.func,
    onError: PropTypes.func
};

export default SoundEditor;
