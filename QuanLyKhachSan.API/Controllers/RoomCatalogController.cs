
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace QuanLyKhachSan.API.Controllers
{
    [ApiController]
    [Route("api/room-catalog")]
    public class RoomCatalogController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public RoomCatalogController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetRoomCatalog()
        {
            var connectionString =
                _configuration.GetConnectionString("DefaultConnection")
                ?? _configuration.GetConnectionString("DefaultConnectionString");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Chưa cấu hình kết nối SQL Server."
                });
            }

            const string sql = @"
                SELECT
                    lp.MaLoaiPhong,
                    lp.TenLoaiPhong,
                    lp.MoTa AS MoTaLoaiPhong,
                    lp.GiaCoBan,
                    p.MaPhong,
                    p.SoPhong,
                    p.Tang,
                    p.TrangThai,
                    p.MoTa AS MoTaPhong
                FROM dbo.LoaiPhong AS lp
                LEFT JOIN dbo.Phong AS p
                    ON p.MaLoaiPhong = lp.MaLoaiPhong
                ORDER BY lp.MaLoaiPhong, p.Tang, p.SoPhong;
            ";

            try
            {
                var danhSach = new List<RoomTypeCatalogDto>();
                var lookup = new Dictionary<int, RoomTypeCatalogDto>();

                await using var connection =
                    new SqlConnection(connectionString);

                await connection.OpenAsync();

                await using var command =
                    new SqlCommand(sql, connection);

                await using var reader =
                    await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var maLoaiPhong =
                        Convert.ToInt32(reader["MaLoaiPhong"]);

                    if (!lookup.TryGetValue(maLoaiPhong, out var loaiPhong))
                    {
                        loaiPhong = new RoomTypeCatalogDto
                        {
                            MaLoaiPhong = maLoaiPhong,
                            TenLoaiPhong =
                                Convert.ToString(reader["TenLoaiPhong"])
                                ?? "",
                            MoTa = reader["MoTaLoaiPhong"] == DBNull.Value
                                ? null
                                : Convert.ToString(reader["MoTaLoaiPhong"]),
                            GiaCoBan = reader["GiaCoBan"] == DBNull.Value
                                ? null
                                : Convert.ToDecimal(reader["GiaCoBan"])
                        };

                        lookup.Add(maLoaiPhong, loaiPhong);
                        danhSach.Add(loaiPhong);
                    }

                    if (reader["MaPhong"] != DBNull.Value)
                    {
                        loaiPhong.Phong.Add(new RoomCatalogItemDto
                        {
                            MaPhong =
                                Convert.ToInt32(reader["MaPhong"]),
                            SoPhong =
                                Convert.ToString(reader["SoPhong"])
                                ?? "",
                            Tang = reader["Tang"] == DBNull.Value
                                ? null
                                : Convert.ToInt32(reader["Tang"]),
                            TrangThai = reader["TrangThai"] == DBNull.Value
                                ? null
                                : Convert.ToString(reader["TrangThai"]),
                            MoTa = reader["MoTaPhong"] == DBNull.Value
                                ? null
                                : Convert.ToString(reader["MoTaPhong"])
                        });
                    }
                }

                return Ok(new
                {
                    success = true,
                    tongLoaiPhong = danhSach.Count,
                    tongPhong = danhSach.Sum(x => x.Phong.Count),
                    danhSach
                });
            }
            catch (SqlException)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Không thể đọc danh sách phòng từ SQL Server."
                });
            }
        }

        public class RoomTypeCatalogDto
        {
            public int MaLoaiPhong { get; set; }
            public string TenLoaiPhong { get; set; } = "";
            public string? MoTa { get; set; }
            public decimal? GiaCoBan { get; set; }
            public List<RoomCatalogItemDto> Phong { get; set; } = new();
        }

        public class RoomCatalogItemDto
        {
            public int MaPhong { get; set; }
            public string SoPhong { get; set; } = "";
            public int? Tang { get; set; }
            public string? TrangThai { get; set; }
            public string? MoTa { get; set; }
        }
    }
}
