
using System;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;

namespace QuanLyKhachSan.API.Services;

public sealed class CancellationEmailMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CancellationEmailMiddleware> _logger;

    public CancellationEmailMiddleware(
        RequestDelegate next,
        ILogger<CancellationEmailMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        HotelDbContext db,
        BookingEmailService email,
        LichSuGuiEmailService history)
    {
        await _next(context);

        if (!HttpMethods.IsPost(context.Request.Method) ||
            context.Response.StatusCode != 200)
        {
            return;
        }

        string path = context.Request.Path.Value ?? "";

        try
        {
            var approveMatch = Regex.Match(
                path,
                @"^/api/cancellations/(\d+)/approve/?$",
                RegexOptions.IgnoreCase |
                RegexOptions.CultureInvariant);

            if (approveMatch.Success)
            {
                int requestId = int.Parse(
                    approveMatch.Groups[1].Value);

                await SendApprovedAsync(
                    requestId, db, email, history);

                return;
            }

            var refundMatch = Regex.Match(
                path,
                @"^/api/cancellations/refunds/(\d+)/confirm/?$",
                RegexOptions.IgnoreCase |
                RegexOptions.CultureInvariant);

            if (refundMatch.Success)
            {
                int refundId = int.Parse(
                    refundMatch.Groups[1].Value);

                await SendRefundAsync(
                    refundId, db, email, history);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể xử lý email thông báo hoàn cọc.");
        }
    }

    private static bool ValidEmail(string? value)
    {
        return !string.IsNullOrWhiteSpace(value) &&
               MailAddress.TryCreate(value, out _);
    }

    private async Task SendApprovedAsync(
        int requestId,
        HotelDbContext db,
        BookingEmailService email,
        LichSuGuiEmailService history)
    {
        var information = await (
            from request in db.YeuCauHuyPhongs.AsNoTracking()
            join booking in db.DatPhongs.AsNoTracking()
                on request.MaDatPhong equals booking.MaDatPhong
            join customer in db.KhachHangs.AsNoTracking()
                on booking.MaKhachHang equals customer.MaKhachHang
            join account in db.TaiKhoans.AsNoTracking()
                on customer.MaTaiKhoan equals
                    (int?)account.MaTaiKhoan into accounts
            from account in accounts.DefaultIfEmpty()
            where request.MaYeuCau == requestId &&
                  request.TrangThai == "Đã duyệt" &&
                  booking.TrangThai == "Đã hủy"
            select new
            {
                request.MaYeuCau,
                request.MaDatPhong,
                request.TongTienCoc,
                request.TyLeHoan,
                request.SoTienDuKienHoan,
                customer.HoTen,
                CustomerEmail = customer.Email,
                AccountEmail = account == null
                    ? null
                    : account.Email
            }
        ).FirstOrDefaultAsync();

        if (information == null)
            return;

        string recipient = information.CustomerEmail?.Trim() ?? "";

        if (!ValidEmail(recipient))
            recipient = information.AccountEmail?.Trim() ?? "";

        if (!ValidEmail(recipient))
        {
            _logger.LogWarning(
                "Không có email hợp lệ cho yêu cầu {RequestId}.",
                requestId);

            return;
        }

        string eventKey = $"DUYET_HOAN:{requestId}";

        await history.GuiMotLanAsync(
            eventKey,
            "Duyệt hoàn cọc",
            information.MaDatPhong,
            recipient,
            $"Thông báo duyệt hủy phòng - Đơn #{information.MaDatPhong}",
            () => email.SendRefundApprovedAsync(
                recipient,
                information.HoTen,
                information.MaDatPhong,
                information.TongTienCoc,
                information.TyLeHoan,
                information.SoTienDuKienHoan
            )
        );
    }

    private async Task SendRefundAsync(
        int refundId,
        HotelDbContext db,
        BookingEmailService email,
        LichSuGuiEmailService history)
    {
        var information = await (
            from refund in db.HoanCocs.AsNoTracking()
            join request in db.YeuCauHuyPhongs.AsNoTracking()
                on refund.MaYeuCau equals request.MaYeuCau
            join booking in db.DatPhongs.AsNoTracking()
                on request.MaDatPhong equals booking.MaDatPhong
            join customer in db.KhachHangs.AsNoTracking()
                on booking.MaKhachHang equals customer.MaKhachHang
            join account in db.TaiKhoans.AsNoTracking()
                on customer.MaTaiKhoan equals
                    (int?)account.MaTaiKhoan into accounts
            from account in accounts.DefaultIfEmpty()
            where refund.MaHoanCoc == refundId &&
                  refund.TrangThai == "Đã hoàn" &&
                  request.TrangThai == "Đã duyệt" &&
                  refund.NgayHoan != null
            select new
            {
                refund.MaHoanCoc,
                request.MaDatPhong,
                refund.SoTienHoan,
                refund.PhuongThuc,
                refund.MaGiaoDichHoan,
                refund.NgayHoan,
                customer.HoTen,
                CustomerEmail = customer.Email,
                AccountEmail = account == null
                    ? null
                    : account.Email
            }
        ).FirstOrDefaultAsync();

        if (information == null ||
            !information.NgayHoan.HasValue)
        {
            return;
        }

        string recipient = information.CustomerEmail?.Trim() ?? "";

        if (!ValidEmail(recipient))
            recipient = information.AccountEmail?.Trim() ?? "";

        if (!ValidEmail(recipient))
        {
            _logger.LogWarning(
                "Không có email hợp lệ cho hoàn cọc {RefundId}.",
                refundId);

            return;
        }

        string eventKey = $"HOAN_COC:{refundId}";

        await history.GuiMotLanAsync(
            eventKey,
            "Hoàn cọc thành công",
            information.MaDatPhong,
            recipient,
            $"Xác nhận hoàn cọc - Đơn #{information.MaDatPhong}",
            () => email.SendRefundSuccessAsync(
                recipient,
                information.HoTen,
                information.MaDatPhong,
                information.SoTienHoan,
                information.PhuongThuc ?? "",
                information.MaGiaoDichHoan ?? "",
                information.NgayHoan.Value
            )
        );
    }
}
