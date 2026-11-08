
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/recommendations")]
[Authorize(Roles = "Customer")]
public class RecommendationController : ControllerBase
{
    private readonly HotelDbContext _db;

    private static readonly string[] BlockingStatuses =
    {
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đã đặt cọc",
        "Đã nhận phòng"
    };

    private const decimal ContentBasedRatio = 0.50m;
    private const decimal WeightedScoringRatio = 0.50m;

    public RecommendationController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet("mine")]
    public Task<IActionResult> Mine(
        [FromQuery] DateTime? checkIn,
        [FromQuery] DateTime? checkOut,
        [FromQuery] int top = 5)
    {
        return Recommend(checkIn, checkOut, top, false);
    }

    [HttpPost("mine/save")]
    public Task<IActionResult> SaveMine(
        [FromQuery] DateTime? checkIn,
        [FromQuery] DateTime? checkOut,
        [FromQuery] int top = 5)
    {
        return Recommend(checkIn, checkOut, top, true);
    }

    private async Task<IActionResult> Recommend(
        DateTime? checkIn,
        DateTime? checkOut,
        int top,
        bool save)
    {
        if (!int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int accountId))
        {
            return Unauthorized();
        }

        int? customerId = await _db.KhachHangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId)
            .Select(x => (int?)x.MaKhachHang)
            .FirstOrDefaultAsync();

        if (!customerId.HasValue)
        {
            return NotFound(new
            {
                message = "Không tìm thấy hồ sơ khách hàng."
            });
        }

        DateTime start =
            (checkIn ?? DateTime.Today.AddDays(1)).Date;

        DateTime end =
            (checkOut ?? start.AddDays(1)).Date;

        int nights = (end - start).Days;

        if (start < DateTime.Today ||
            nights < 1 ||
            nights > 30)
        {
            return BadRequest(new
            {
                message = "Ngày lưu trú phải hợp lệ (1–30 đêm)."
            });
        }

        top = Math.Clamp(top, 1, 10);

        DateOnly fromDate =
            DateOnly.FromDateTime(start);

        DateOnly toDate =
            DateOnly.FromDateTime(end);

        // 1. LẤY HỒ SƠ SỞ THÍCH

        var profile = await _db.HoSoSoThiches
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.MaKhachHang == customerId.Value
            );

        Dictionary<int, int> preferredAmenities = new();

        if (profile != null)
        {
            preferredAmenities = await _db.SoThichTienNghis
                .AsNoTracking()
                .Where(x => x.MaHoSo == profile.MaHoSo)
                .ToDictionaryAsync(
                    x => x.MaTienNghi,
                    x => x.MucDoUuTien
                );
        }

        // 2. LẤY LỊCH SỬ TƯƠNG TÁC

        var interactions = await _db.LichSuTuongTacs
            .AsNoTracking()
            .Where(x => x.MaKhachHang == customerId.Value)
            .Select(x => new
            {
                x.MaLoaiPhong,
                x.LoaiTuongTac,
                x.MucDoQuanTam
            })
            .ToListAsync();

        Dictionary<int, decimal> history = interactions
            .GroupBy(x => x.MaLoaiPhong)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(x =>
                {
                    decimal factor = x.LoaiTuongTac switch
                    {
                        "Đặt phòng" => 1.5m,
                        "Chọn phòng" => 1.2m,
                        "Xem phòng" => 1.0m,
                        _ => 0.5m
                    };

                    return Math.Max(
                        0m,
                        x.MucDoQuanTam ?? 0m
                    ) * factor;
                })
            );

        decimal maxHistory = history.Count > 0
            ? history.Values.Max()
            : 0m;

        // 3. ĐỌC TRỌNG SỐ TỪ SQL

        var configs = await _db.TieuChiGoiYs
            .AsNoTracking()
            .Where(x => x.TrangThai)
            .ToListAsync();

        string[] required =
        {
            "Ngân sách",
            "Sức chứa",
            "Tiện nghi",
            "Diện tích",
            "Đánh giá"
        };

        var weights = new Dictionary<string, decimal>(
            StringComparer.OrdinalIgnoreCase
        );

        foreach (var config in configs)
        {
            string name = config.TenTieuChi.Trim();

            if (weights.ContainsKey(name))
            {
                return Conflict(new
                {
                    message = $"Trùng tiêu chí gợi ý: {name}."
                });
            }

            weights[name] = config.TrongSo;
        }

        if (weights.Count != required.Length ||
            required.Any(
                name => !weights.ContainsKey(name)
            ) ||
            weights.Values.Any(w => w < 0m) ||
            Math.Abs(weights.Values.Sum() - 1m) > 0.0001m)
        {
            return StatusCode(503, new
            {
                message =
                    "Cấu hình TieuChiGoiY chưa hợp lệ. " +
                    "Cần đúng 5 tiêu chí và tổng trọng số bằng 1."
            });
        }

        // 4. LẤY THÔNG TIN LOẠI PHÒNG

        var roomTypes = await _db.LoaiPhongs
            .AsNoTracking()
            .Include(x => x.MaTienNghis)
            .Where(x => x.TrangThai)
            .ToListAsync();

        // 5. LẤY ĐÁNH GIÁ

        var ratings = await _db.DanhGia
            .AsNoTracking()
            .Where(x =>
                x.TrangThai &&
                x.SoSao >= 1 &&
                x.SoSao <= 5
            )
            .GroupBy(x => x.MaLoaiPhong)
            .Select(g => new
            {
                RoomTypeId = g.Key,
                AverageStars = g.Average(
                    x => (double)x.SoSao
                )
            })
            .ToDictionaryAsync(
                x => x.RoomTypeId,
                x => x.AverageStars
            );

        // 6. KIỂM TRA PHÒNG KHẢ DỤNG

        var busyRoomIds =
            from detail in _db.ChiTietDatPhongs
            join booking in _db.DatPhongs
                on detail.MaDatPhong equals booking.MaDatPhong
            where BlockingStatuses.Contains(booking.TrangThai)
                  && booking.NgayNhanPhong < toDate
                  && booking.NgayTraPhong > fromDate
            select detail.MaPhong;

        var availableRooms = await _db.Phongs
            .AsNoTracking()
            .Where(x =>
                x.TrangThai == "Trống" &&
                !busyRoomIds.Contains(x.MaPhong)
            )
            .Select(x => new
            {
                x.MaPhong,
                x.MaLoaiPhong
            })
            .ToListAsync();

        var availableCounts = availableRooms
            .GroupBy(x => x.MaLoaiPhong)
            .ToDictionary(
                g => g.Key,
                g => g.Count()
            );

        // 7. XÂY DỰNG VECTOR CONTENT-BASED

        Dictionary<string, double> userVector = new();

        if (profile?.MaLoaiPhongUuTien is int preferredType)
        {
            userVector[$"type:{preferredType}"] = 2.0;
        }

        if (maxHistory > 0)
        {
            foreach (var entry in history)
            {
                string key = $"type:{entry.Key}";

                double previous =
                    userVector.GetValueOrDefault(key);

                userVector[key] =
                    previous +
                    (double)(entry.Value / maxHistory);
            }
        }

        foreach (var entry in preferredAmenities
            .Where(x => x.Value > 0))
        {
            userVector[$"amenity:{entry.Key}"] =
                Math.Min(entry.Value, 5) / 5.0;
        }

        // 8. TÍNH ĐIỂM GỢI Ý

        List<RoomRecommendation> candidates = new();

        foreach (var roomType in roomTypes)
        {
            if (!availableCounts.TryGetValue(
                roomType.MaLoaiPhong,
                out int count))
            {
                continue;
            }

            // KIỂM TRA SỨC CHỨA

            if (profile?.SoNguoiMongMuon is int people &&
                people > 0 &&
                roomType.SucChuaNguoiLon < people)
            {
                continue;
            }

            // KIỂM TRA DIỆN TÍCH

            if (profile?.DienTichToiThieu is decimal minArea &&
                (!roomType.DienTich.HasValue ||
                 roomType.DienTich.Value < minArea))
            {
                continue;
            }

            decimal totalPrice =
                roomType.GiaCoBan * nights;

            List<string> reasons = new();

            // A. CONTENT-BASED - COSINE SIMILARITY

            var roomVector =
                new Dictionary<string, double>();

            foreach (var feature in userVector.Keys)
            {
                bool matched;

                if (feature.StartsWith(
                    "type:",
                    StringComparison.Ordinal))
                {
                    matched =
                        feature ==
                        $"type:{roomType.MaLoaiPhong}";
                }
                else if (
                    feature.StartsWith(
                        "amenity:",
                        StringComparison.Ordinal
                    ) &&
                    int.TryParse(
                        feature.Substring(
                            "amenity:".Length
                        ),
                        out int amenityId
                    ))
                {
                    matched = roomType.MaTienNghis.Any(
                        x => x.MaTienNghi == amenityId
                    );
                }
                else
                {
                    matched = false;
                }

                roomVector[feature] =
                    matched ? 1.0 : 0.0;
            }

            decimal contentBased =
                CosineSimilarity(
                    userVector,
                    roomVector
                );

            if (userVector.Count == 0)
            {
                contentBased = 0.5m;
            }

            // B. WEIGHTED SCORING

            // B1. NGÂN SÁCH

            decimal budgetScore = 0.5m;

            decimal? minBudget =
                profile?.NganSachToiThieu;

            decimal? maxBudget =
                profile?.NganSachToiDa;

            if (minBudget.HasValue ||
                maxBudget.HasValue)
            {
                bool inRange =
                    (!minBudget.HasValue ||
                     totalPrice >= minBudget.Value)
                    &&
                    (!maxBudget.HasValue ||
                     totalPrice <= maxBudget.Value);

                if (inRange)
                {
                    budgetScore = 1m;

                    reasons.Add(
                        "Phù hợp ngân sách lưu trú"
                    );
                }
                else if (
                    maxBudget is > 0m &&
                    totalPrice > maxBudget.Value)
                {
                    budgetScore = Math.Clamp(
                        maxBudget.Value / totalPrice,
                        0m,
                        0.8m
                    );
                }
                else
                {
                    budgetScore = 0.6m;
                }
            }

            // B2. SỨC CHỨA

            decimal capacityScore =
                profile?.SoNguoiMongMuon is int guests &&
                guests > 0
                    ? (roomType.SucChuaNguoiLon >= guests
                        ? 1m
                        : 0m)
                    : 0.5m;

            // B3. TIỆN NGHI

            decimal amenityScore = 0.5m;

            if (preferredAmenities.Count > 0)
            {
                int totalPriority = preferredAmenities
                    .Values
                    .Where(v => v > 0)
                    .Sum();

                int matchedPriority = roomType
                    .MaTienNghis
                    .Where(a =>
                        preferredAmenities.ContainsKey(
                            a.MaTienNghi
                        )
                    )
                    .Sum(a => Math.Max(
                        0,
                        preferredAmenities[a.MaTienNghi]
                    ));

                amenityScore = totalPriority > 0
                    ? Math.Clamp(
                        (decimal)matchedPriority /
                        totalPriority,
                        0m,
                        1m
                    )
                    : 0.5m;

                if (matchedPriority > 0)
                {
                    reasons.Add(
                        $"Đáp ứng {matchedPriority}/{totalPriority} " +
                        "điểm ưu tiên tiện nghi"
                    );
                }
            }

            // B4. DIỆN TÍCH

            decimal areaScore = 0.5m;

            if (profile?.DienTichToiThieu is decimal requestedArea &&
                requestedArea > 0)
            {
                areaScore = roomType.DienTich.HasValue
                    ? Math.Clamp(
                        roomType.DienTich.Value /
                        requestedArea,
                        0m,
                        1m
                    )
                    : 0m;
            }

            // B5. ĐÁNH GIÁ

            decimal ratingScore = 0.5m;

            if (ratings.TryGetValue(
                roomType.MaLoaiPhong,
                out double avgStars))
            {
                decimal stars = (decimal)avgStars;

                ratingScore =
                    profile?.MucDanhGiaMongMuon is decimal desired &&
                    desired > 0
                        ? Math.Clamp(
                            stars / desired,
                            0m,
                            1m
                        )
                        : Math.Clamp(
                            stars / 5m,
                            0m,
                            1m
                        );
            }

            // C. TỔNG ĐIỂM WEIGHTED SCORING

            decimal weighted =
                budgetScore * weights["Ngân sách"] +
                capacityScore * weights["Sức chứa"] +
                amenityScore * weights["Tiện nghi"] +
                areaScore * weights["Diện tích"] +
                ratingScore * weights["Đánh giá"];

            // D. KẾT HỢP CONTENT-BASED VÀ WEIGHTED SCORING

            decimal final =
                ContentBasedRatio * contentBased +
                WeightedScoringRatio * weighted;

            if (profile?.MaLoaiPhongUuTien ==
                roomType.MaLoaiPhong)
            {
                reasons.Add(
                    "Đúng loại phòng yêu thích"
                );
            }

            if (history.GetValueOrDefault(
                roomType.MaLoaiPhong) > 0)
            {
                reasons.Add(
                    "Phù hợp lịch sử quan tâm của bạn"
                );
            }

            if (reasons.Count == 0)
            {
                reasons.Add(
                    "Có phòng phù hợp trong thời gian đã chọn"
                );
            }

            // E. TẠO KẾT QUẢ GỢI Ý

            candidates.Add(new RoomRecommendation
            {
                RoomTypeId = roomType.MaLoaiPhong,
                RoomName = roomType.TenLoaiPhong,

                PricePerNight = roomType.GiaCoBan,
                TotalPrice = totalPrice,

                Area = roomType.DienTich ?? 0m,

                AdultsCapacity =
                    roomType.SucChuaNguoiLon,

                ChildrenCapacity =
                    roomType.SucChuaTreEm,

                AvailableRoomCount = count,

                ContentBasedScore = Math.Round(
                    contentBased * 100m,
                    2
                ),

                WeightedScoringScore = Math.Round(
                    weighted * 100m,
                    2
                ),

                Score = Math.Round(
                    final * 100m,
                    2
                ),

                BudgetScore = Math.Round(
                    budgetScore * 100m,
                    2
                ),

                RoomTypeScore = Math.Round(
                    profile?.MaLoaiPhongUuTien is int t
                        ? (t == roomType.MaLoaiPhong
                            ? 100m
                            : 30m)
                        : 50m,
                    2
                ),

                AmenityScore = Math.Round(
                    amenityScore * 100m,
                    2
                ),

                HistoryScore = Math.Round(
                    maxHistory > 0
                        ? history.GetValueOrDefault(
                            roomType.MaLoaiPhong
                        ) / maxHistory * 100m
                        : 50m,
                    2
                ),

                CapacityScore = Math.Round(
                    capacityScore * 100m,
                    2
                ),

                AreaScore = Math.Round(
                    areaScore * 100m,
                    2
                ),

                RatingScore = Math.Round(
                    ratingScore * 100m,
                    2
                ),

                Reasons = reasons
            });
        }

        // 9. XẾP HẠNG TOP-N

        var ranked = candidates
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.TotalPrice)
            .Take(top)
            .ToList();

        for (int i = 0; i < ranked.Count; i++)
        {
            ranked[i].Rank = i + 1;
        }

        // 10. LƯU KẾT QUẢ GỢI Ý NẾU GỌI POST

        long? recommendationRunId = null;

        if (save)
        {
            var run = new LanGoiY
            {
                MaKhachHang = customerId.Value,
                NgayNhanPhong = fromDate,
                NgayTraPhong = toDate,
                SoNguoi = profile?.SoNguoiMongMuon,
                ThoiGianGoiY = DateTime.Now
            };

            foreach (var item in ranked)
            {
                run.KetQuaGoiYs.Add(new KetQuaGoiY
                {
                    MaLoaiPhong = item.RoomTypeId,

                    DiemContentBased =
                        item.ContentBasedScore / 100m,

                    DiemWeightedScoring =
                        item.WeightedScoringScore / 100m,

                    DiemPhuHop =
                        item.Score / 100m,

                    ThuHang = item.Rank
                });
            }

            _db.LanGoiYs.Add(run);

            await _db.SaveChangesAsync();

            recommendationRunId = run.MaLanGoiY;
        }

        // 11. TRẢ KẾT QUẢ VỀ FRONTEND

        return Ok(new
        {
            success = true,
            checkIn = fromDate,
            checkOut = toDate,
            nights,

            hasPreferences = profile != null,

            totalCandidates = candidates.Count,

            saved = save,

            recommendationRunId,

            combination = new
            {
                contentBased = ContentBasedRatio,
                weightedScoring = WeightedScoringRatio
            },

            weights,

            recommendations = ranked
        });
    }

    // HÀM TÍNH COSINE SIMILARITY

    private static decimal CosineSimilarity(
        IReadOnlyDictionary<string, double> left,
        IReadOnlyDictionary<string, double> right)
    {
        if (left.Count == 0)
        {
            return 0m;
        }

        double dot = 0;
        double leftSquare = 0;
        double rightSquare = 0;

        foreach (var item in left)
        {
            double other =
                right.GetValueOrDefault(item.Key);

            dot += item.Value * other;

            leftSquare +=
                item.Value * item.Value;

            rightSquare +=
                other * other;
        }

        if (leftSquare <= 0 ||
            rightSquare <= 0)
        {
            return 0m;
        }

        return Math.Clamp(
            (decimal)(
                dot /
                Math.Sqrt(
                    leftSquare * rightSquare
                )
            ),
            0m,
            1m
        );
    }
}

public class RoomRecommendation
{
    public int RoomTypeId { get; set; }

    public string RoomName { get; set; } = "";

    public decimal PricePerNight { get; set; }

    public decimal TotalPrice { get; set; }

    public decimal Area { get; set; }

    public int AdultsCapacity { get; set; }

    public int ChildrenCapacity { get; set; }

    public int AvailableRoomCount { get; set; }

    public int Rank { get; set; }

    public decimal Score { get; set; }

    public decimal ContentBasedScore { get; set; }

    public decimal WeightedScoringScore { get; set; }

    public decimal BudgetScore { get; set; }

    public decimal RoomTypeScore { get; set; }

    public decimal AmenityScore { get; set; }

    public decimal HistoryScore { get; set; }

    public decimal CapacityScore { get; set; }

    public decimal AreaScore { get; set; }

    public decimal RatingScore { get; set; }

    public List<string> Reasons { get; set; } = new();
}
