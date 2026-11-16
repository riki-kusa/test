import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import AudioSelectorComponent from '../components/audio-trimmer/audio-selector.jsx';
import {getEventXY} from '../lib/touch-utils';
import DragRecognizer from '../lib/drag-recognizer';

const MIN_LENGTH = 0.01;
const MIN_DURATION = 500;

class AudioSelector extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleNewSelectionMouseDown',
            'handleTrimStartMouseDown',
            'handleTrimEndMouseDown',
            'handleTrimStartMouseMove',
            'handleTrimEndMouseMove',
            'handleTrimStartMouseUp',
            'handleTrimEndMouseUp',
            'storeRef'
        ]);

        this.state = {
            trimStart: props.trimStart,
            trimEnd: props.trimEnd
        };

        this.clickStartTime = 0;

        this.trimStartDragRecognizer = new DragRecognizer({
            onDrag: this.handleTrimStartMouseMove,
            onDragEnd: this.handleTrimStartMouseUp,
            touchDragAngle: 90,
            distanceThreshold: 0
        });
        this.trimEndDragRecognizer = new DragRecognizer({
            onDrag: this.handleTrimEndMouseMove,
            onDragEnd: this.handleTrimEndMouseUp,
            touchDragAngle: 90,
            distanceThreshold: 0
        });
    }
    componentDidUpdate (prevProps) {
        const {trimStart, trimEnd} = this.props;
        if (prevProps.trimStart === trimStart && prevProps.trimEnd === trimEnd) return;
        this.setState({
            trimStart: trimStart,
            trimEnd: trimEnd
        });
    }
    clearSelection () {
        this.props.onSetTrim(null, null);
    }
    handleNewSelectionMouseDown (e) {
        const {width, left} = this.containerElement.getBoundingClientRect();
        const visiblePosition = (getEventXY(e).x - left) / width;
        // Map the click from the visible window back to the whole sound.
        this.initialTrimEnd = Math.max(0, Math.min(1,
            this.props.viewStart + (visiblePosition / this.props.zoom)));
        this.initialTrimStart = this.initialTrimEnd;
        this.props.onSetTrim(this.initialTrimStart, this.initialTrimEnd);

        this.clickStartTime = Date.now();

        this.containerSize = width;
        this.trimEndDragRecognizer.start(e);

        e.preventDefault();
    }
    handleTrimStartMouseMove (currentOffset, initialOffset) {
        const dx = ((currentOffset.x - initialOffset.x) / this.containerSize) / this.props.zoom;
        const newTrim = Math.max(0, Math.min(1, this.initialTrimStart + dx));
        if (newTrim > this.initialTrimEnd) {
            this.setState({
                trimStart: this.initialTrimEnd,
                trimEnd: newTrim
            });
        } else {
            this.setState({
                trimStart: newTrim,
                trimEnd: this.initialTrimEnd
            });
        }
    }
    handleTrimEndMouseMove (currentOffset, initialOffset) {
        const dx = ((currentOffset.x - initialOffset.x) / this.containerSize) / this.props.zoom;
        const newTrim = Math.min(1, Math.max(0, this.initialTrimEnd + dx));
        if (newTrim < this.initialTrimStart) {
            this.setState({
                trimStart: newTrim,
                trimEnd: this.initialTrimStart
            });
        } else {
            this.setState({
                trimStart: this.initialTrimStart,
                trimEnd: newTrim
            });
        }
    }
    handleTrimStartMouseUp () {
        this.props.onSetTrim(this.state.trimStart, this.state.trimEnd);
    }
    handleTrimEndMouseUp () {
        // If the selection was made quickly (tooFast) and is small (tooShort),
        // deselect instead. This allows click-to-deselect even if you drag
        // a little bit by accident. It also allows very quickly making a
        // selection, as long as it is above a minimum length.
        const tooFast = (Date.now() - this.clickStartTime) < MIN_DURATION;
        // Measure the minimum in visible units so a small drag can still make
        // a selection when the waveform is zoomed in.
        const tooShort = ((this.state.trimEnd - this.state.trimStart) * this.props.zoom) < MIN_LENGTH;
        if (tooFast && tooShort) {
            this.clearSelection();
        } else {
            this.props.onSetTrim(this.state.trimStart, this.state.trimEnd);
        }
    }
    handleTrimStartMouseDown (e) {
        this.containerSize = this.containerElement.getBoundingClientRect().width;
        this.trimStartDragRecognizer.start(e);
        this.initialTrimStart = this.props.trimStart;
        this.initialTrimEnd = this.props.trimEnd;
        e.stopPropagation();
        e.preventDefault();
    }
    handleTrimEndMouseDown (e) {
        this.containerSize = this.containerElement.getBoundingClientRect().width;
        this.trimEndDragRecognizer.start(e);
        this.initialTrimEnd = this.props.trimEnd;
        this.initialTrimStart = this.props.trimStart;
        e.stopPropagation();
        e.preventDefault();
    }
    storeRef (el) {
        this.containerElement = el;
    }
    render () {
        return (
            <AudioSelectorComponent
                containerRef={this.storeRef}
                playhead={this.props.playhead}
                trimEnd={this.state.trimEnd}
                trimStart={this.state.trimStart}
                viewStart={this.props.viewStart}
                zoom={this.props.zoom}
                onNewSelectionMouseDown={this.handleNewSelectionMouseDown}
                onTrimEndMouseDown={this.handleTrimEndMouseDown}
                onTrimStartMouseDown={this.handleTrimStartMouseDown}
            />
        );
    }
}

AudioSelector.defaultProps = {
    viewStart: 0,
    zoom: 1
};

AudioSelector.propTypes = {
    onSetTrim: PropTypes.func,
    playhead: PropTypes.number,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
    viewStart: PropTypes.number,
    zoom: PropTypes.number
};

export default AudioSelector;
