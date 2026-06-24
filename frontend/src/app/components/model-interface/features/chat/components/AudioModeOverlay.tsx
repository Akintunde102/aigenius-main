import React from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { AudioStatus, getAudioStatusCopy } from '../hooks/audioMode.utils';
import { LiveWaveform } from './LiveWaveform';
import styles from './AudioModeOverlay.module.scss';

interface AudioModeOverlayProps {
    onExit: () => void;
    status: AudioStatus;
    transcription?: string;
    notice?: string;
    volume?: number;
    analyzer?: AnalyserNode | null;
    isMini?: boolean;
    onToggleMini?: () => void;
}

export const AudioModeOverlay: React.FC<AudioModeOverlayProps> = ({
    onExit,
    status,
    transcription = "",
    notice = "",
    volume = 0,
    analyzer = null,
    isMini = false,
    onToggleMini,
}) => {
    // Reactive scale based on volume (0-255 range from AnalyserNode)
    const volumeScale = 1 + (volume / 255) * 0.5;
    const copy = getAudioStatusCopy(status, true);

    return (
        <div className={`${styles.audioOverlay} ${isMini ? styles.mini : ''}`}>
            <div className={styles.backgroundBlur} />
            
            <div className={styles.topActions}>
                {onToggleMini && (
                    <button className={styles.iconButton} onClick={onToggleMini} title={isMini ? "Full Screen" : "Minimize"}>
                        {isMini ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                )}
                <button className={styles.iconButton} onClick={onExit} title="Exit Mode">
                    <X size={16} />
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.orbContainer}>
                    <div 
                        className={`${styles.orb} ${styles[status]}`} 
                        style={{ transform: `scale(${volumeScale})` }}
                    />
                    <div className={styles.volumeWave} style={{ transform: `scale(${volumeScale * 1.2})` }} />
                    <div className={styles.volumeWave} style={{ transform: `scale(${volumeScale * 1.4})`, opacity: 0.1 }} />
                </div>

                {!isMini && (
                    <div className={styles.waveformContainer}>
                        <LiveWaveform analyzer={analyzer} isActive={status === 'listening'} />
                    </div>
                )}

                <div className={styles.statusText}>
                    <h2>{isMini ? (status === 'listening' ? 'Listening' : copy.title) : copy.title}</h2>
                    {!isMini && <p>{notice || copy.description}</p>}
                </div>

                <div className={styles.transcriptionPreview}>
                    {transcription || (status === 'listening' ? "Say something..." : copy.description)}
                </div>

                {!isMini && (
                    <div className={styles.controls}>
                        <button className={styles.exit} onClick={onExit}>
                            <X size={18} />
                            Exit Mode
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
