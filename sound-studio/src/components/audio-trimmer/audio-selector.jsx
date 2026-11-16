import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import Box from '../box/box.jsx';
import styles from './audio-trimmer.css';
import SelectionHandle from './selection-handle.jsx';
import Playhead from './playhead.jsx';

const AudioSelector = props => {
    const viewStart = props.viewStart === undefined ? 0 : props.viewStart;
    const zoom = props.zoom === undefined ? 1 : props.zoom;
    const viewEnd = viewStart + (1 / zoom);
    const viewPosition = value => (value - viewStart) * zoom;

    const hasSelection = props.trimStart !== null && props.trimStart !== undefined &&
        props.trimEnd !== null && props.trimEnd !== undefined;
    // Clip the translucent fill to what is on screen, while the handles stay
    // at their true positions (and are skipped when scrolled out of view).
    const visibleStart = hasSelection ? Math.max(props.trimStart, viewStart) : 0;
    const visibleEnd = hasSelection ? Math.min(props.trimEnd, viewEnd) : 0;
    const hasVisibleSelection = hasSelection && visibleEnd > visibleStart;
    const showStartHandle = hasSelection &&
        props.trimStart >= viewStart && props.trimStart <= viewEnd;
    const showEndHandle = hasSelection &&
        props.trimEnd >= viewStart && props.trimEnd <= viewEnd;
    const showPlayhead = props.playhead !== null && props.playhead !== undefined &&
        props.playhead >= viewStart && props.playhead <= viewEnd;

    return (
        <div
            className={classNames(styles.absolute, styles.selector)}
            ref={props.containerRef}
            onMouseDown={props.onNewSelectionMouseDown}
            onTouchStart={props.onNewSelectionMouseDown}
        >
            {hasVisibleSelection ? (
                <Box
                    className={classNames(styles.absolute)}
                    style={{
                        left: `${100 * viewPosition(visibleStart)}%`,
                        width: `${100 * (visibleEnd - visibleStart) * zoom}%`
                    }}
                >
                    <Box className={classNames(styles.absolute, styles.selectionBackground)} />
                </Box>
            ) : null}
            {showStartHandle ? (
                <Box
                    className={styles.handleAnchor}
                    style={{left: `${100 * viewPosition(props.trimStart)}%`}}
                >
                    <SelectionHandle
                        handleStyle={styles.leftHandle}
                        onMouseDown={props.onTrimStartMouseDown}
                    />
                </Box>
            ) : null}
            {showEndHandle ? (
                <Box
                    className={styles.handleAnchor}
                    style={{left: `${100 * viewPosition(props.trimEnd)}%`}}
                >
                    <SelectionHandle
                        handleStyle={styles.rightHandle}
                        onMouseDown={props.onTrimEndMouseDown}
                    />
                </Box>
            ) : null}
            {showPlayhead ? (
                <Playhead
                    playbackPosition={viewPosition(props.playhead)}
                />
            ) : null}
        </div>
    );
};

AudioSelector.propTypes = {
    containerRef: PropTypes.func,
    onNewSelectionMouseDown: PropTypes.func.isRequired,
    onTrimEndMouseDown: PropTypes.func.isRequired,
    onTrimStartMouseDown: PropTypes.func.isRequired,
    playhead: PropTypes.number,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
    viewStart: PropTypes.number,
    zoom: PropTypes.number
};

export default AudioSelector;
