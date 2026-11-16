import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';

import Waveform from '../waveform/waveform.jsx';
import Label from '../forms/label.jsx';
import Input from '../forms/input.jsx';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import AudioSelector from '../../containers/audio-selector.jsx';
import IconButton from '../icon-button/icon-button.jsx';
import Spectrum from '../spectrum/spectrum.jsx';
import ModifyModal from './modify-modal.jsx';
import FormatModal from './format-modal.jsx';

import styles from './sound-editor.css';

import playIcon from './icon--play.svg';
import stopIcon from './icon--stop.svg';
import redoIcon from './icon--redo.svg';
import undoIcon from './icon--undo.svg';
import fasterIcon from './icon--faster.svg';
import slowerIcon from './icon--slower.svg';
import louderIcon from './icon--louder.svg';
import softerIcon from './icon--softer.svg';
import robotIcon from './icon--robot.svg';
import reverseIcon from './icon--reverse.svg';
import fadeOutIcon from './icon--fade-out.svg';
import fadeInIcon from './icon--fade-in.svg';
import muteIcon from './icon--mute.svg';
import modifyIcon from './icon--modify.svg';
import formatIcon from './icon--format.svg';
import echoIcon from './icon--echo.svg';
import lowpassIcon from './icon--lowpass.svg';
import highpassIcon from './icon--highpass.svg';

import deleteIcon from './icon--delete.svg';
import copyIcon from './icon--copy.svg';
import pasteIcon from './icon--paste.svg';
import copyToNewIcon from './icon--copy-to-new.svg';

const BufferedInput = BufferedInputHOC(Input);

const messages = defineMessages({
    sound: {
        id: 'gui.soundEditor.sound',
        description: 'Label for the name of the sound',
        defaultMessage: 'Sound'
    },
    play: {
        id: 'gui.soundEditor.play',
        description: 'Title of the button to start playing the sound',
        defaultMessage: 'Play'
    },
    stop: {
        id: 'gui.soundEditor.stop',
        description: 'Title of the button to stop the sound',
        defaultMessage: 'Stop'
    },
    copy: {
        id: 'gui.soundEditor.copy',
        description: 'Title of the button to copy the sound',
        defaultMessage: 'Copy'
    },
    paste: {
        id: 'gui.soundEditor.paste',
        description: 'Title of the button to paste the sound',
        defaultMessage: 'Paste'
    },
    copyToNew: {
        id: 'gui.soundEditor.copyToNew',
        description: 'Title of the button to copy the selection into a new sound',
        defaultMessage: 'Copy to New'
    },
    delete: {
        id: 'gui.soundEditor.delete',
        description: 'Title of the button to delete the sound',
        defaultMessage: 'Delete'
    },
    save: {
        id: 'gui.soundEditor.save',
        description: 'Title of the button to save trimmed sound',
        defaultMessage: 'Save'
    },
    undo: {
        id: 'gui.soundEditor.undo',
        description: 'Title of the button to undo',
        defaultMessage: 'Undo'
    },
    redo: {
        id: 'gui.soundEditor.redo',
        description: 'Title of the button to redo',
        defaultMessage: 'Redo'
    },
    faster: {
        id: 'gui.soundEditor.faster',
        description: 'Title of the button to apply the faster effect',
        defaultMessage: 'Faster'
    },
    slower: {
        id: 'gui.soundEditor.slower',
        description: 'Title of the button to apply the slower effect',
        defaultMessage: 'Slower'
    },
    echo: {
        id: 'gui.soundEditor.echo',
        description: 'Title of the button to apply the echo effect',
        defaultMessage: 'Echo'
    },
    robot: {
        id: 'gui.soundEditor.robot',
        description: 'Title of the button to apply the robot effect',
        defaultMessage: 'Robot'
    },
    louder: {
        id: 'gui.soundEditor.louder',
        description: 'Title of the button to apply the louder effect',
        defaultMessage: 'Louder'
    },
    softer: {
        id: 'gui.soundEditor.softer',
        description: 'Title of the button to apply thr.softer effect',
        defaultMessage: 'Softer'
    },
    reverse: {
        id: 'gui.soundEditor.reverse',
        description: 'Title of the button to apply the reverse effect',
        defaultMessage: 'Reverse'
    },
    fadeOut: {
        id: 'gui.soundEditor.fadeOut',
        description: 'Title of the button to apply the fade out effect',
        defaultMessage: 'Fade out'
    },
    fadeIn: {
        id: 'gui.soundEditor.fadeIn',
        description: 'Title of the button to apply the fade in effect',
        defaultMessage: 'Fade in'
    },
    mute: {
        id: 'gui.soundEditor.mute',
        description: 'Title of the button to apply the mute effect',
        defaultMessage: 'Mute'
    },
    lowPass: {
        id: 'pm.soundEditor.lowPass',
        description: 'Title of the button to apply low pass on audio',
        defaultMessage: 'Low Pass'
    },
    highPass: {
        id: 'pm.soundEditor.highPass',
        description: 'Title of the button to apply high pass on audio',
        defaultMessage: 'High Pass'
    },
    format: {
        id: 'pm.soundEditor.format',
        description: 'Title of the button that opens the audio formatting menu',
        defaultMessage: 'Format'
    },
    modify: {
        id: 'pm.soundEditor.modify',
        description: 'Title of the button that opens the modify sound menu',
        defaultMessage: 'Modify'
    }
});

