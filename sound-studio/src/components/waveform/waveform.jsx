import React from 'react';
import PropTypes from 'prop-types';
import styles from './waveform.css';

// Waveform is expensive to compute, make sure it only updates when data does
// by using PureComponent. In future can be changed back to function with React.memo
// eslint-disable-next-line react/prefer-stateless-function
class Waveform extends React.PureComponent {
    render () {
        const {
            width,
            height,
            data,
            peaks
        } = this.props;

        if (peaks) {
            // Min/max envelope from the real samples, used when zoomed in.
            // Unlike the smoothed RMS path this keeps the fine peaks visible.
            const maxY = height / 2;
            const pointCount = peaks.maxs.length;
            const lastIndex = Math.max(1, pointCount - 1);
            const top = peaks.maxs.map((value, i) =>
                `${(width * i) / lastIndex} ${maxY - (Math.max(-1.2, Math.min(1.2, value)) * maxY)}`);
            const bottom = peaks.mins.map((value, i) =>
                `${(width * i) / lastIndex} ${maxY - (Math.max(-1.2, Math.min(1.2, value)) * maxY)}`).reverse();
            const path = `M${top.join(' L')} L${bottom.join(' L')} Z`;

            return (
                <svg
                    className={styles.container}
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <path
                        className={styles.waveformPath}
                        d={path}
                        strokeLinejoin={'round'}
                        strokeWidth={1}
                    />
                </svg>
            );
        }

        // Never want a density of points higher than the number of pixels
        // This is very conservative, could be far fewer points because of curve smoothing.
        // Drawing too many points seems to cause an explosion in browser
        // composite time when animating the playhead
        const takeEveryN = Math.ceil(data.length / width);

        const filteredData = takeEveryN === 1 ? data.slice(0) :
            data.filter((_, i) => i % takeEveryN === 0);

        // Need at least two points to render waveform.
        if (filteredData.length === 1) {
            filteredData.push(filteredData[0]);
        }

        const maxIndex = filteredData.length - 1;
        const points = [
            ...filteredData.map((v, i) =>
                [width * (i / maxIndex), height * v / 2]
            ),
            ...filteredData.reverse().map((v, i) =>
                [width * (1 - (i / maxIndex)), -height * v / 2]
            )
        ];
        const pathComponents = points.map(([x, y], i) => {
            const [nx, ny] = points[i < points.length - 1 ? i + 1 : 0];
            return `Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
        });

        return (
            <svg
                className={styles.container}
                preserveAspectRatio="none"
                viewBox={`0 0 ${width} ${height}`}
            >
                <g transform={`scale(1, -1) translate(0, -${height / 2})`}>
                    <path
                        className={styles.waveformPath}
                        d={`M0 0${pathComponents.join(' ')}Z`}
                        strokeLinejoin={'round'}
                        strokeWidth={1}
                    />
                </g>
            </svg>
        );
    }
}

Waveform.propTypes = {
    data: PropTypes.arrayOf(PropTypes.number),
    height: PropTypes.number,
    peaks: PropTypes.shape({
        mins: PropTypes.arrayOf(PropTypes.number),
        maxs: PropTypes.arrayOf(PropTypes.number)
    }),
    width: PropTypes.number
};

export default Waveform;
