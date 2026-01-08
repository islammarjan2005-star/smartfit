import json
import os
import re
import time
import tempfile
import subprocess
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
import httpx

from app.config import settings


class VideoInsightService:
    """Service for extracting insights from short-form videos."""

    PLATFORM_PATTERNS = {
        "tiktok": [
            r"tiktok\.com",
            r"vm\.tiktok\.com",
        ],
        "reels": [
            r"instagram\.com/reel",
            r"instagram\.com/p",
        ],
        "shorts": [
            r"youtube\.com/shorts",
            r"youtu\.be",
        ],
    }

    @classmethod
    def detect_platform(cls, url: str) -> Optional[str]:
        """Detect which platform the URL is from."""
        url_lower = url.lower()
        for platform, patterns in cls.PLATFORM_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, url_lower):
                    return platform
        return None

    @classmethod
    async def download_video(cls, url: str, output_dir: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Download video from URL using yt-dlp.
        Returns (video_path, error_message).
        """
        try:
            output_template = os.path.join(output_dir, "video.%(ext)s")

            # Use yt-dlp to download video
            cmd = [
                "yt-dlp",
                "--no-playlist",
                "--max-filesize", "100M",
                "-f", "best[filesize<100M]/best",
                "-o", output_template,
                "--no-warnings",
                "--quiet",
                url
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                return None, f"Download failed: {result.stderr}"

            # Find the downloaded file
            for file in os.listdir(output_dir):
                if file.startswith("video."):
                    return os.path.join(output_dir, file), None

            return None, "Video file not found after download"

        except subprocess.TimeoutExpired:
            return None, "Download timed out"
        except FileNotFoundError:
            return None, "yt-dlp not installed. Please install it with: pip install yt-dlp"
        except Exception as e:
            return None, f"Download error: {str(e)}"

    @classmethod
    async def extract_audio(cls, video_path: str, output_dir: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract audio from video using ffmpeg.
        Returns (audio_path, error_message).
        """
        try:
            audio_path = os.path.join(output_dir, "audio.mp3")

            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "libmp3lame",
                "-ab", "128k",
                "-ar", "16000",  # 16kHz for Whisper
                "-y",  # Overwrite
                audio_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                return None, f"Audio extraction failed: {result.stderr}"

            if os.path.exists(audio_path):
                return audio_path, None

            return None, "Audio file not created"

        except subprocess.TimeoutExpired:
            return None, "Audio extraction timed out"
        except FileNotFoundError:
            return None, "ffmpeg not installed"
        except Exception as e:
            return None, f"Audio extraction error: {str(e)}"

    @classmethod
    async def transcribe_audio(cls, audio_path: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Transcribe audio using OpenAI Whisper API.
        Returns (transcript, error_message).
        """
        if not settings.OPENAI_API_KEY:
            return cls._mock_transcript(), None

        try:
            async with httpx.AsyncClient() as client:
                with open(audio_path, "rb") as audio_file:
                    files = {"file": ("audio.mp3", audio_file, "audio/mpeg")}
                    data = {"model": "whisper-1", "language": "en"}

                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        files=files,
                        data=data,
                        timeout=120.0
                    )

                    if response.status_code == 200:
                        result = response.json()
                        return result.get("text", ""), None
                    else:
                        return None, f"Transcription API error: {response.status_code}"

        except Exception as e:
            return None, f"Transcription error: {str(e)}"

    @classmethod
    async def analyze_content(
        cls,
        transcript: str,
        creator_mode: bool = False,
        platform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze transcript using GPT-4 to extract insights.
        """
        if not settings.OPENAI_API_KEY:
            return cls._mock_analysis(creator_mode)

        try:
            # Build the analysis prompt
            base_prompt = f"""Analyze this video transcript and extract the core value. Be concise, punchy, and actionable.

TRANSCRIPT:
{transcript}

Provide your analysis in this exact JSON format:
{{
    "summary": "2-3 sentence summary of the main idea or takeaway",
    "steps": ["step 1", "step 2", "step 3"],  // If the video teaches something, provide steps. Otherwise empty array.
    "core_insight": "One powerful sentence that captures the essence",
    "content_inspiration": "One sentence describing how creators can reuse this idea",
    "hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"]  // 3-5 potential titles/hooks based on the tone
}}

Rules:
- The summary should explain the main idea, tip, trick, or life hack in plain English
- Steps should be actionable and numbered naturally (if applicable)
- Core insight should be quotable and memorable
- Content inspiration should spark ideas for repurposing
- Hooks should match the video's tone (casual, professional, urgent, etc.)
"""

            creator_prompt = """

ALSO provide creator analysis in these additional fields:
{{
    "hook_analysis": "How does the video open? What makes the hook effective?",
    "pacing_analysis": "How is information delivered? Fast cuts, slow build, etc.",
    "format_analysis": "What format is used? Talking head, screen share, B-roll, etc.",
    "remix_ideas": "3 ways to adapt this content for different niches (fitness, business, parenting, etc.)"
}}
""" if creator_mode else ""

            full_prompt = base_prompt + creator_prompt

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert content analyst. You extract actionable insights from video content. Always respond with valid JSON."
                            },
                            {"role": "user", "content": full_prompt}
                        ],
                        "max_tokens": 1500,
                        "temperature": 0.7,
                    },
                    timeout=60.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]

                    # Parse JSON from response
                    json_str = content
                    if "```json" in content:
                        json_str = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        json_str = content.split("```")[1].split("```")[0]

                    return json.loads(json_str.strip())
                else:
                    return cls._mock_analysis(creator_mode)

        except Exception as e:
            print(f"Analysis error: {e}")
            return cls._mock_analysis(creator_mode)

    @classmethod
    async def analyze_video_frames(cls, video_path: str) -> Optional[str]:
        """
        Fallback: Extract key frames and use vision API for semantic analysis.
        Used when transcription quality is low.
        """
        if not settings.OPENAI_API_KEY:
            return None

        try:
            import base64

            # Extract a frame from the video using ffmpeg
            frame_path = video_path.replace(".mp4", "_frame.jpg").replace(".webm", "_frame.jpg")

            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-ss", "00:00:03",  # 3 seconds in
                "-vframes", "1",
                "-y",
                frame_path
            ]

            subprocess.run(cmd, capture_output=True, timeout=30)

            if not os.path.exists(frame_path):
                return None

            # Encode frame to base64
            with open(frame_path, "rb") as f:
                base64_image = base64.b64encode(f.read()).decode("utf-8")

            # Use vision API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Describe what's happening in this video frame. What topic or subject matter does this seem to be about? What might this video be teaching or showing?"
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                                    }
                                ]
                            }
                        ],
                        "max_tokens": 300,
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]

            # Clean up
            os.remove(frame_path)

        except Exception as e:
            print(f"Frame analysis error: {e}")

        return None

    @classmethod
    async def process_video_url(
        cls,
        url: str,
        creator_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Main method: Process a video URL and return insights.
        """
        start_time = time.time()
        platform = cls.detect_platform(url)

        with tempfile.TemporaryDirectory() as temp_dir:
            # Step 1: Download video
            video_path, error = await cls.download_video(url, temp_dir)
            if error:
                return {"error": error, "processing_time": time.time() - start_time}

            # Step 2: Extract audio
            audio_path, error = await cls.extract_audio(video_path, temp_dir)
            if error:
                # Fallback to frame analysis
                frame_context = await cls.analyze_video_frames(video_path)
                if frame_context:
                    analysis = await cls.analyze_content(
                        f"[Video visual context: {frame_context}]",
                        creator_mode,
                        platform
                    )
                    return {
                        **analysis,
                        "source_url": url,
                        "source_platform": platform,
                        "transcript": f"[Visual analysis only: {frame_context}]",
                        "processing_time": time.time() - start_time,
                    }
                return {"error": error, "processing_time": time.time() - start_time}

            # Step 3: Transcribe audio
            transcript, error = await cls.transcribe_audio(audio_path)
            if error:
                return {"error": error, "processing_time": time.time() - start_time}

            # Check transcript quality
            if not transcript or len(transcript.strip()) < 20:
                # Try frame analysis as fallback
                frame_context = await cls.analyze_video_frames(video_path)
                if frame_context:
                    transcript = f"[Low quality audio. Visual context: {frame_context}]"

            # Step 4: Analyze content
            analysis = await cls.analyze_content(transcript, creator_mode, platform)

            return {
                **analysis,
                "source_url": url,
                "source_platform": platform,
                "transcript": transcript,
                "processing_time": time.time() - start_time,
                "creator_mode_enabled": creator_mode,
            }

    @classmethod
    async def process_video_file(
        cls,
        file_path: str,
        creator_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Process an uploaded video file and return insights.
        """
        start_time = time.time()

        with tempfile.TemporaryDirectory() as temp_dir:
            # Step 1: Extract audio
            audio_path, error = await cls.extract_audio(file_path, temp_dir)
            if error:
                # Try frame analysis as fallback
                frame_context = await cls.analyze_video_frames(file_path)
                if frame_context:
                    analysis = await cls.analyze_content(
                        f"[Video visual context: {frame_context}]",
                        creator_mode
                    )
                    return {
                        **analysis,
                        "source_platform": "upload",
                        "transcript": f"[Visual analysis only: {frame_context}]",
                        "processing_time": time.time() - start_time,
                    }
                return {"error": error, "processing_time": time.time() - start_time}

            # Step 2: Transcribe audio
            transcript, error = await cls.transcribe_audio(audio_path)
            if error:
                return {"error": error, "processing_time": time.time() - start_time}

            # Check transcript quality
            if not transcript or len(transcript.strip()) < 20:
                frame_context = await cls.analyze_video_frames(file_path)
                if frame_context:
                    transcript = f"[Low quality audio. Visual context: {frame_context}]"

            # Step 3: Analyze content
            analysis = await cls.analyze_content(transcript, creator_mode)

            return {
                **analysis,
                "source_platform": "upload",
                "transcript": transcript,
                "processing_time": time.time() - start_time,
                "creator_mode_enabled": creator_mode,
            }

    @staticmethod
    def _mock_transcript() -> str:
        """Return mock transcript for testing."""
        return """
        Here's a productivity hack that changed my life. Instead of making a to-do list,
        make a 'done' list. Every time you complete something, write it down.
        This creates positive momentum and shows you how much you actually accomplish.
        Most people underestimate what they do in a day. Try it for a week and you'll
        feel way more motivated. The key is to write down even small wins.
        """

    @staticmethod
    def _mock_analysis(creator_mode: bool = False) -> Dict[str, Any]:
        """Return mock analysis for testing without API."""
        result = {
            "summary": "Replace your to-do list with a 'done' list. Instead of planning tasks, document completed ones to build momentum and recognize your daily achievements.",
            "steps": [
                "Stop writing to-do lists for one week",
                "Keep a notebook or app open throughout the day",
                "Write down every task you complete, no matter how small",
                "Review your done list at the end of each day",
                "Notice the boost in motivation and self-awareness"
            ],
            "core_insight": "Tracking accomplishments beats planning tasks—momentum comes from seeing progress, not from perfect plans.",
            "content_inspiration": "Show the transformation from overwhelming to-do anxiety to empowered productivity by visualizing your 'done' list growth.",
            "hooks": [
                "I deleted my to-do list and tripled my productivity",
                "The anti-productivity hack that actually works",
                "Why your to-do list is making you fail",
                "Try this for 7 days and watch your motivation explode",
                "The 'done' list method: proof you're crushing it"
            ],
        }

        if creator_mode:
            result.update({
                "hook_analysis": "Opens with a bold claim ('changed my life') that creates curiosity. The hook promises transformation, which is highly engaging for productivity content.",
                "pacing_analysis": "Quick delivery with short sentences. Each point builds on the previous. Uses 'you' language to make it personal. Ends with a clear call-to-action.",
                "format_analysis": "Talking head style with direct camera address. Simple background keeps focus on the speaker. No B-roll, relies entirely on verbal delivery.",
                "remix_ideas": "1) Fitness: Track completed workouts instead of planning them. 2) Business: Document closed deals instead of pipeline goals. 3) Parenting: Note daily parenting wins instead of ideal routines."
            })

        return result
