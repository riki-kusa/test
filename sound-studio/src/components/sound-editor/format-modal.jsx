import PropTypes from 'prop-types';
import React from 'react';

import {isSampleRateSupported} from '../../lib/audio/resample.js';
import styles from './sound-modal.css';

const SAMPLE_RATES = [
    3000, 4000, 8000, 11025, 16000, 22050, 32000, 44100,
    48000, 88200, 96000, 176400, 192000, 352800, 384000
];

/**
 * PenguinMod's Format Sound menu: change the sample rate of the whole sound,
 * or apply a sample rate's bandwidth to just the current selection.
 */
const FormatModal = props => {
    const rates = React.useMemo(() => {
        const supported = SAMPLE_RATES.filter(isSampleRateSupported);
        if (!supported.includes(props.sampleRate)) supported.push(props.sampleRate);
        return supported.sort((a, b) => a - b);
    }, [props.sampleRate]);
    const [rate, setRate] = React.useState(props.sampleRate);
    const [wholeSound, setWholeSound] = React.useState(!props.hasSelection);

    React.useEffect(() => {
        const handleKeyDown = event => {
            if (event.key === 'Escape') props.onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [props.onClose]);

    const apply = () => {
        props.onApply(Number(rate), wholeSound);
    };

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
                aria-label="フォーマット"
            >
                <h2 className={styles.title}>フォーマット</h2>
                <p className={styles.description}>
                    音声のサンプルレートを変更します。現在は {props.sampleRate}Hz です。
                </p>

                <div className={styles.field}>
                    <div className={styles.fieldHeader}>
                        <span>新しいサンプルレート</span>
                        <span className={styles.value}>{`${Number(rate)}Hz`}</span>
                    </div>
                    <select
                        className={styles.select}
                        value={rate}
                        onChange={event => setRate(Number(event.target.value))}
                    >
                        {rates.map(value => (
                            <option
                                key={value}
                                value={value}
                            >
                                {`${value}Hz`}
                            </option>
                        ))}
                    </select>
                    <div className={styles.hint}>
                        元のレートより高いレートにしても、音質は上がりません。
                    </div>
                </div>

                <div className={styles.field}>
                    <div className={styles.fieldHeader}>適用範囲</div>
                    <div className={styles.choiceRow}>
                        <label className={styles.choice}>
                            <input
                                type="radio"
                                name="format-scope"
                                checked={!wholeSound}
                                disabled={!props.hasSelection}
                                onChange={() => setWholeSound(false)}
                            />
                            選択範囲
                        </label>
                        <label className={styles.choice}>
                            <input
                                type="radio"
                                name="format-scope"
                                checked={wholeSound}
                                onChange={() => setWholeSound(true)}
                            />
                            音声全体
                        </label>
                    </div>
                    <div className={styles.hint}>
                        {wholeSound
                            ? '音声全体のサンプルレートを変更します。'
                            : '選択範囲だけを指定レート相当に変換します（長さと全体のサンプルレートは変わりません）。'}
                    </div>
                </div>

                <div className={styles.actions}>
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
                        disabled={Number(rate) === props.sampleRate}
                        onClick={apply}
                    >
                        適用
                    </button>
                </div>
            </div>
        </div>
    );
};

FormatModal.propTypes = {
    hasSelection: PropTypes.bool.isRequired,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    sampleRate: PropTypes.number.isRequired
};

export default FormatModal;
