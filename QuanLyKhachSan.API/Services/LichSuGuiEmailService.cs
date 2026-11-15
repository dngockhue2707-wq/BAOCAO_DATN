
using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace QuanLyKhachSan.API.Services;

public sealed class LichSuGuiEmailService
{
    private readonly string _connectionString;
    private readonly ILogger<LichSuGuiEmailService> _logger;

    public LichSuGuiEmailService(
        IConfiguration configuration,
        ILogger<LichSuGuiEmailService> logger)
    {
        _connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Chưa cấu hình kết nối SQL Server.");

        _logger = logger;
    }

    public async Task<bool> GuiMotLanAsync(
        string maSuKien,
        string loaiThongBao,
        int maDatPhong,
        string emailNguoiNhan,
        string tieuDe,
        Func<Task> guiEmail)
    {
        if (string.IsNullOrWhiteSpace(maSuKien) ||
            maSuKien.Length > 200 ||
            string.IsNullOrWhiteSpace(loaiThongBao) ||
            loaiThongBao.Length > 50 ||
            maDatPhong <= 0 ||
            string.IsNullOrWhiteSpace(emailNguoiNhan) ||
            emailNguoiNhan.Length > 150 ||
            string.IsNullOrWhiteSpace(tieuDe) ||
            tieuDe.Length > 250)
        {
            _logger.LogWarning(
                "Thông tin gửi email không hợp lệ.");

            return false;
        }

        try
        {
            await using var connection =
                new SqlConnection(_connectionString);

            await connection.OpenAsync();

            await using (var transaction =
                (SqlTransaction)await connection.BeginTransactionAsync(
                    IsolationLevel.Serializable))
            {
                string? trangThai = null;
                DateTime? thoiHanXuLy = null;

                await using (var check =
                    new SqlCommand(
                        """
                        SELECT TrangThai, ThoiHanXuLy
                        FROM dbo.LichSuGuiEmail
                            WITH (UPDLOCK, HOLDLOCK)
                        WHERE MaSuKien = @MaSuKien
                        """,
                        connection,
                        transaction))
                {
                    check.Parameters.Add(
                        "@MaSuKien",
                        SqlDbType.NVarChar,
                        200).Value = maSuKien;

                    await using var reader =
                        await check.ExecuteReaderAsync();

                    if (await reader.ReadAsync())
                    {
                        trangThai = reader.GetString(0);

                        if (!reader.IsDBNull(1))
                            thoiHanXuLy = reader.GetDateTime(1);
                    }
                }

                if (trangThai == "Đã gửi" ||
                    (trangThai == "Đang gửi" &&
                     thoiHanXuLy.HasValue &&
                     thoiHanXuLy.Value > DateTime.UtcNow))
                {
                    await transaction.CommitAsync();
                    return false;
                }

                if (trangThai == null)
                {
                    await using var insert =
                        new SqlCommand(
                            """
                            INSERT INTO dbo.LichSuGuiEmail
                            (
                                MaSuKien,
                                LoaiThongBao,
                                MaDatPhong,
                                EmailNguoiNhan,
                                TieuDeEmail,
                                TrangThai,
                                SoLanThu,
                                NgayTao,
                                LanThuCuoi,
                                ThoiHanXuLy
                            )
                            VALUES
                            (
                                @MaSuKien,
                                @LoaiThongBao,
                                @MaDatPhong,
                                @EmailNguoiNhan,
                                @TieuDeEmail,
                                N'Đang gửi',
                                1,
                                SYSUTCDATETIME(),
                                SYSUTCDATETIME(),
                                DATEADD(MINUTE, 2, SYSUTCDATETIME())
                            )
                            """,
                            connection,
                            transaction);

                    insert.Parameters.AddWithValue(
                        "@MaSuKien", maSuKien);

                    insert.Parameters.AddWithValue(
                        "@LoaiThongBao", loaiThongBao);

                    insert.Parameters.AddWithValue(
                        "@MaDatPhong", maDatPhong);

                    insert.Parameters.AddWithValue(
                        "@EmailNguoiNhan", emailNguoiNhan);

                    insert.Parameters.AddWithValue(
                        "@TieuDeEmail", tieuDe);

                    await insert.ExecuteNonQueryAsync();
                }
                else
                {
                    await using var update =
                        new SqlCommand(
                            """
                            UPDATE dbo.LichSuGuiEmail
                            SET TrangThai = N'Đang gửi',
                                SoLanThu = SoLanThu + 1,
                                LanThuCuoi = SYSUTCDATETIME(),
                                ThoiHanXuLy =
                                    DATEADD(MINUTE, 2, SYSUTCDATETIME()),
                                LoiCuoi = NULL
                            WHERE MaSuKien = @MaSuKien
                            """,
                            connection,
                            transaction);

                    update.Parameters.AddWithValue(
                        "@MaSuKien", maSuKien);

                    await update.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
            }

            bool guiThanhCong = false;
            string? loi = null;

            try
            {
                await guiEmail();
                guiThanhCong = true;
            }
            catch (Exception ex)
            {
                loi = ex.Message;

                _logger.LogError(
                    ex,
                    "Gửi email thất bại: {MaSuKien}",
                    maSuKien);
            }

            await using (var update =
                new SqlCommand(
                    """
                    UPDATE dbo.LichSuGuiEmail
                    SET TrangThai = @TrangThai,
                        NgayGuiThanhCong =
                            CASE
                                WHEN @ThanhCong = 1
                                THEN SYSUTCDATETIME()
                                ELSE NgayGuiThanhCong
                            END,
                        ThoiHanXuLy = NULL,
                        LoiCuoi = @LoiCuoi
                    WHERE MaSuKien = @MaSuKien
                      AND TrangThai = N'Đang gửi'
                    """,
                    connection))
            {
                update.Parameters.AddWithValue(
                    "@MaSuKien", maSuKien);

                update.Parameters.AddWithValue(
                    "@TrangThai",
                    guiThanhCong ? "Đã gửi" : "Gửi lỗi");

                update.Parameters.AddWithValue(
                    "@ThanhCong", guiThanhCong);

                update.Parameters.Add(
                    "@LoiCuoi",
                    SqlDbType.NVarChar,
                    1000).Value =
                    loi == null
                        ? DBNull.Value
                        : loi.Length > 1000
                            ? loi[..1000]
                            : loi;

                await update.ExecuteNonQueryAsync();
            }

            return guiThanhCong;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể xử lý lịch sử gửi email: {MaSuKien}",
                maSuKien);

            return false;
        }
    }
}
