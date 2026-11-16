import PropTypes from 'prop-types';
import React from 'react';

import SharedAudioContext from '../../lib/audio/shared-audio-context.js';
import styles from './sound-modal.css';

/**
 * PenguinMod's Modify Sound menu: pitch and volume for the current selection
 * (or the whole sound), with a live preview.
 */
const ModifyModal = props => {
    const [pitch, setPitch] = React.useState(0);
    const [volume, setVolume] = React.useState(1);
    const [playing, setPlaying] = React.useState(false);
    const sourceRef = React.useRef(null);
    const gainRef = React.useRef(null);

    const sampleCount = props.channels[0] ? props.channels[0].length : 0;
    const startSample = Math.floor((props.trimStart === null ? 0 : props.trimStart) * sampleCount);
    const endSample = Math.ceil((props.trimEnd === null ? 1 : props.trimEnd) * sampleCount);
    const selectedLength = Math.max(0, endSample - startSample);
    const duration = selectedLength / props.sampleRate;

    const previewBuffer = React.useMemo(() => {
        const context = new SharedAudioContext();
        const buffer = context.createBuffer(
            props.channels.length,
            Math.max(1, selectedLength),
            props.sampleRate
        );
        for (let channel = 0; channel < props.channels.length; channel++) {
            buffer.getChannelData(channel).set(
                props.channels[channel].subarray(startSample, startSample + selectedLength)
            );
        }
        return buffer;
    }, [props.channels, props.sampleRate, startSample, selectedLength]);

    const stopPreview = React.useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            try {
                sourceRef.current.stop();
            } catch (error) {
                // Already stopped.
            }
            sourceRef.current = null;
        }
        gainRef.current = null;
        setPlaying(false);
    }, []);

    React.useEffect(() => () => {
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            try {
                sourceRef.current.stop();
            } catch (error) {
                // Already stopped.
            }
        }
    }, []);

    React.useEffect(() => {
        if (sourceRef.current) {
            sourceRef.current.playbackRate.value = Math.pow(2, pitch / 12);
        }
        if (gainRef.current) {
            gainRef.current.gain.value = volume;
        }
    }, [pitch, volume]);

    React.useEffect(() => {
        const handleKeyDown = event => {
            if (event.key === 'Escape') props.onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [props.onClose]);

    const togglePreview = () => {
        if (playing) {
            stopPreview();
            return;
        }
        const context = new SharedAudioContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = previewBuffer;
        source.playbackRate.value = Math.pow(2, pitch / 12);
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
            sourceRef.current = null;
            gainRef.current = null;
            setPlaying(false);
        };
        source.start();
        sourceRef.current = source;
        gainRef.current = gain;
        setPlaying(true);
    };

    const apply = () => {
        stopPreview();
        props.onApply({
            pitch: pitch * 100,
            volume
        });
    };

    const unchanged = pitch === 0 && volume === 1;

    return (
        <div
            className={styles.backdrop}
            role="presentation"
            onMouseDown={event => {
                if (event.target === event.currentTarget) props.onClose();
            }}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="音を調整"
            >
                <h2 className={styles.title}>音を調整</h2>
                <p className={styles.description}>
                    {`${props.trimStart === null ? '音声全体' : '選択範囲'} (${duration.toFixed(2)}秒) に適用します。`}
                </p>

                <div className={styles.field}>
                    <div className={styles.fieldHeader}>
                        <span>ピッチ</span>
                        <span className={styles.value}>
                            {`${pitch > 0 ? '+' : ''}${pitch} 半音`}
                        </span>
                    </div>
                    <input
                        className={styles.range}
                        type="range"
                        min="-36"
                        max="36"
                        step="1"
                        value={pitch}
                        onChange={event => setPitch(Number(event.target.value))}
                    />
                    <div className={styles.hint}>
                        1オクターブ = 12半音。上げると短く、下げると長くなります。
                    </div>
                </div>

                <div className={styles.field}>
                    <div className={styles.fieldHeader}>
                        <span>音量</span>
                        <span className={styles.value}>{`${Math.round(volume * 100)}%`}</span>
                    </div>
                    <input
                        className={styles.range}
                        type="range"
                        min="0"
                        max="200"
                        step="1"
                        value={Math.round(volume * 100)}
                        onChange={event => setVolume(Number(event.target.value) / 100)}
                    />
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.preview}`}
                        onClick={togglePreview}
                    >
                        {playing ? '停止' : 'プレビュー'}
                    </button>
                    <button
                        type="button"
                        className={styles.button}
                        onClick={props.onClose}
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.primary}`}
                        disabled={unchanged}
                        onClick={apply}
                    >
                        適用
                    </button>
                </div>
            </div>
        </div>
    );
};

ModifyModal.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.instanceOf(Float32Array)).isRequired,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    sampleRate: PropTypes.number.isRequired,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number
};

export default ModifyModal;
