# Text to Video — Minh Video Studio

Ứng dụng tiếng Việt dựng video chữ, ảnh thực tế và giọng đọc.

## Chức năng

- Mỗi dòng nội dung là một cảnh; có mẫu đăng ký xe lần đầu kèm lời đọc sẵn.
- Chọn ảnh riêng cho từng cảnh hoặc ảnh nền chung.
- Hiển thị trọn ảnh tài liệu để tránh cắt mất thông tin, hoặc phủ kín nền.
- Ghi nguồn/chú thích ảnh trên video. Ứng dụng không tự xác minh tính chính xác của ảnh.
- Tạo giọng tiếng Việt ngoại tuyến bằng eSpeak NG (giọng máy), không cần API key.
- Tùy chọn giọng Google khi có Internet; lời đọc được gửi tới Google khi người dùng chọn tạo.
- Tải MP3/WAV hoặc tệp âm thanh tương thích để dùng bản thu của mình.
- Tự khớp thời lượng cảnh theo lời đọc được tạo; âm thanh tải lên chia đều thời lượng các cảnh.
- Xuất WebM 720p có tiếng (Opus) hoặc không tiếng; thời lượng tối đa 10 phút.
- Tỷ lệ 9:16, 16:9 hoặc 1:1, ảnh tiến gần/lướt ngang/đứng yên.

## Chạy trên Windows

1. Cài Python 3 nếu chưa có: https://www.python.org/downloads/
2. Tải kho mã về máy và giải nén.
3. Bấm đúp `start-windows.bat`. Lần đầu cần Internet để cài thư viện.
4. Giữ cửa sổ máy chủ mở trong khi dùng ứng dụng.

Tệp khởi động tự tạo `.venv`, cài `requirements.txt` và mở trình duyệt. Mặc định chỉ lắng nghe trên máy tính của bạn (127.0.0.1). Đã kiểm thử luồng tương đương trên Linux; chưa kiểm thử trực tiếp trên Windows.

## Chạy bằng lệnh

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
python server.py
```

Mở http://127.0.0.1:8000 bằng Chrome hoặc Edge mới. Nếu cổng đã dùng, chạy `python server.py --port 8001` và mở cổng tương ứng.

Giọng ngoại tuyến không cần FFmpeg. Giọng Google cần Internet tới `translate.google.com` và FFmpeg trong PATH. Không âm thầm chuyển sang một giọng khác nếu dịch vụ bị lỗi.

Mở trực tiếp `index.html` hoặc chạy máy chủ tĩnh vẫn dùng được ảnh và tệp âm thanh tải lên. Nút **Tạo giọng đọc** cần `server.py`, không chạy trên GitHub Pages hoặc `python -m http.server`.

## Tạo video có ảnh và giọng đọc

1. Nhập nội dung hiển thị, mỗi dòng một cảnh.
2. Trong **Ảnh thực tế theo từng cảnh**, chọn ảnh và ghi nguồn. Chỉ sử dụng ảnh bạn có quyền dùng; che thông tin cá nhân trên giấy tờ trước khi tải lên.
3. Nhập lời đọc, mỗi dòng khớp một cảnh. Để trống để đọc nội dung hiển thị.
4. Mẫu **Đăng ký xe** tự nạp lời đọc sẵn khi mở qua máy chủ. Với nội dung mới, chọn giọng rồi nhấn **Tạo giọng đọc**, hoặc chọn tệp MP3/WAV. Nghe kiểm tra bằng trình phát âm thanh.
5. Nhấn **Xem chuyển động** để xem với tiếng.
6. Nhấn **Xuất video WebM**, giữ trang ở phía trước đến khi hoàn tất, rồi **Tải video**.

Lời đọc được nhúng vào tệp video. Sửa nội dung hoặc lời đọc sau khi tạo sẽ xóa âm thanh đã tạo để tránh lệch cảnh; hãy tạo lại. Đổi mẫu sẽ xóa ảnh/âm thanh cũ. Muốn tự chỉnh thời lượng, xóa âm thanh trước.

## Video đăng ký xe

- Bản chữ không tiếng: [`videos/dang-ky-xe.mp4`](videos/dang-ky-xe.mp4).
- Bản giọng đọc ngoại tuyến: [`videos/dang-ky-xe-co-giong-doc.mp4`](videos/dang-ky-xe-co-giong-doc.mp4).

Nội dung dựa trên văn bản người dùng cung cấp, chưa xác minh pháp lý độc lập. Ảnh tài liệu thực tế chưa được bổ sung khi nguồn chính thức còn bị chặn bởi chính sách mạng của môi trường. Không dùng ảnh AI để giả làm ảnh thao tác thật.

## Kiểm tra

```bash
node --check app.js
python -m unittest discover -s tests -v
```

Đã kiểm thử trên Chromium: tạo tiếng Việt, chọn ảnh theo cảnh, xuất WebM có âm thanh Opus, xóa âm thanh, và chặn số dòng lời đọc không khớp. Tệp xuất được kiểm tra bằng FFprobe/FFmpeg. Kiểm thử đơn vị bao gồm WAV có dữ liệu tiếng, đồng bộ tổng thời lượng cảnh, và các yêu cầu API không hợp lệ.

## Giới hạn

Ứng dụng chưa tự tìm ảnh trên mạng, chưa sinh cảnh quay AI, chưa xuất MP4 trực tiếp từ trình duyệt. Ảnh và bản thu tải lên được xử lý trên trình duyệt; phần tạo giọng chạy ở máy chủ ứng dụng. Không tự lưu nội dung khi đóng trang. Giọng eSpeak NG có âm sắc máy; muốn giọng khác, dùng tùy chọn Google hoặc tải bản thu của bạn.
