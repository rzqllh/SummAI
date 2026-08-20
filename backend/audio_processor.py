import os
from pydub import AudioSegment
import tempfile
import math
import logging
import uuid
import subprocess

logger = logging.getLogger(__name__)

def extract_audio_from_video(video_path: str, job_dir: str = None) -> str:
    """Extracts the primary audio stream from a video file as MP3 using FFmpeg."""
    logger.info(f"Extracting audio from video: {video_path}")
    target_dir = job_dir or tempfile.gettempdir()
    unique_id = uuid.uuid4().hex[:8]
    base = os.path.basename(video_path)
    filename, _ = os.path.splitext(base)
    output_audio_path = os.path.join(target_dir, f"{filename}_{unique_id}_extracted.mp3")
    
    cmd = [
        "ffmpeg", "-i", video_path,
        "-q:a", "0", "-map", "0:a:0", "-y", output_audio_path
    ]
    
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        logger.info(f"Audio extracted successfully to {output_audio_path}")
        return output_audio_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFMPEG Error: {e.stderr.decode(errors='ignore')}")
        raise RuntimeError("Failed to extract audio from video using FFmpeg.")

def process_and_chunk_audio(file_path: str, chunk_duration_ms: int = 20 * 60 * 1000, job_dir: str = None) -> list[str]:
    """
    Checks if the audio file exceeds 20MB.
    If it's large, it splits the audio into chunks of `chunk_duration_ms` (20 mins).
    Returns a list of paths to the audio chunks with isolated unique paths.
    """
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    
    if file_size_mb <= 20:
        logger.info(f"File {file_path} is {file_size_mb:.2f}MB, no chunking needed.")
        return [file_path]
        
    logger.info(f"File {file_path} is {file_size_mb:.2f}MB, compressing and chunking...")
        
    audio = AudioSegment.from_file(file_path)
    
    # Compress: 1 channel (mono)
    audio = audio.set_channels(1)
    
    chunks = []
    target_dir = job_dir or tempfile.gettempdir()
    job_uuid = uuid.uuid4().hex[:8]
    
    total_duration = len(audio)
    num_chunks = math.ceil(total_duration / chunk_duration_ms)
    
    logger.info(f"Total duration: {total_duration}ms. Splitting into {num_chunks} chunks.")
    
    for i in range(num_chunks):
        start_time = i * chunk_duration_ms
        end_time = min((i + 1) * chunk_duration_ms, total_duration)
        chunk = audio[start_time:end_time]
        
        chunk_file_path = os.path.join(target_dir, f"chunk_{job_uuid}_{i}.mp3")
        chunk.export(chunk_file_path, format="mp3", bitrate="64k")
        chunks.append(chunk_file_path)
        logger.info(f"Exported chunk {i+1}/{num_chunks}: {chunk_file_path}")
        
    return chunks
