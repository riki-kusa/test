let AUDIO_CONTEXT;

/**
 * Wrap the browser AudioContext because we shouldn't create more than one.
 * The context may start out suspended until the first user gesture; calling
 * resume() here lets playback recover as soon as the browser allows it.
 * @returns {AudioContext} The singleton AudioContext
 */
export default function () {
    if (!AUDIO_CONTEXT) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        AUDIO_CONTEXT = new AudioContext();
    }
    if (AUDIO_CONTEXT.state === 'suspended') {
        AUDIO_CONTEXT.resume();
    }
    return AUDIO_CONTEXT;
}
