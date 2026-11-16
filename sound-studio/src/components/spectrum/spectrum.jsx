import PropTypes from 'prop-types';
import React from 'react';

import styles from './spectrum.css';

const BAR_COUNT = 28;

/**
 * A tiny live frequency spectrum for the sound currently being played.
 * The analyser is supplied by the sound editor container and sits between the
 * player and the speakers, so this only reads data and never changes the sound.
 */
const Spectrum = props => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !props.analyser) return undefined;

        const context = canvas.getContext('2d');
        const width = Math.max(1, Math.round(canvas.clientWidth));
        const height = Math.max(1, Math.round(canvas.clientHeight));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);

        // A faint baseline and caption keep the empty frame looking intentional
        // when the sound is stopped. They are redrawn each frame because the
        // canvas is cleared before the bars.
        const drawChrome = () => {
            context.fillStyle = 'rgba(133, 92, 214, 0.16)';
            context.fillRect(0, height - 1, width, 1);
            context.fillStyle = 'rgba(94, 85, 74, 0.42)';
            context.font = '8px -apple-system, "Hiragino Kaku Gothic ProN", sans-serif';
            context.fillText('スペクトラム', 7, 11);
        };
        drawChrome();

        if (!props.isPlaying) return undefined;

        const analyser = props.analyser;
        const bins = new Uint8Array(analyser.frequencyBinCount);
        const gap = 2;
        const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);
        const gradient = context.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'hsla(300, 53%, 60%, 0.95)');
        gradient.addColorStop(1, 'hsla(260, 60%, 60%, 0.95)');
        let frame = null;

        const draw = () => {
            analyser.getByteFrequencyData(bins);
            context.clearRect(0, 0, width, height);
            drawChrome();
            context.fillStyle = gradient;

            for (let bar = 0; bar < BAR_COUNT; bar++) {
                // Spread the bars logarithmically so low frequencies do not all
                // end up in the first couple of columns.
                const start = Math.floor(Math.pow(bins.length, bar / BAR_COUNT)) - 1;
                const end = Math.floor(Math.pow(bins.length, (bar + 1) / BAR_COUNT));
                let value = 0;
                for (let i = Math.max(0, start); i < Math.min(bins.length, Math.max(start + 1, end)); i++) {
                    if (bins[i] > value) value = bins[i];
                }
                const barHeight = Math.max(1, (value / 255) * (height - 2));
                const x = bar * (barWidth + gap);
                context.fillRect(x, height - barHeight, barWidth, barHeight);
            }
            frame = window.requestAnimationFrame(draw);
        };

        draw();
        return () => {
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, [props.analyser, props.isPlaying]);

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
            />
        </div>
    );
};

Spectrum.propTypes = {
    analyser: PropTypes.object,
    isPlaying: PropTypes.bool.isRequired
};

export default Spectrum;
