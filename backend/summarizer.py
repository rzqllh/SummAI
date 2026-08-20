import os
from groq import Groq, AuthenticationError, APIError, RateLimitError
from google import genai
from google.genai import types, errors
import time
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def transcribe_audio(audio_file_path: str, custom_groq_key: str = None) -> str:
    # Reload .env dynamically so live edits take effect immediately
    load_dotenv(override=True)
    
    groq_api_key = custom_groq_key or os.environ.get("GROQ_API_KEY")
    if not groq_api_key or not groq_api_key.strip():
        raise ValueError("GROQ_API_KEY is not set. Please provide a valid Groq API Key in Settings.")
        
    try:
        groq_client = Groq(api_key=groq_api_key.strip())
        
        with open(audio_file_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(os.path.basename(audio_file_path), file.read()),
                model="whisper-large-v3",
                response_format="text",
                language="id"
            )
        return str(transcription)
    except AuthenticationError as e:
        logger.error(f"Groq Authentication failed: {e}")
        raise ValueError("Invalid or expired GROQ_API_KEY. Please update your Groq API Key in Settings.")
    except RateLimitError as e:
        logger.error(f"Groq Rate limit: {e}")
        raise ValueError("Groq rate limit exceeded. Please wait a moment before trying again.")
    except APIError as e:
        logger.error(f"Groq API Error: {e}")
        raise ValueError(f"Groq Whisper transcription failed: {e.message if hasattr(e, 'message') else str(e)}")
    except Exception as e:
        logger.error(f"Unexpected Groq error: {e}")
        raise ValueError(f"Transcription failed: {str(e)}")

def process_video_transcript(video_file_path: str, custom_gemini_key: str = None) -> str:
    load_dotenv(override=True)
    
    gemini_api_key = custom_gemini_key or os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key or not gemini_api_key.strip():
        raise ValueError("GEMINI_API_KEY is not set. Please provide a valid Gemini API Key in Settings.")
        
    try:
        gemini_client = genai.Client(api_key=gemini_api_key.strip())
        
        logger.info(f"Uploading video {video_file_path} to Gemini...")
        video_file = gemini_client.files.upload(file=video_file_path)
        
        while video_file.state.name == "PROCESSING":
            logger.info("Gemini is processing the video...")
            time.sleep(5)
            video_file = gemini_client.files.get(name=video_file.name)
            
        if video_file.state.name == "FAILED":
            raise ValueError("Gemini failed to process the video.")
            
        logger.info("Video processed. Generating transcript...")
        prompt = "Tolong buatkan transkrip lengkap kata-demi-kata dari video rapat ini, sertakan siapa yang berbicara jika memungkinkan. Hanya berikan teks transkrip tanpa komentar tambahan apa pun."
        
        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[video_file, prompt],
            config=types.GenerateContentConfig(temperature=0.1)
        )
        
        return response.text
    except errors.ClientError as e:
        logger.error(f"Gemini ClientError: {e}")
        raise ValueError(f"Gemini API error: {e.message if hasattr(e, 'message') else str(e)}")
    except Exception as e:
        logger.error(f"Unexpected Gemini video transcript error: {e}")
        raise ValueError(f"Gemini video processing failed: {str(e)}")

def generate_summary(raw_transcript: str, custom_prompt: str = None, custom_gemini_key: str = None) -> str:
    load_dotenv(override=True)
    
    gemini_api_key = custom_gemini_key or os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key or not gemini_api_key.strip():
        raise ValueError("GEMINI_API_KEY is not set. Please provide a valid Gemini API Key in Settings.")
        
    try:
        gemini_client = genai.Client(api_key=gemini_api_key.strip())
        
        if custom_prompt and custom_prompt.strip():
            prompt = f"""
            {custom_prompt}

            TRANSKRIP MEETING:
            {raw_transcript}
            """
        else:
            prompt = f"""
            Kamu adalah Notulis Rapat Profesional. Tugasmu adalah menganalisis transkrip meeting berikut dan buat ringkasan yang terstruktur.

            TRANSKRIP MEETING:
            {raw_transcript}

            FORMAT OUTPUT (Gunakan Markdown):
            ## 📌 Ringkasan Eksekutif
            (Ringkasan 2-3 kalimat mengenai fokus utama rapat)

            ## 💬 Poin-Poin Diskusi Utama
            - (Detail topik yang dibahas)

            ## 🎯 Keputusan Final
            - (Keputusan yang disepakati bersama)

            ## 📝 Action Items & To-Do List
            | Task / Tugas | PIC (Jika ada) | Target / Deadline |
            | :--- | :--- | :--- |
            | Contoh task | Nama | YYYY-MM-DD / ASAP |

            ## ❓ Topik Pending / Follow-up Needed
            - (Isu yang belum selesai)
            """

        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2, 
            )
        )
        
        return response.text
    except errors.ClientError as e:
        logger.error(f"Gemini ClientError: {e}")
        raise ValueError(f"Gemini API error: {e.message if hasattr(e, 'message') else str(e)}")
    except Exception as e:
        logger.error(f"Unexpected Gemini summary error: {e}")
        raise ValueError(f"Gemini synthesis failed: {str(e)}")

