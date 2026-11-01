HƯỚNG DẪN THANH TOÁN ONLINE VNPAY – DNK HOTEL

1. Đăng ký VNPay Sandbox

Truy cập: https://sandbox.vnpayment.vn/devreg/

Đăng ký tài khoản và kích hoạt qua email.

Nhận TmnCode và HashSecret từ VNPay.

2. Chạy website DNK Hotel

Mở Terminal VSCode tại thư mục QuanLyKhachSan.API:

dotnet run --urls "http://localhost"

3. Tạo đường dẫn HTTPS

Cài Cloudflare Tunnel:

winget install --id Cloudflare.cloudflared -e

Mở Terminal khác:

cloudflared tunnel --url http://localhost

Sao chép đường dẫn https://...trycloudflare.com để thử nghiệm.

4. Lưu mã VNPay

Trong thư mục QuanLyKhachSan.API, chạy:

dotnet user-secrets init
dotnet user-secrets set "VnPay:TmnCode" "MA_VNPAY_CUA_BAN"
dotnet user-secrets set "VnPay:HashSecret" "HASH_SECRET_CUA_BAN"

Giữ dấu ngoặc kép và thay nội dung bằng mã thật. Không đưa HashSecret lên GitHub.

5. Tích hợp thanh toán

Tạo VnPayService.cs để tạo URL thanh toán và kiểm tra chữ ký.

Tạo VnPayController.cs để xử lý thanh toán và IPN.

Thêm nút Thanh toán VNPay vào trang đặt cọc User.

Tính tiền cọc mẫu bằng 30% tổng tiền phòng.

Xác thực giao dịch thành công rồi cập nhật bảng DatCoc và trạng thái DatPhong thành Đã đặt cọc.

Đối trừ tiền cọc khi lập hóa đơn, tránh tính hai lần.

6. Kiểm thử

Chạy website và Cloudflare Tunnel.

Đăng nhập User → Đặt phòng → Thanh toán VNPay.

Sử dụng phương thức thanh toán thử nghiệm do VNPay Sandbox cung cấp.

Kiểm tra trạng thái đơn trong SQL Server.

Lễ tân và Admin kiểm tra lịch sử đặt cọc.

Lưu ý: Cloudflare Quick Tunnel có URL tạm thời. Cần cấu hình lại URL callback/IPN khi đường dẫn thay đổi. Chỉ cập nhật đã thanh toán sau khi backend xác thực kết quả VNPay, không dựa vào trang thông báo thành công.

Khi URL thay đổi, làm 3 bước:
1. Mở Terminal trong VSCode, chạy lại Cloudflare Tunnel và copy URL mới.
2. Vào cấu hình VNPay trong dự án DNK Hotel, thay URL cũ bằng URL mới ở ReturnUrl và IpnUrl (nếu đang cấu hình các URL này).
3. Cập nhật URL IPN bên VNPay nếu tài khoản Sandbox của mình có đăng ký IPN URL, rồi khởi động lại backend nếu cần.