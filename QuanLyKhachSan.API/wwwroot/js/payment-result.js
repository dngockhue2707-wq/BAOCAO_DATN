
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const card = document.getElementById("paymentResultCard");
    const icon = document.getElementById("paymentResultIcon");
    const title = document.getElementById("paymentTitle");
    const description = document.getElementById("paymentDescription");
    const bookingId = document.getElementById("paymentBookingId");
    const amount = document.getElementById("paymentAmount");
    const status = document.getElementById("paymentStatus");
    const checkButton = document.getElementById("checkPayment");

    if (!card || !checkButton) return;

    const query = new URLSearchParams(window.location.search);
    const reference = query.get("vnp_TxnRef");

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    function displayResult(state, heading, detail, symbol) {
        card.dataset.state = state;
        title.textContent = heading;
        description.textContent = detail;
        icon.textContent = symbol;
    }

    function displayStatus(paymentStatus) {
        status.textContent = paymentStatus || "Chưa xác định";

        if (
            paymentStatus === "Thành công" ||
            paymentStatus === "Đã thanh toán"
        ) {
            displayResult(
                "success",
                "Đặt cọc thành công!",
                "DNK Hotel đã ghi nhận khoản tiền cọc. " +
                "Bạn có thể xem trạng thái đơn trong tài khoản.",
                "✓"
            );
            return;
        }

        if (paymentStatus === "Thất bại") {
            displayResult(
                "failed",
                "Thanh toán không thành công",
                "Giao dịch được hệ thống ghi nhận là thất bại. " +
                "Nếu tài khoản đã bị trừ tiền, vui lòng liên hệ " +
                "khách sạn để đối soát.",
                "!"
            );
            return;
        }

        displayResult(
            "checking",
            "Chưa xác nhận thanh toán",
            "Giao dịch đang chờ xử lý hoặc đối soát. " +
            "Nếu đã thanh toán trên VNPay, đừng thanh toán lại " +
            "trước khi xác minh kết quả.",
            "…"
        );
    }

    async function fetchStatus() {
        const response = await fetch(
            "/api/vnpay/status?reference=" +
                encodeURIComponent(reference),
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            throw new Error(
                "Phiên đăng nhập không hợp lệ. " +
                "Vui lòng đăng nhập lại trên localhost."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Tài khoản không có quyền xem giao dịch này."
            );
        }

        const data = await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Không lấy được trạng thái (HTTP ${response.status}).`
            );
        }

        return data;
    }

    async function confirmSignedReturn() {
        // Chỉ gửi các tham số VNPay.
        // Không tự suy đoán giao dịch thành công từ URL.
        if (
            !query.has("vnp_SecureHash") ||
            !query.has("vnp_TxnRef")
        ) {
            return {
                attempted: false,
                message: ""
            };
        }

        const tokenResponse = await fetch(
            "/api/account/csrf-token",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!tokenResponse.ok) {
            throw new Error(
                "Không lấy được mã bảo vệ để kiểm tra giao dịch."
            );
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.csrfToken) {
            throw new Error(
                "Mã bảo vệ giao dịch không hợp lệ."
            );
        }

        const values = {};

        for (const [key, value] of query.entries()) {
            if (key.startsWith("vnp_")) {
                values[key] = value;
            }
        }

        const response = await fetch(
            "/api/vnpay/confirm-return",
            {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": tokenData.csrfToken
                },
                body: JSON.stringify(values)
            }
        );

        const data = await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
            return {
                attempted: true,
                message:
                    data.message ||
                    `Không thể xác minh Return (HTTP ${response.status}).`
            };
        }

        return {
            attempted: true,
            message: data.message || ""
        };
    }

    let checking = false;

    async function checkPaymentStatus() {
        if (checking) return;

        if (!reference) {
            checkButton.disabled = true;
            bookingId.textContent = "Chưa xác định";
            amount.textContent = "Chưa xác định";
            status.textContent = "Không có mã giao dịch";

            displayResult(
                "failed",
                "Không tìm thấy mã giao dịch",
                "Trang chưa nhận được mã giao dịch từ VNPay.",
                "!"
            );
            return;
        }

        checking = true;
        checkButton.disabled = true;
        checkButton.textContent = "Đang kiểm tra...";

        displayResult(
            "checking",
            "Đang kiểm tra giao dịch...",
            "Hệ thống đang xác minh và đọc trạng thái thanh toán.",
            "…"
        );

        try {
            // Doc SQL truoc: neu IPN da xac nhan,
            // khong can xu ly Return them.
            let data = await fetchStatus();

            if (
                data.status !== "Thành công" &&
                data.status !== "Đã thanh toán" &&
                data.status === "Chờ thanh toán"
            ) {
                const result = await confirmSignedReturn();

                // Doc lai trang thai sau khi backend xu ly.
                data = await fetchStatus();

                if (
                    data.status === "Chờ thanh toán" &&
                    result.message
                ) {
                    bookingId.textContent =
                        data.bookingId != null
                            ? "#" + data.bookingId
                            : "Chưa xác định";

                    amount.textContent =
                        data.amount != null
                            ? money(data.amount)
                            : "Chưa xác định";

                    displayStatus(data.status);

                    description.textContent =
                        result.message +
                        " Nếu đã bị trừ tiền, vui lòng " +
                        "liên hệ khách sạn để đối soát.";

                    return;
                }
            }

            bookingId.textContent =
                data.bookingId != null
                    ? "#" + data.bookingId
                    : "Chưa xác định";

            amount.textContent =
                data.amount != null
                    ? money(data.amount)
                    : "Chưa xác định";

            displayStatus(data.status);

        } catch (error) {
            status.textContent = "Chưa xác minh được";

            displayResult(
                "checking",
                "Chưa thể xác minh giao dịch",
                error.message ||
                    "Không kết nối được đến hệ thống DNK Hotel.",
                "?"
            );

        } finally {
            checking = false;
            checkButton.disabled = false;
            checkButton.textContent = "Kiểm tra lại trạng thái";
        }
    }

    checkButton.addEventListener(
        "click",
        checkPaymentStatus
    );

    checkPaymentStatus();
});
