
using System.Globalization;
using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;

namespace QuanLyKhachSan.API.Services;

public class BookingEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<BookingEmailService> _logger;

    public BookingEmailService(
        IConfiguration config,
        ILogger<BookingEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private static string Safe(string? value)
    {
        return HtmlEncoder.Default.Encode(value ?? "");
    }

    private static string Money(decimal amount)
    {
        return amount.ToString(
            "N0",
            CultureInfo.GetCultureInfo("vi-VN")) + " đ";
    }

    private static string Row(string label, string value)
    {
        return $"""
            <tr>
                <td style="padding:12px;color:#74685d;
                    border-bottom:1px solid #eee8e1">
                    {Safe(label)}
                </td>
                <td style="padding:12px;text-align:right;
                    font-weight:600;border-bottom:1px solid #eee8e1">
                    {Safe(value)}
                </td>
            </tr>
            """;
    }

    private static string Layout(
        string title,
        string greeting,
        string description,
        string rows,
        string footer)
    {
        return $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1">
            </head>
            <body style="margin:0;padding:30px 12px;
                background:#f5f2ed;
                font-family:Arial,sans-serif;color:#30251e">
                <div style="max-width:620px;margin:auto;
                    background:#ffffff;border-radius:14px;
                    overflow:hidden">
                    <div style="padding:34px 28px;
                        text-align:center;background:#30251e;
                        color:#ffffff">
                        <div style="font-size:12px;
                            letter-spacing:4px;color:#d9c4a5">
                            HOTEL RESERVATION
                        </div>
                        <h1 style="font-size:25px;
                            margin:18px 0 0">
                            {Safe(title)}
                        </h1>
                    </div>
                    <div style="padding:32px 28px">
                        <p style="font-size:16px">
                            Xin chào <strong>{Safe(greeting)}</strong>,
                        </p>
                        <p style="line-height:1.8;color:#655b52">
                            {Safe(description)}
                        </p>
                        <table style="width:100%;
                            border-collapse:collapse;
                            font-size:14px;
                            background:#faf8f5">
                            {rows}
                        </table>
                        <p style="margin-top:26px;
                            line-height:1.8;color:#655b52">
                            {Safe(footer)}
                        </p>
                        <p style="margin-top:28px;
                            font-size:14px">
                            Trân trọng,<br>
                            <strong>Bộ phận Chăm sóc Khách hàng</strong>
                        </p>
                    </div>
                    <div style="padding:18px;
                        background:#f5f2ed;text-align:center;
                        font-size:12px;color:#8c8074">
                        Email được gửi tự động từ hệ thống đặt phòng.
                    </div>
                </div>
            </body>
            </html>
            """;
    }

    private async Task SendAsync(
        string recipient,
        string subject,
        string html)
    {
        string username =
            _config["EmailSettings:Username"]
            ?? _config["Email:SmtpUser"]
            ?? "";

        string password =
            _config["EmailSettings:AppPassword"]
            ?? _config["Email:SmtpAppPassword"]
            ?? "";

        string host =
            _config["EmailSettings:Host"]
            ?? "smtp.gmail.com";

        int port = int.TryParse(
            _config["EmailSettings:Port"],
            out int configuredPort)
            ? configuredPort
            : 587;

        string fromName =
            _config["EmailSettings:FromName"]
            ?? "Hotel Customer Support";

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình Gmail SMTP.");
        }

        if (!MailAddress.TryCreate(recipient, out var address))
        {
            throw new ArgumentException(
                "Email khách hàng không hợp lệ.");
        }

        using var message = new MailMessage();

        message.From = new MailAddress(username, fromName);
        message.To.Add(address);
        message.Subject = subject;
        message.Body = html;
        message.IsBodyHtml = true;

        using var smtp = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(
                username,
                password.Replace(" ", "")),
            EnableSsl = true,
            UseDefaultCredentials = false,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 30000
        };

        await smtp.SendMailAsync(message);

        _logger.LogInformation(
            "Đã gửi email thông báo: {Subject}",
            subject);
    }

    public Task SendDepositSuccessAsync(
        string email,
        string customerName,
        int bookingId,
        DateOnly checkIn,
        DateOnly checkOut,
        decimal total,
        decimal deposit,
        string transactionReference)
    {
        string rows =
            Row("Mã đặt phòng", bookingId.ToString()) +
            Row("Ngày nhận phòng", checkIn.ToString("dd/MM/yyyy")) +
            Row("Ngày trả phòng", checkOut.ToString("dd/MM/yyyy")) +
            Row("Tổng tiền phòng", Money(total)) +
            Row("Tiền cọc đã thanh toán", Money(deposit)) +
            Row("Số tiền phòng còn lại", Money(Math.Max(0, total - deposit))) +
            Row("Mã giao dịch", transactionReference);

        string html = Layout(
            "Thanh toán cọc thành công",
            customerName,
            "Hệ thống đã xác nhận thanh toán tiền cọc cho đơn đặt phòng của quý khách.",
            rows,
            "Cảm ơn quý khách đã lựa chọn dịch vụ của chúng tôi. Hẹn gặp quý khách trong kỳ lưu trú sắp tới.");

        return SendAsync(
            email,
            $"Xác nhận thanh toán cọc - Đơn #{bookingId}",
            html);
    }

    public Task SendRefundApprovedAsync(
        string email,
        string customerName,
        int bookingId,
        decimal deposit,
        decimal refundRate,
        decimal refundAmount)
    {
        string rows =
            Row("Mã đặt phòng", bookingId.ToString()) +
            Row("Tổng tiền cọc", Money(deposit)) +
            Row("Tỷ lệ hoàn", refundRate.ToString("0.##") + "%") +
            Row("Số tiền được duyệt hoàn", Money(refundAmount)) +
            Row("Trạng thái", refundAmount > 0
                ? "Đang chờ hoàn tiền"
                : "Không phát sinh khoản hoàn");

        string html = Layout(
            "Thông báo xử lý hủy phòng",
            customerName,
            "Yêu cầu hủy phòng của quý khách đã được phê duyệt.",
            rows,
            "Nếu có khoản tiền được hoàn, khách sạn sẽ tiếp tục xử lý theo phương thức hoàn tiền phù hợp.");

        return SendAsync(
            email,
            $"Thông báo duyệt hủy phòng - Đơn #{bookingId}",
            html);
    }

    public Task SendRefundSuccessAsync(
        string email,
        string customerName,
        int bookingId,
        decimal refundAmount,
        string paymentMethod,
        string transactionReference,
        DateTime refundedAt)
    {
        string rows =
            Row("Mã đặt phòng", bookingId.ToString()) +
            Row("Số tiền hoàn", Money(refundAmount)) +
            Row("Phương thức hoàn", paymentMethod) +
            Row("Mã giao dịch hoàn", transactionReference) +
            Row("Ngày ghi nhận", refundedAt.ToString("dd/MM/yyyy HH:mm")) +
            Row("Trạng thái", "Đã ghi nhận hoàn cọc");

        string html = Layout(
            "Xác nhận hoàn cọc",
            customerName,
            "Hệ thống đã ghi nhận giao dịch hoàn cọc của quý khách.",
            rows,
            "Nếu chưa nhận được tiền, quý khách vui lòng kiểm tra với đơn vị thanh toán hoặc liên hệ bộ phận hỗ trợ.");

        return SendAsync(
            email,
            $"Xác nhận hoàn cọc - Đơn #{bookingId}",
            html);
    }
}
