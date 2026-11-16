import React, {useCallback, useEffect, useRef, useState} from 'react';

import AppMenu, {AppMenuDivider, AppMenuItem} from './components/AppMenu.jsx';
import {FolderIcon, PlusIcon, SaveIcon, SoundIcon} from './components/Icons.jsx';
import SoundEditor from './containers/sound-editor.jsx';
import {decodeAudioFile, encodeWav, getWavByteLength, makeSilentSound} from './lib/audio-file.js';
import {downloadBlob, sanitizeFilename} from './lib/download.js';

const ACCEPTED_FILE_TYPES = 'audio/*,.wav,.mp3,.ogg,.oga,.m4a,.aac,.flac,.webm';

const getBaseName = filename => (filename || '').replace(/\.[^.]+$/, '') || 'sound';

const getDataFormat = file => {
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (extension === 'oga') return 'ogg';
    if (['wav', 'mp3', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(extension)) {
        return extension;
    }
    const mimeSubtype = file.type && file.type.split('/')[1];
    return mimeSubtype ? mimeSubtype.split(';')[0] : 'wav';
};

const createInitialDoc = () => {
    const sound = makeSilentSound();
    return {
        docId: 'sound-1',
        name: 'sound1',
        dataFormat: 'wav',
        size: getWavByteLength(sound.channels),
        ...sound
    };
};

const App = () => {
    const [docs, setDocs] = useState(() => [createInitialDoc()]);
    const [currentDocId, setCurrentDocId] = useState('sound-1');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef(null);
    const docCounterRef = useRef(1);
    const dragDepthRef = useRef(0);

    const doc = docs.find(candidate => candidate.docId === currentDocId) || docs[0];

    useEffect(() => {
        if (!error) return undefined;
        const timer = window.setTimeout(() => setError(null), 6000);
        return () => window.clearTimeout(timer);
    }, [error]);

    const nextDocId = useCallback(() => {
        docCounterRef.current += 1;
        return `sound-${docCounterRef.current}`;
    }, []);

    const openFile = useCallback(async file => {
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
            const {channels, sampleRate} = await decodeAudioFile(file);
            const newDoc = {
                docId: nextDocId(),
                name: getBaseName(file.name),
                dataFormat: getDataFormat(file),
                channels,
                sampleRate,
                size: file.size
            };
            setDocs(current => [...current, newDoc]);
            setCurrentDocId(newDoc.docId);
        } catch (decodeError) {
            setError('音声ファイルを読み込めませんでした。対応形式（WAV / MP3 / OGG / M4A など）か確認してください。');
        } finally {
            setBusy(false);
        }
    }, [nextDocId]);

    const handleOpenClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(event => {
        const file = event.target.files && event.target.files[0];
        openFile(file);
        event.target.value = '';
    }, [openFile]);

    const handleNew = useCallback(() => {
        setError(null);
        const sound = makeSilentSound();
        const newDoc = {
            docId: nextDocId(),
            name: `sound${docCounterRef.current}`,
            dataFormat: 'wav',
            size: getWavByteLength(sound.channels),
            ...sound
        };
        setDocs(current => [...current, newDoc]);
        setCurrentDocId(newDoc.docId);
    }, [nextDocId]);

    const handleSave = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const blob = await encodeWav(doc);
            downloadBlob(blob, `${sanitizeFilename(doc.name)}.wav`);
        } catch (encodeError) {
            setError('WAVファイルを書き出せませんでした。');
        } finally {
            setBusy(false);
        }
    }, [doc]);

    const handleDragEnter = useCallback(event => {
        event.preventDefault();
        dragDepthRef.current += 1;
        if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')) {
            setDragActive(true);
        }
    }, []);

    const handleDragOver = useCallback(event => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDragLeave = useCallback(event => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragActive(false);
    }, []);

    const handleDrop = useCallback(event => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragActive(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) openFile(file);
    }, [openFile]);

    const handleChannelsChange = useCallback((channels, sampleRate) => {
        setDocs(current => current.map(candidate => (
            candidate.docId === currentDocId ? {
                ...candidate,
                channels,
                sampleRate,
                dataFormat: 'wav',
                size: getWavByteLength(channels)
            } : candidate
        )));
    }, [currentDocId]);

    const handleChangeName = useCallback(name => {
        setDocs(current => current.map(candidate => (
            candidate.docId === currentDocId ? {...candidate, name} : candidate
        )));
    }, [currentDocId]);

    const handleDeleteSound = useCallback(() => {
        if (docs.length <= 1) return;
        const index = docs.findIndex(candidate => candidate.docId === currentDocId);
        const remaining = docs.filter(candidate => candidate.docId !== currentDocId);
        setDocs(remaining);
        setCurrentDocId(remaining[Math.max(0, index - 1)].docId);
    }, [currentDocId, docs]);

    const handleCopyToNew = useCallback((channels, sampleRate) => {
        const usedNames = new Set(docs.map(candidate => candidate.name));
        let name = `${doc.name} copy`;
        let suffix = 2;
        while (usedNames.has(name)) {
            name = `${doc.name} copy ${suffix}`;
            suffix += 1;
        }
        const newDoc = {
            docId: nextDocId(),
            name,
            dataFormat: 'wav',
            channels,
            sampleRate,
            size: getWavByteLength(channels)
        };
        setDocs(current => [...current, newDoc]);
        setCurrentDocId(newDoc.docId);
    }, [doc.name, docs, nextDocId]);

    return (
        <div
            className={`app${dragActive ? ' is-dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <header className="appbar">
                <div className="brand">
                    <span className="brand-mark"><SoundIcon size={23}/></span>
                    <span className="brand-text">
                        <span className="brand-name">Sound Studio</span>
                        <span className="brand-tagline">Scratch-style sound editor</span>
                    </span>
                </div>

                <div className="appbar-actions">
                    {docs.length > 1 ? (
                        <label className="sound-picker">
                            <span className="sound-picker-label">サウンド</span>
                            <select
                                aria-label="サウンド"
                                value={doc.docId}
                                onChange={event => setCurrentDocId(event.target.value)}
                            >
                                {docs.map(candidate => (
                                    <option
                                        key={candidate.docId}
                                        value={candidate.docId}
                                    >
                                        {candidate.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    <AppMenu icon={FolderIcon} label="ファイル">
                        <AppMenuItem icon={PlusIcon} onClick={handleNew}>無音サウンドを追加</AppMenuItem>
                        <AppMenuItem
                            destructive
                            disabled={docs.length <= 1}
                            onClick={handleDeleteSound}
                        >
                            現在のサウンドを削除
                        </AppMenuItem>
                        <AppMenuDivider/>
                        <AppMenuItem
                            disabled={busy}
                            icon={FolderIcon}
                            onClick={handleOpenClick}
                        >
                            音声ファイルを開く…
                        </AppMenuItem>
                    </AppMenu>
                    <button
                        className="button button-primary"
                        disabled={busy}
                        onClick={handleSave}
                        title="WAV として書き出す"
                        type="button"
                    >
                        <SaveIcon size={17}/>
                        <span className="action-label">WAVで保存</span>
                    </button>
                </div>
            </header>

            <main className="editor-shell" aria-busy={busy}>
                <section className="editor-card">
                    <div className="sound-editor-host">
                        <SoundEditor
                            channels={doc.channels}
                            dataFormat={doc.dataFormat}
                            docId={doc.docId}
                            name={doc.name}
                            sampleRate={doc.sampleRate}
                            size={doc.size}
                            onChannelsChange={handleChannelsChange}
                            onChangeName={handleChangeName}
                            onCopyToNew={handleCopyToNew}
                            onError={setError}
                        />
                    </div>
                </section>
            </main>

            {dragActive ? (
                <div className="drop-overlay">
                    <div className="drop-message">ドロップして音声ファイルを開く</div>
                </div>
            ) : null}

            {error ? (
                <div className="toast" role="alert">
                    <span>{error}</span>
                    <button
                        aria-label="閉じる"
                        className="toast-close"
                        onClick={() => setError(null)}
                        type="button"
                    >
                        ×
                    </button>
                </div>
            ) : null}

            <input
                accept={ACCEPTED_FILE_TYPES}
                hidden
                onChange={handleFileInputChange}
                ref={fileInputRef}
                type="file"
            />
        </div>
    );
};

export default App;
