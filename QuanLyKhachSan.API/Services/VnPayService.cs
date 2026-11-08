
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace QuanLyKhachSan.API.Services;

public class VnPayService
{
    private readonly IConfiguration _config;

    public VnPayService(IConfiguration config)
    {
        _config = config;
    }

    private string Required(string key)
    {
        return _config[$"VnPay:{key}"]
            ?? throw new InvalidOperationException(
                $"Thiếu cấu hình VnPay:{key}");
    }

    private static string Encode(string value)
    {
        return WebUtility.UrlEncode(value);
    }

    private static string QueryString(
        IEnumerable<KeyValuePair<string, string>> values)
    {
        return string.Join("&", values
            .Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(x => $"{Encode(x.Key)}={Encode(x.Value)}"));
    }

    private string Sign(string data)
    {
        using var hmac = new HMACSHA512(
            Encoding.UTF8.GetBytes(Required("HashSecret")));

        return Convert.ToHexString(
            hmac.ComputeHash(Encoding.UTF8.GetBytes(data)))
            .ToLowerInvariant();
    }

    public string CreateUrl(
        string reference,
        long amount,
        string ip)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(
            "SE Asia Standard Time");

        var now = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow, zone);

        string baseUrl = Required("PublicBaseUrl").TrimEnd('/');

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri)
            || uri.Scheme != "https")
            throw new InvalidOperationException(
                "PublicBaseUrl phải là địa chỉ HTTPS hợp lệ.");

        string returnUrl = _config["VnPay:ReturnUrl"]
            ?? baseUrl + "/payment-result.html";

        if (!Uri.TryCreate(
                returnUrl,
                UriKind.Absolute,
                out var returnUri) ||
            (returnUri.Scheme != Uri.UriSchemeHttps &&
            !(returnUri.IsLoopback &&
            returnUri.Scheme == Uri.UriSchemeHttp)))
        {
            throw new InvalidOperationException(
                "VnPay:ReturnUrl phải là HTTPS hoặc HTTP localhost."
            );
        }

        var values = new SortedDictionary<string, string>(
            StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = Required("TmnCode"),
            ["vnp_Amount"] = checked(amount * 100)
                .ToString(CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = reference,
            ["vnp_OrderInfo"] = $"Dat coc DNK Hotel {reference}",
            ["vnp_OrderType"] = "other",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_IpAddr"] = ip,
            ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss"),
            ["vnp_ExpireDate"] = now.AddMinutes(15)
                .ToString("yyyyMMddHHmmss")
        };

        string query = QueryString(values);
        string hash = Sign(query);

        return Required("PaymentUrl").TrimEnd('?') +
            "?" + query + "&vnp_SecureHash=" + hash;
    }

    public bool Verify(IQueryCollection query)
    {
        string received = query["vnp_SecureHash"].ToString();

        if (received.Length != 128 ||
            !received.All(Uri.IsHexDigit))
            return false;

        var values = new SortedDictionary<string, string>(
            StringComparer.Ordinal);

        foreach (var item in query)
        {
            if (!item.Key.StartsWith("vnp_", StringComparison.Ordinal))
                continue;

            if (item.Key == "vnp_SecureHash" ||
                item.Key == "vnp_SecureHashType")
                continue;

            values[item.Key] = item.Value.ToString();
        }

        string expected = Sign(QueryString(values));

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(received.ToLowerInvariant()),
            Encoding.ASCII.GetBytes(expected));
    }

    public bool ValidMerchant(IQueryCollection query)
    {
        return query["vnp_TmnCode"].ToString() ==
            Required("TmnCode");
    }
}
