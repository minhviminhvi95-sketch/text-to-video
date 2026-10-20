"""Local static server with a bounded, same-origin narration endpoint."""
import argparse
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import BoundedSemaphore
from urllib.parse import urlparse

from narration import generate

ROOT = Path(__file__).resolve().parent
SLOTS = BoundedSemaphore(1)


class Handler(SimpleHTTPRequestHandler):
    def json_response(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/narration':
            return self.json_response(404, {'error': 'Không tìm thấy chức năng.'})
        origin = self.headers.get('Origin')
        if origin and urlparse(origin).netloc != self.headers.get('Host'):
            return self.json_response(403, {'error': 'Yêu cầu phải đến từ cùng ứng dụng.'})
        if self.headers.get_content_type() != 'application/json':
            return self.json_response(415, {'error': 'Cần dữ liệu JSON.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.json_response(400, {'error': 'Độ dài không hợp lệ.'})
        if not 0 < length <= 24000:
            return self.json_response(413, {'error': 'Lời đọc quá dài.'})
        if not SLOTS.acquire(blocking=False):
            return self.json_response(429, {'error': 'Đang tạo giọng đọc. Vui lòng chờ.'})
        try:
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError('Cần một đối tượng JSON.')
            audio, durations = generate(data.get('scenes'), data.get('engine', 'offline'))
            self.json_response(200, {'audio': base64.b64encode(audio).decode(), 'durations': durations, 'engine': data.get('engine', 'offline')})
        except (ValueError, TypeError):
            self.json_response(400, {'error': 'Cần 1–40 cảnh có lời đọc, tổng tối đa 5.000 ký tự.'})
        except ImportError:
            self.json_response(503, {'error': 'Chưa cài thư viện giọng đọc. Chạy: python -m pip install -r requirements.txt'})
        except RuntimeError as exc:
            self.json_response(502, {'error': str(exc)})
        except Exception:
            self.json_response(500, {'error': 'Không tạo được giọng đọc. Hãy thử lại hoặc tải tệp âm thanh lên.'})
        finally:
            SLOTS.release()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(ROOT)))
    print(f'Minh Video Studio đang chạy trên cổng {args.port}', flush=True)
    server.serve_forever()
