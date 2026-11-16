const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give the browser a moment to start the download before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const sanitizeFilename = (name, fallback = 'sound') => {
    const trimmed = (name || '').trim().replace(/[\\/:*?"<>|]+/g, '-');
    return trimmed || fallback;
};

export {
    downloadBlob,
    sanitizeFilename
};
