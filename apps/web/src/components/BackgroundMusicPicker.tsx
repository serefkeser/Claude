import React, { useEffect, useRef, useState } from 'react';
import type { MediaFile } from '@otonom/shared-types';
import { ChevronDown, FolderOpen, Music, Pause, Play, Volume2 } from './icons';
import {
  loadAutomaticDriveMusic,
  loadDriveMusicCatalog,
  loadDriveMusicTrack,
  type DriveMusicTrack,
} from '../lib/driveMusic';

interface BackgroundMusicPickerProps {
  value: MediaFile | null;
  volume: number;
  onChange: (track: MediaFile | null) => void;
  onVolumeChange: (volume: number) => void;
}

interface LocalMusicTrack {
  id: string;
  label: string;
  file: File;
}

const AUDIO_EXTENSIONS = /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|wma)$/i;

function isAudioFile(file: File) {
  return file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name);
}

function createTrack(file: File, index: number): LocalMusicTrack {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const label = relativePath || file.name;
  const fingerprint = `${label}-${file.size}-${file.lastModified}-${index}`;

  return {
    id: `bgm-${encodeURIComponent(fingerprint)}`,
    label,
    file,
  };
}

const SELECT_STYLE: React.CSSProperties = {
  colorScheme: 'dark',
  backgroundColor: '#0f172a',
  color: '#ffffff',
};

const OPTION_STYLE: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
};

