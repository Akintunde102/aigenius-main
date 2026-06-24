//! AIGenius audio transcoder — converts arbitrary audio to 16 kHz mono PCM.
//!
//! Replaces the `ffmpeg` subprocess in `stt_whisper_cpp.py`, eliminating
//! ~50–100 ms of process-spawn overhead per STT request.
//!
//! # Supported input formats (via `symphonia`)
//! WAV, WebM/Opus, OGG/Vorbis, FLAC, MP3, MP4/AAC, AIFF
//!
//! # Example
//! ```rust,no_run
//! use audio_transcoder::decode_to_wav16k_mono;
//!
//! let wav_bytes = decode_to_wav16k_mono("input.webm").unwrap();
//! std::fs::write("output.wav", &wav_bytes).unwrap();
//! ```

use std::fs;
use std::path::Path;

use rubato::{FftFixedInOut, Resampler};

use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

pub use error::TranscoderError;

mod error {
    use thiserror::Error;

    #[derive(Debug, Error)]
    pub enum TranscoderError {
        #[error("IO error: {0}")]
        Io(#[from] std::io::Error),
        #[error("Symphonia error: {0}")]
        Symphonia(#[from] symphonia::core::errors::Error),
        #[error("No audio track found in file")]
        NoTrack,
        #[error("Resampler error: {0}")]
        Resample(String),
    }
}

mod wav_writer {
    //! Minimal WAV writer — outputs a valid PCM RIFF file without any dependency.

    /// Write a PCM 16-bit mono WAV file header + samples.
    pub fn write_wav_pcm16_mono(sample_rate: u32, samples: &[i16]) -> Vec<u8> {
        let data_size = (samples.len() * 2) as u32;
        let file_size = 36 + data_size;
        let mut out = Vec::with_capacity(44 + samples.len() * 2);

        // RIFF header
        out.extend_from_slice(b"RIFF");
        out.extend_from_slice(&file_size.to_le_bytes());
        out.extend_from_slice(b"WAVE");

        // fmt  chunk
        out.extend_from_slice(b"fmt ");
        out.extend_from_slice(&16u32.to_le_bytes());   // chunk size
        out.extend_from_slice(&1u16.to_le_bytes());    // PCM
        out.extend_from_slice(&1u16.to_le_bytes());    // channels
        out.extend_from_slice(&sample_rate.to_le_bytes());
        out.extend_from_slice(&(sample_rate * 2).to_le_bytes()); // byte rate
        out.extend_from_slice(&2u16.to_le_bytes());    // block align
        out.extend_from_slice(&16u16.to_le_bytes());   // bits per sample

        // data chunk
        out.extend_from_slice(b"data");
        out.extend_from_slice(&data_size.to_le_bytes());
        for s in samples {
            out.extend_from_slice(&s.to_le_bytes());
        }
        out
    }
}

/// Target sample rate for whisper.cpp (must be 16 kHz).
const TARGET_SAMPLE_RATE: u32 = 16_000;

/// Decode any supported audio file and return a 16 kHz mono PCM WAV as bytes.
///
/// This is the main entry point — call from Python via PyO3 or from Rust tests.
pub fn decode_to_wav16k_mono(input_path: &str) -> Result<Vec<u8>, TranscoderError> {
    // ── 1. Open source ────────────────────────────────────────────────────────
    let path = Path::new(input_path);
    let file = fs::File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe().format(
        &hint,
        mss,
        &FormatOptions::default(),
        &MetadataOptions::default(),
    )?;

    let mut format = probed.format;

    // ── 2. Select best audio track ────────────────────────────────────────────
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or(TranscoderError::NoTrack)?
        .clone();

    let src_sample_rate = track.codec_params.sample_rate.unwrap_or(48_000);
    let src_channels = track.codec_params.channels.map(|c| c.count()).unwrap_or(1);
    let track_id = track.id;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())?;

    // ── 3. Decode all packets → interleaved f32 samples ──────────────────────
    let mut interleaved_f32: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(symphonia::core::errors::Error::IoError(e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break
            }
            Err(symphonia::core::errors::Error::ResetRequired) => break,
            Err(e) => return Err(e.into()),
        };

        if packet.track_id() != track_id {
            continue;
        }

        let decoded = decoder.decode(&packet)?;

        // Convert to f32 buffer regardless of source bit depth
        let mut sample_buf =
            symphonia::core::audio::SampleBuffer::<f32>::new(decoded.capacity() as u64, *decoded.spec());
        sample_buf.copy_interleaved_ref(decoded);
        interleaved_f32.extend_from_slice(sample_buf.samples());
    }

    // ── 4. Mix down to mono ───────────────────────────────────────────────────
    let mono_f32: Vec<f32> = if src_channels == 1 {
        interleaved_f32
    } else {
        let ch = src_channels as usize;
        interleaved_f32
            .chunks_exact(ch)
            .map(|frame| frame.iter().sum::<f32>() / ch as f32)
            .collect()
    };

