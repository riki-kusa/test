import PropTypes from 'prop-types';
import React from 'react';
import styles from './audio-trimmer.css';

const Playhead = props => {
    // Keep the whole 1px line inside the waveform, including at 100%, so it
    // cannot extend the scrollable area of the page while playing. A transform
    // (rather than `left`) keeps movement on the compositor and avoids layout
    // work on every animation frame.
    const position = Math.max(0, Math.min(1, props.playbackPosition || 0));
    return (
        <div className={styles.playheadContainer}>
            <div
                className={styles.playhead}
                style={{
                    transform: `translate3d(calc(${100 * position}% - ${position}px), 0, 0)`
                }}
            />
        </div>
    );
};

Playhead.propTypes = {
    playbackPosition: PropTypes.number
};

export default Playhead;
