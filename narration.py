"""Vietnamese speech generation. Offline eSpeak NG or optional Google Translate TTS."""
import ctypes
import io
import subprocess
import threading
import wave

_LOCK = threading.Lock()


def offline_wav(text):
    import espeakng_loader
    with _LOCK:
        lib = espeakng_loader.load_library()
        if lib is None:
            raise RuntimeError('Không tải được eSpeak NG trên máy này.')
        lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
        lib.espeak_Initialize.restype = ctypes.c_int
        rate = lib.espeak_Initialize(2, 0, espeakng_loader.get_data_path().encode(), 0)
        if rate <= 0:
            raise RuntimeError('Không khởi tạo được eSpeak NG.')
        chunks = []
        callback_type = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)

        @callback_type
        def receive(samples, count, events):
            if samples and count:
                chunks.append(ctypes.string_at(samples, count * 2))
            return 0

        lib.espeak_SetSynthCallback.argtypes = [callback_type]
        lib.espeak_SetSynthCallback(receive)
        lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
        if lib.espeak_SetVoiceByName(b'vi') != 0:
            lib.espeak_Terminate()
            raise RuntimeError('Không có giọng tiếng Việt.')
        lib.espeak_SetParameter(1, 155, 0)
        lib.espeak_SetParameter(2, 80, 0)
        encoded = text.encode('utf-8') + b'\0'
        lib.espeak_Synth.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int, ctypes.c_uint, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p]
        result = lib.espeak_Synth(encoded, len(encoded), 0, 1, 0, 1, None, None)
        lib.espeak_Synchronize()
        lib.espeak_Terminate()
        if result != 0 or not chunks:
            raise RuntimeError('Không tạo được âm thanh.')
        return rate, b''.join(chunks)


def google_wav(text):
    from gtts import gTTS
    stream = io.BytesIO()
    try:
        gTTS(text, lang='vi', lang_check=False, timeout=(8, 25)).write_to_fp(stream)
    except Exception as exc:
        raise RuntimeError('Không kết nối được dịch vụ giọng đọc Google. Kiểm tra Internet hoặc chọn giọng ngoại tuyến.') from exc
    try:
        result = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ar', '22050', '-ac', '1', 'pipe:1'], input=stream.getvalue(), capture_output=True, check=True, timeout=30)
    except (OSError, subprocess.SubprocessError) as exc:
        raise RuntimeError('Cần FFmpeg để xử lý giọng Google.') from exc
    return 22050, result.stdout


def generate(scenes, engine='offline'):
    if engine not in ('offline', 'google'):
        raise ValueError('Giọng đọc không hợp lệ.')
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= 40:
        raise ValueError('Cần từ 1 đến 40 cảnh.')
    if any(not isinstance(s, str) or not s.strip() for s in scenes):
        raise ValueError('Mỗi cảnh cần có lời đọc.')
    if sum(map(len, scenes)) > 5000:
        raise ValueError('Lời đọc tối đa 5.000 ký tự.')
    parts, durations = [], []
    for text in scenes:
        rate, pcm = (offline_wav if engine == 'offline' else google_wav)(text.strip())
        padding = b'\0\0' * round(rate * 0.5)
        pcm += padding
        parts.append(pcm)
        durations.append(len(pcm) / (2 * rate))
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(b''.join(parts))
    return buffer.getvalue(), durations
