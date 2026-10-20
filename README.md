# Text to Video — Minh Video Studio

Công cụ tiếng Việt dựng video chữ và ảnh sản phẩm ngay trong trình duyệt.

## Chức năng

- Mỗi dòng nội dung là một cảnh.
- Tải ảnh sản phẩm và thêm chuyển động tiến gần hoặc lướt ngang.
- Chọn tỷ lệ 9:16, 16:9 hoặc 1:1; thời lượng 10, 15 hoặc 20 giây.
- Mẫu nội thất ô tô, Ốp Hịn Cute và Bếp Của Minh.
- Xuất video WebM 720p, không âm thanh.
- Soạn và sao chép câu lệnh dùng cho dịch vụ tạo video AI bên ngoài.

## Chạy ứng dụng

Không cần cài thư viện. Mở `index.html` bằng Chrome hoặc Edge mới. Có thể chạy máy chủ tĩnh:

```bash
python -m http.server 8000
```

Sau đó mở http://localhost:8000. Tính năng sao chép cần HTTPS hoặc localhost.

## Cách sử dụng

1. Chọn mẫu hoặc nhập thương hiệu và nội dung, mỗi dòng là một cảnh.
2. Thêm ảnh, chọn tỷ lệ, thời lượng và phong cách.
3. Nhấn **Xem chuyển động**.
4. Nhấn **Xuất video WebM**, giữ tab ở phía trước trong lúc xuất.
5. Nhấn **Tải video**.

## Giới hạn hiện tại

Đây là công cụ dựng chữ và ảnh chuyển động; chưa sinh cảnh quay AI từ mô tả, chưa có giọng đọc, nhạc hoặc xuất MP4/4K. Chưa tích hợp Runway hay dịch vụ AI khác. Kết nối một dịch vụ trong ChatGPT không tự động kết nối dịch vụ đó với ứng dụng này.

Ảnh được xử lý trong trình duyệt, ứng dụng không có backend nhận ảnh. Video xuất và bản nhập liệu chưa được lưu tự động khi đóng trang.

## Kiểm tra

Cú pháp JavaScript đã được kiểm tra. Chức năng xuất WebM chưa được kiểm thử đầy đủ trong trình duyệt; khả năng hỗ trợ phụ thuộc trình duyệt và thiết bị.