export function BackgroundMusicPicker({ value, volume, onChange, onVolumeChange }: BackgroundMusicPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeUrlRef = useRef<string | null>(null);
  const [tracks, setTracks] = useState<LocalMusicTrack[]>([]);
  const [driveTracks, setDriveTracks] = useState<DriveMusicTrack[]>([]);
  const [message, setMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessage('Google Drive müzik kataloğu yükleniyor...');

    loadDriveMusicCatalog()
      .then(catalog => {
        if (cancelled) return;
        const sorted = [...catalog].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        setDriveTracks(sorted);
        setMessage(`${sorted.length} Google Drive müziği hazır`);
      })
      .catch(error => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : 'Google Drive müzik kataloğu yüklenemedi.');
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    setMessage('Google Drive haber müzikleri otomatik yükleniyor...');
    loadAutomaticDriveMusic()
      .then(track => {
        if (cancelled) return;
        onChange(track);
        setMessage(`Google Drive’dan otomatik seçildi: ${track.name}`);
      })
      .catch(error => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : 'Google Drive müziği yüklenemedi.');
      });
    return () => { cancelled = true; };
  }, [value, onChange]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }, [value?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, [volume]);

  useEffect(() => {
    if (!value && activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  }, [value]);

  const selectLocalTrack = (track: LocalMusicTrack | null) => {
    audioRef.current?.pause();
    setIsPlaying(false);

    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }

    if (!track) {
      onChange(null);
      return;
    }

    const url = URL.createObjectURL(track.file);
    activeUrlRef.current = url;
    onChange({
      id: track.id,
      name: track.file.name,
      type: 'audio',
      mimeType: track.file.type || 'audio/mpeg',
      size: track.file.size,
      url,
    });
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audioTracks = Array.from(event.target.files || [])
      .filter(isAudioFile)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      .map(createTrack);

    event.target.value = '';

    if (audioTracks.length === 0) {
      setMessage('Bu klasörde desteklenen bir ses dosyası bulunamadı.');
      return;
    }

    setTracks(audioTracks);
    setMessage(`${audioTracks.length} yerel müzik bulundu`);
    selectLocalTrack(null);
  };

  const handleTrackChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = event.target.value;

    if (!selectedId) {
      selectLocalTrack(null);
      return;
    }

    if (selectedId.startsWith('drive-')) {
      const driveId = selectedId.slice('drive-'.length);
      const track = driveTracks.find(item => item.id === driveId);
      if (!track) {
        setMessage('Seçilen Google Drive müziği katalogda bulunamadı.');
        return;
      }

      audioRef.current?.pause();
      setIsPlaying(false);
      setIsDriveLoading(true);
      setMessage(`${track.name} Google Drive’dan yükleniyor...`);
      try {
        const media = await loadDriveMusicTrack(track);
        onChange(media);
        setMessage(`Google Drive müziği seçildi: ${track.name}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Google Drive müziği yüklenemedi.');
      } finally {
        setIsDriveLoading(false);
      }
      return;
    }

    const track = tracks.find(item => item.id === selectedId) || null;
    selectLocalTrack(track);
  };

  const togglePreview = async () => {
    const audio = audioRef.current;
    if (!audio || !value?.url) return;

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setMessage(`${value.name} — önizleme oynatılıyor`);
    } catch {
      setIsPlaying(false);
      setMessage('Bu ses dosyası tarayıcıda oynatılamadı.');
    }
  };

  const volumePercent = Math.round(Math.min(1, Math.max(0, volume)) * 100);

  return (
    <section
      aria-labelledby="background-music-title"
      className="mb-4 rounded-2xl border border-indigo-500/25 bg-indigo-950/10 p-3 shadow-lg"
    >
      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-[#080C17]/95 p-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-400">
            <FolderOpen size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 id="background-music-title" className="mb-1 text-[10px] font-black tracking-wide text-slate-400">
              ARKA PLAN SESİ
            </h2>

            <div className="relative">
              <Music
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-indigo-400"
              />

              <select
                aria-label="Arka plan müziği"
                value={value?.id || ''}
                onChange={handleTrackChange}
                disabled={isDriveLoading}
                style={SELECT_STYLE}
                className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-10 text-sm font-semibold text-white shadow-inner outline-none transition hover:border-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 disabled:cursor-wait disabled:opacity-70"
              >
                <option value="" style={OPTION_STYLE}>Arka Ses Yok</option>

                {driveTracks.length > 0 && (
                  <optgroup label={`Google Drive (${driveTracks.length})`} style={OPTION_STYLE}>
                    {driveTracks.map(track => (
                      <option
                        key={track.id}
                        value={`drive-${track.id}`}
                        style={OPTION_STYLE}
                      >
                        {track.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {tracks.length > 0 && (
                  <optgroup label={`Yerel Müzikler (${tracks.length})`} style={OPTION_STYLE}>
                    {tracks.map(track => (
                      <option
                        key={track.id}
                        value={track.id}
                        style={OPTION_STYLE}
                      >
                        {track.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-300"
              />
            </div>

            {isDriveLoading && (
              <p className="mt-1 text-[9px] font-semibold text-violet-300">Müzik yükleniyor...</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-[10px] font-black text-white shadow-[0_8px_24px_rgba(124,58,237,0.24)] transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          İSTEĞE BAĞLI YEREL MÜZİK
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*,.aac,.flac,.m4a,.mp3,.oga,.ogg,.opus,.wav,.wma"
          onChange={handleFolderSelect}
          className="hidden"
        />
      </div>

      {value && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-black/25 px-2.5 py-2">
          <button
            type="button"
            onClick={togglePreview}
            aria-label={isPlaying ? 'Müzik önizlemesini duraklat' : 'Müzik önizlemesini oynat'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <Volume2 size={15} className="shrink-0 text-indigo-400" />
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={volumePercent}
            onChange={event => onVolumeChange(Number(event.target.value) / 100)}
            aria-label="Arka plan müziği ses seviyesi"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-violet-500"
          />
          <span className="w-9 shrink-0 text-right text-[10px] font-black text-slate-300">{volumePercent}%</span>

          <audio
            ref={audioRef}
            src={value.url}
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      <p className={`mt-2 text-center text-[8px] ${message.startsWith('Bu klasörde') ? 'text-rose-400' : 'text-slate-500'}`}>
        {message || 'Google Drive haber müziği her üretimde otomatik seçilir'}
      </p>
    </section>
  );
}
