import sys
import av
import wave

def test_av(input_path, output_path):
    container = av.open(input_path)
    audio_stream = next(s for s in container.streams if s.type == 'audio')
    
    resampler = av.AudioResampler(
        format='s16',
        layout='mono',
        rate=16000,
    )
    
    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        
        for frame in container.decode(audio_stream):
            frame.pts = None
            for resampled in resampler.resample(frame):
                wav_file.writeframes(resampled.planes[0].to_bytes())
                
if __name__ == "__main__":
    test_av(sys.argv[1], sys.argv[2])