    // ── 5. Resample to 16 kHz (skip if already at target) ────────────────────
    let resampled: Vec<f32> = if src_sample_rate == TARGET_SAMPLE_RATE {
        mono_f32
    } else {
        let chunk_size = 1024usize;
        let mut resampler = FftFixedInOut::<f32>::new(
            src_sample_rate as usize,
            TARGET_SAMPLE_RATE as usize,
            chunk_size,
            1,
        )
        .map_err(|e| TranscoderError::Resample(e.to_string()))?;

        let mut result = Vec::new();

        let chunks: Vec<&[f32]> = mono_f32.chunks(chunk_size).collect();
        for (i, chunk) in chunks.iter().enumerate() {
            let is_last = i == chunks.len() - 1 && chunk.len() < chunk_size;

            let in_len = resampler.input_frames_next();
            let mut padded = chunk.to_vec();
            padded.resize(in_len, 0.0);

            let out_len = resampler.output_frames_next();
            let mut output_buf: Vec<Vec<f32>> = vec![vec![0.0f32; out_len]; 1];

            if is_last {
                // Last partial chunk — use process_partial which handles fewer input frames
                let (_, out_frames) = resampler
                    .process_partial_into_buffer(Some(&[padded]), &mut output_buf, None)
                    .map_err(|e| TranscoderError::Resample(e.to_string()))?;
                result.extend_from_slice(&output_buf[0][..out_frames]);
            } else {
                resampler
                    .process_into_buffer(&[padded], &mut output_buf, None)
                    .map_err(|e| TranscoderError::Resample(e.to_string()))?;
                result.extend_from_slice(&output_buf[0]);
            }
        }
        result
    };

    // ── 6. Convert to i16 PCM + write WAV ────────────────────────────────────
    let pcm16: Vec<i16> = resampled
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
        .collect();

    Ok(wav_writer::write_wav_pcm16_mono(TARGET_SAMPLE_RATE, &pcm16))
}

// ── Python bindings (feature = "python") ──────────────────────────────────────
#[cfg(feature = "python")]
mod python_bindings {
    use pyo3::prelude::*;
    use pyo3::types::PyBytes;

    /// Convert any audio file to a 16 kHz mono WAV returned as Python bytes.
    ///
    /// Args:
    ///     input_path (str): Path to the source audio file.
    ///
    /// Returns:
    ///     bytes: Raw WAV file content (RIFF/PCM-16 mono 16kHz).
    ///
    /// Raises:
    ///     RuntimeError: If decoding or resampling fails.
    #[pyfunction]
    fn decode_to_wav16k_mono_bytes<'py>(
        py: Python<'py>,
        input_path: &str,
    ) -> PyResult<Bound<'py, PyBytes>> {
        super::decode_to_wav16k_mono(input_path)
            .map(|bytes| PyBytes::new_bound(py, &bytes))
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    }

    /// Convert any audio file to a 16 kHz mono WAV and write it to disk.
    ///
    /// Args:
    ///     input_path (str): Path to source audio.
    ///     output_path (str): Destination WAV path.
    ///
    /// Returns:
    ///     str: The resolved output path.
    #[pyfunction]
    fn transcode_to_wav(input_path: &str, output_path: &str) -> PyResult<String> {
        let wav_bytes = super::decode_to_wav16k_mono(input_path)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))?;
        std::fs::write(output_path, &wav_bytes)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))?;
        Ok(std::fs::canonicalize(output_path)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| output_path.to_string()))
    }

    #[pymodule]
    fn audio_transcoder(m: &Bound<'_, PyModule>) -> PyResult<()> {
        m.add_function(wrap_pyfunction!(decode_to_wav16k_mono_bytes, m)?)?;
        m.add_function(wrap_pyfunction!(transcode_to_wav, m)?)?;
        m.add("__version__", env!("CARGO_PKG_VERSION"))?;
        Ok(())
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_wav(sample_rate: u32) -> Vec<u8> {
        // Generate a 440 Hz sine wave at the given sample rate
        use std::f32::consts::PI;
        let n_samples = sample_rate as usize; // 1 second
        let samples: Vec<i16> = (0..n_samples)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (f32::sin(2.0 * PI * 440.0 * t) * 0.8 * i16::MAX as f32) as i16
            })
            .collect();
        wav_writer::write_wav_pcm16_mono(sample_rate, &samples)
    }

    #[test]
    fn test_passthrough_16k() {
        let wav_bytes = make_test_wav(16_000);
        let tmp = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), &wav_bytes).unwrap();

        let result = decode_to_wav16k_mono(tmp.path().to_str().unwrap());
        assert!(result.is_ok(), "Should decode 16kHz WAV: {:?}", result.err());
        let out = result.unwrap();
        assert!(out.starts_with(b"RIFF"), "Output should be valid RIFF/WAV");
    }

    #[test]
    fn test_resample_from_48k() {
        let wav_bytes = make_test_wav(48_000);
        let tmp = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), &wav_bytes).unwrap();

        let result = decode_to_wav16k_mono(tmp.path().to_str().unwrap());
        assert!(result.is_ok(), "Should resample 48kHz WAV: {:?}", result.err());
    }

    #[test]
    fn test_wav_header_correct() {
        let samples: Vec<i16> = vec![0i16; 1600]; // 0.1s silence at 16kHz
        let wav = wav_writer::write_wav_pcm16_mono(16_000, &samples);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(&wav[36..40], b"data");
    }
}