const formatTime = timeSeconds => {
    const minutes = (Math.floor(timeSeconds / 60))
        .toString()
        .padStart(2, '0');
    const seconds = (timeSeconds % 60)
        .toFixed(2)
        .padStart(5, '0');
    return `${minutes}:${seconds}`;
};

const formatDuration = (playheadPercent, trimStartPercent, trimEndPercent, durationSeconds) => {
    // If no selection, the trim is the entire sound.
    trimStartPercent = trimStartPercent === null ? 0 : trimStartPercent;
    trimEndPercent = trimEndPercent === null ? 1 : trimEndPercent;

    // If the playhead doesn't exist, assume it's at the start of the selection.
    playheadPercent = playheadPercent === null ? trimStartPercent : playheadPercent;

    // If selection has zero length, treat it as the entire sound being selected.
    // This happens when the user first clicks to start making a selection.
    const trimSize = (trimEndPercent - trimStartPercent) || 1;
    const trimDuration = trimSize * durationSeconds;

    const progressInTrim = (playheadPercent - trimStartPercent) / trimSize;
    const currentTime = progressInTrim * trimDuration;

    return `${formatTime(currentTime)} / ${formatTime(trimDuration)}`;
};

const formatSoundSize = bytes => {
    if (bytes > 1000 * 1000) {
        return `${(bytes / 1000 / 1000).toFixed(2)}MB`;
    }
    return `${(bytes / 1000).toFixed(2)}KB`;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 512;
const PEAK_ZOOM = 6;
const MIN_RMS_POINTS = 220;
const WAVEFORM_WIDTH = 600;
const PEAK_WIDTH = 2048;
const WHEEL_ZOOM_SPEED = 0.0025;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Scan only the visible samples and keep their real min/max peaks. Doing this
// from the source data (rather than a precomputed coarse envelope) is what
// makes the waveform show actual detail at high zoom.
const getVisiblePeakData = (channels, viewStart, zoom, maxPoints) => {
    const sampleCount = channels[0] ? channels[0].length : 0;
    const startSample = Math.floor(viewStart * sampleCount);
    const endSample = Math.min(sampleCount, Math.ceil((viewStart + (1 / zoom)) * sampleCount));
    const span = Math.max(1, endSample - startSample);
    const pointCount = Math.max(2, Math.min(maxPoints, span));
    const samplesPerPoint = span / pointCount;
    const displayMins = new Array(pointCount);
    const displayMaxs = new Array(pointCount);

    for (let i = 0; i < pointCount; i++) {
        const from = startSample + Math.floor(i * samplesPerPoint);
        const to = Math.min(endSample, Math.max(from + 1,
            startSample + Math.floor((i + 1) * samplesPerPoint)));
        let min = 0;
        let max = 0;
        for (let channel = 0; channel < channels.length; channel++) {
            const samples = channels[channel];
            for (let sample = from; sample < to; sample++) {
                const value = samples[sample];
                if (value < min) min = value;
                if (value > max) max = value;
            }
        }
        displayMins[i] = min;
        displayMaxs[i] = max;
    }
    return {mins: displayMins, maxs: displayMaxs};
};

const SoundEditorView = props => (
    <div
        className={styles.editorContainer}
        ref={props.setRef}
        onMouseDown={props.onContainerClick}
    >
        <div className={styles.row}>
            <div className={styles.inputGroup}>
                <Label text={props.intl.formatMessage(messages.sound)}>
                    <BufferedInput
                        tabIndex="1"
                        type="text"
                        value={props.name}
                        onSubmit={props.onChangeName}
                    />
                </Label>
                <div className={styles.buttonGroup}>
                    <button
                        className={styles.button}
                        disabled={!props.canUndo}
                        title={props.intl.formatMessage(messages.undo)}
                        onClick={props.onUndo}
                    >
                        <img
                            className={styles.undoIcon}
                            draggable={false}
                            src={undoIcon}
                        />
                    </button>
                    <button
                        className={styles.button}
                        disabled={!props.canRedo}
                        title={props.intl.formatMessage(messages.redo)}
                        onClick={props.onRedo}
                    >
                        <img
                            className={styles.redoIcon}
                            draggable={false}
                            src={redoIcon}
                        />
                    </button>
                </div>
            </div>
            <div className={styles.inputGroup}>
                <IconButton
                    className={styles.toolButton}
                    img={copyIcon}
                    title={props.intl.formatMessage(messages.copy)}
                    onClick={props.onCopy}
                />
                <IconButton
                    className={styles.toolButton}
                    disabled={props.canPaste === false}
                    img={pasteIcon}
                    title={props.intl.formatMessage(messages.paste)}
                    onClick={props.onPaste}
                />
                <IconButton
                    className={classNames(styles.toolButton, styles.flipInRtl)}
                    img={copyToNewIcon}
                    title={props.intl.formatMessage(messages.copyToNew)}
                    onClick={props.onCopyToNew}
                />
            </div>
            <IconButton
                className={styles.toolButton}
                disabled={props.trimStart === null}
                img={deleteIcon}
                title={props.intl.formatMessage(messages.delete)}
                onClick={props.onDelete}
            />
            <div className={styles.spectrumArea}>
                <Spectrum
                    analyser={props.analyser}
                    isPlaying={props.isPlaying}
                />
            </div>
        </div>
        <div className={styles.row}>
            <div
                className={styles.waveformContainer}
                ref={props.setViewportRef}
            >
                <div
                    className={styles.waveformLayer}
                    data-waveform-mode={props.waveform.peaks ? 'peaks' : 'levels'}
                >
                    <Waveform
                        data={props.waveform.data}
                        height={160}
                        peaks={props.waveform.peaks}
                        width={props.waveform.width}
                    />
                </div>
                <AudioSelector
                    playhead={props.playhead}
                    trimEnd={props.trimEnd}
                    trimStart={props.trimStart}
                    viewStart={props.viewStart}
                    zoom={props.zoom}
                    onPlay={props.onPlay}
                    onSetTrim={props.onSetTrim}
                    onStop={props.onStop}
                />
                {props.zoom > 1 ? (
                    <div
                        className={styles.zoomBadge}
                        title="ホイールで拡大 / Shift+ホイールで横スクロール"
                    >
                        {`拡大 ${props.zoom < 10 ? props.zoom.toFixed(1) : Math.round(props.zoom)}×`}
                    </div>
                ) : null}
            </div>
        </div>
        <div className={classNames(styles.row, styles.rowReverse)}>
            <div className={styles.inputGroup}>
                {props.isPlaying ? (
                    <button
                        className={classNames(styles.roundButton, styles.stopButtonn)}
                        title={props.intl.formatMessage(messages.stop)}
                        onClick={props.onStop}
                    >
                        <img
                            draggable={false}
                            src={stopIcon}
                        />
                    </button>
                ) : (
                    <button
                        className={classNames(styles.roundButton, styles.playButton)}
                        title={props.intl.formatMessage(messages.play)}
                        onClick={props.onPlay}
                    >
                        <img
                            draggable={false}
                            src={playIcon}
                        />
                    </button>
                )}
            </div>
            <IconButton
                className={styles.effectButton}
                img={modifyIcon}
                title={<FormattedMessage {...messages.modify} />}
                onClick={props.onModifySound}
            />
            <IconButton
                className={styles.effectButton}
                img={fasterIcon}
                title={<FormattedMessage {...messages.faster} />}
                onClick={props.onFaster}
            />
            <IconButton
                className={styles.effectButton}
                img={slowerIcon}
                title={<FormattedMessage {...messages.slower} />}
                onClick={props.onSlower}
            />
            <IconButton
                disabled={props.tooLoud}
                className={classNames(styles.effectButton, styles.flipInRtl)}
                img={louderIcon}
                title={<FormattedMessage {...messages.louder} />}
                onClick={props.onLouder}
            />
            <IconButton
                className={classNames(styles.effectButton, styles.flipInRtl)}
                img={softerIcon}
                title={<FormattedMessage {...messages.softer} />}
                onClick={props.onSofter}
            />
            <IconButton
                className={classNames(styles.effectButton, styles.flipInRtl)}
                img={muteIcon}
                title={<FormattedMessage {...messages.mute} />}
                onClick={props.onMute}
            />
            <IconButton
                className={styles.effectButton}
                img={fadeInIcon}
                title={<FormattedMessage {...messages.fadeIn} />}
                onClick={props.onFadeIn}
            />
            <IconButton
                className={styles.effectButton}
                img={fadeOutIcon}
                title={<FormattedMessage {...messages.fadeOut} />}
                onClick={props.onFadeOut}
            />
            <IconButton
                className={styles.effectButton}
                img={reverseIcon}
                title={<FormattedMessage {...messages.reverse} />}
                onClick={props.onReverse}
            />
            <IconButton
                className={styles.effectButton}
                img={robotIcon}
                title={<FormattedMessage {...messages.robot} />}
                onClick={props.onRobot}
            />
            <IconButton
                className={styles.effectButton}
                img={echoIcon}
                title={<FormattedMessage {...messages.echo} />}
                onClick={props.onEcho}
            />
            <IconButton
                className={styles.effectButton}
                img={lowpassIcon}
                title={<FormattedMessage {...messages.lowPass} />}
                onClick={props.onLowPass}
            />
            <IconButton
                className={styles.effectButton}
                img={highpassIcon}
                title={<FormattedMessage {...messages.highPass} />}
                onClick={props.onHighPass}
            />
            <IconButton
                className={styles.effectButton}
                img={formatIcon}
                title={<FormattedMessage {...messages.format} />}
                onClick={props.onFormatSound}
            />
        </div>
        <div className={styles.infoRow}>
            <div className={styles.duration}>
                {formatDuration(props.playhead, props.trimStart, props.trimEnd, props.duration)}
            </div>
            <div className={styles.advancedInfo}>
                {`${props.sampleRate}Hz `}
                {`${(props.dataFormat || 'wav').toUpperCase()} `}
                {props.isStereo ? (
                    <FormattedMessage
                        defaultMessage="Stereo"
                        description="Refers to a 'Stereo Sound' (2 channels)"
                        id="tw.stereo"
                    />
                ) : (
                    <FormattedMessage
                        defaultMessage="Mono"
                        description="Refers to a 'Mono Sound' (1 channel)"
                        id="tw.mono"
                    />
                )}
                {` (${formatSoundSize(props.size)})`}
            </div>
        </div>
        {['mp3', 'ogg', 'flac', 'm4a', 'webm'].includes(props.dataFormat) ? (
            <div className={styles.formatAlert}>
                この形式は編集すると WAV に変換されます。
            </div>
        ) : null}
    </div>
);

class SoundEditor extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            modal: null,
            zoom: 1,
            viewStart: 0
        };
        this.waveformCache = null;
        this.viewportElement = null;
        this.setViewportRef = this.setViewportRef.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.openModify = this.openModify.bind(this);
        this.openFormat = this.openFormat.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.applyModify = this.applyModify.bind(this);
        this.applyFormat = this.applyFormat.bind(this);
    }
    componentDidUpdate (prevProps) {
        if (prevProps.docId !== this.props.docId) {
            this.waveformCache = null;
            if (this.state.zoom !== 1 || this.state.viewStart !== 0 || this.state.modal !== null) {
                this.setState({modal: null, zoom: 1, viewStart: 0});
            }
        }
    }
    componentWillUnmount () {
        if (this.viewportElement) {
            this.viewportElement.removeEventListener('wheel', this.handleWheel);
        }
    }
    openModify () {
        this.props.onStop();
        this.setState({modal: 'modify'});
    }
    openFormat () {
        this.props.onStop();
        this.setState({modal: 'format'});
    }
    closeModal () {
        this.setState({modal: null});
    }
    applyModify ({pitch, volume}) {
        this.setState({modal: null});
        this.props.onModify(pitch, volume);
    }
    applyFormat (sampleRate, wholeSound) {
        this.setState({modal: null});
        this.props.onFormat(sampleRate, wholeSound);
    }
    setViewportRef (element) {
        if (this.viewportElement && this.viewportElement !== element) {
            this.viewportElement.removeEventListener('wheel', this.handleWheel);
        }
        this.viewportElement = element;
        if (element) {
            element.addEventListener('wheel', this.handleWheel, {passive: false});
        }
    }
    handleWheel (event) {
        const viewport = this.viewportElement;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        if (rect.width <= 0) return;

        const lineHeight = 16;
        const pageHeight = rect.height || 1;
        const normalize = value => value * (
            event.deltaMode === 1 ? lineHeight : (event.deltaMode === 2 ? pageHeight : 1)
        );
        const deltaX = normalize(event.deltaX);
        const deltaY = normalize(event.deltaY);
        if (!deltaX && !deltaY) return;

        // The waveform owns the wheel while the pointer is over it: never let
        // the page scroll underneath, whether we are zooming or panning.
        event.preventDefault();

        const width = rect.width;
        const horizontal = event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
        const mouseRatio = clamp((event.clientX - rect.left) / width, 0, 1);

        if (horizontal) {
            const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
            // Use the functional form: wheel and trackpad events can arrive
            // faster than React re-renders, and each one must accumulate.
            this.setState(previous => {
                const nextStart = clamp(
                    previous.viewStart + ((delta / width) / previous.zoom),
                    0,
                    1 - (1 / previous.zoom)
                );
                return nextStart === previous.viewStart ? null : {viewStart: nextStart};
            });
            return;
        }

        this.setState(previous => {
            let nextZoom = clamp(
                previous.zoom * Math.exp(-deltaY * WHEEL_ZOOM_SPEED),
                MIN_ZOOM,
                MAX_ZOOM
            );
            if (nextZoom <= MIN_ZOOM * 1.0001) nextZoom = MIN_ZOOM;
            if (nextZoom === previous.zoom) return null;

            // Keep the sound under the pointer fixed while zooming.
            const soundAtPointer = previous.viewStart + (mouseRatio / previous.zoom);
            const nextStart = nextZoom === MIN_ZOOM ? 0 :
                clamp(soundAtPointer - (mouseRatio / nextZoom), 0, 1 - (1 / nextZoom));
            return {
                zoom: nextZoom,
                viewStart: nextStart
            };
        });
    }
    getWaveform () {
        const {channels, chunkLevels} = this.props;
        const {zoom, viewStart} = this.state;
        const cache = this.waveformCache;
        if (cache &&
            cache.channels === channels &&
            cache.chunkLevels === chunkLevels &&
            cache.zoom === zoom &&
            cache.viewStart === viewStart) {
            return cache.waveform;
        }

        const visibleLevels = chunkLevels.length / zoom;
        const usePeaks = channels && channels.length > 0 && zoom > 1 &&
            (zoom >= PEAK_ZOOM || visibleLevels < MIN_RMS_POINTS);

        let waveform;
        if (usePeaks) {
            waveform = {
                width: PEAK_WIDTH,
                peaks: getVisiblePeakData(channels, viewStart, zoom, PEAK_WIDTH)
            };
        } else {
            const count = chunkLevels.length;
            const start = Math.floor(viewStart * count);
            const end = Math.min(count, Math.ceil((viewStart + (1 / zoom)) * count));
            const data = chunkLevels.slice(start, Math.max(start + 2, end));
            if (data.length === 1) data.push(data[0]);
            waveform = {
                width: WAVEFORM_WIDTH,
                data
            };
        }

        this.waveformCache = {
            channels,
            chunkLevels,
            zoom,
            viewStart,
            waveform
        };
        return waveform;
    }
    render () {
        return (
            <React.Fragment>
                <SoundEditorView
                    {...this.props}
                    onFormatSound={this.openFormat}
                    onModifySound={this.openModify}
                    setViewportRef={this.setViewportRef}
                    viewStart={this.state.viewStart}
                    waveform={this.getWaveform()}
                    zoom={this.state.zoom}
                />
                {this.state.modal === 'modify' ? (
                    <ModifyModal
                        channels={this.props.channels}
                        sampleRate={this.props.sampleRate}
                        trimEnd={this.props.trimEnd}
                        trimStart={this.props.trimStart}
                        onApply={this.applyModify}
                        onClose={this.closeModal}
                    />
                ) : null}
                {this.state.modal === 'format' ? (
                    <FormatModal
                        hasSelection={this.props.trimStart !== null}
                        sampleRate={this.props.sampleRate}
                        onApply={this.applyFormat}
                        onClose={this.closeModal}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

SoundEditor.propTypes = {
    analyser: PropTypes.object,
    canPaste: PropTypes.bool.isRequired,
    channels: PropTypes.arrayOf(PropTypes.instanceOf(Float32Array)).isRequired,
    canRedo: PropTypes.bool.isRequired,
    canUndo: PropTypes.bool.isRequired,
    chunkLevels: PropTypes.arrayOf(PropTypes.number).isRequired,
    dataFormat: PropTypes.string,
    docId: PropTypes.string.isRequired,
    duration: PropTypes.number.isRequired,
    intl: PropTypes.object,
    isPlaying: PropTypes.bool.isRequired,
    isStereo: PropTypes.bool.isRequired,
    name: PropTypes.string.isRequired,
    onChangeName: PropTypes.func.isRequired,
    onContainerClick: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired,
    onCopyToNew: PropTypes.func,
    onDelete: PropTypes.func,
    onEcho: PropTypes.func.isRequired,
    onFadeIn: PropTypes.func.isRequired,
    onFormat: PropTypes.func.isRequired,
    onHighPass: PropTypes.func.isRequired,
    onLowPass: PropTypes.func.isRequired,
    onModify: PropTypes.func.isRequired,
    onFadeOut: PropTypes.func.isRequired,
    onFaster: PropTypes.func.isRequired,
    onLouder: PropTypes.func.isRequired,
    onMute: PropTypes.func.isRequired,
    onPaste: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onReverse: PropTypes.func.isRequired,
    onRobot: PropTypes.func.isRequired,
    onSetTrim: PropTypes.func,
    onSlower: PropTypes.func.isRequired,
    onSofter: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    playhead: PropTypes.number,
    setRef: PropTypes.func,
    sampleRate: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
    tooLoud: PropTypes.bool.isRequired,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
};

export default injectIntl(SoundEditor);
