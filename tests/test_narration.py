import io
import json
import threading
import unittest
import urllib.error
import urllib.request
import wave
from functools import partial
from http.server import ThreadingHTTPServer

from narration import generate
from server import Handler, ROOT


class NarrationTests(unittest.TestCase):
    def test_vietnamese_speech_and_scene_timing(self):
        data, durations = generate(['Xin chào Việt Nam.', 'Đây là cảnh thứ hai.'])
        with wave.open(io.BytesIO(data)) as audio:
            self.assertEqual(audio.getnchannels(), 1)
            self.assertEqual(audio.getsampwidth(), 2)
            self.assertEqual(len(durations), 2)
            self.assertTrue(all(d > .5 for d in durations))
            self.assertAlmostEqual(sum(durations), audio.getnframes() / audio.getframerate(), places=5)
            self.assertTrue(any(audio.readframes(audio.getnframes())))

    def test_reject_invalid_scenes_and_engines(self):
        for scenes, engine in [(None, 'offline'), ([], 'offline'), ([''], 'offline'), (['x' * 5001], 'offline'), (['Xin chào'], 'unknown')]:
            with self.subTest(scenes=type(scenes).__name__, engine=engine):
                with self.assertRaises(ValueError):
                    generate(scenes, engine)


class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/api/narration'
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, body, headers):
        request = urllib.request.Request(self.url, data=body, headers=headers)
        try:
            return urllib.request.urlopen(request)
        except urllib.error.HTTPError as response:
            return response

    def test_reject_cross_origin(self):
        response = self.post(b'{}', {'Content-Type': 'application/json', 'Origin': 'https://other.example'})
        self.assertEqual(response.code, 403)
        response.close()

    def test_reject_non_json(self):
        response = self.post(b'{}', {'Content-Type': 'text/plain'})
        self.assertEqual(response.code, 415)
        response.close()

    def test_reject_invalid_json(self):
        response = self.post(b'{invalid', {'Content-Type': 'application/json'})
        self.assertEqual(response.code, 400)
        self.assertIn('error', json.load(response))
        response.close()

    def test_reject_large_input(self):
        response = self.post(b' ' * 24001, {'Content-Type': 'application/json'})
        self.assertEqual(response.code, 413)
        response.close()


if __name__ == '__main__':
    unittest.main()
