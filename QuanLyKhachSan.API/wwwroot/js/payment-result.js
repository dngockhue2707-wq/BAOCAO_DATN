
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const title = document.getElementById("paymentTitle");
    const description = document.getElementById("paymentDescription");
    const amount = document.getElementById("paymentAmount");
    const button = document.getElementById("checkPayment");

    const params = new URLSearchParams(location.search);
    const reference = params.get("vnp_TxnRef") || "";

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value || 0);

    async function check() {
        if (!reference || !/^DNK[A-F0-9]{32}$/.test(reference)) {
            title.textContent = "Không tìm thấy mã giao dịch";
            description.textContent = "Vui lòng quay lại trang đặt cọc.";
            button.disabled = true;
            return;
        }

        button.disabled = true;
        title.textContent = "Đang kiểm tra...";
        description.textContent = "";

        try {
            const response = await fetch(
                `/api/vnpay/status?reference=${encodeURIComponent(reference)}`,
                { credentials: "same-origin", cache: "no-store" }
            );

            if (response.status === 401) {
                title.textContent = "Vui lòng đăng nhập";
                description.textContent =
                    "Đăng nhập tài khoản đã đặt phòng để xem giao dịch.";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không thể kiểm tra giao dịch."
                );
            }

            amount.textContent = `Số tiền cọc: ${money(data.amount)}`;

            if (
                data.status === "Thành công" ||
                data.status === "Đã thanh toán"
            ) {
                title.textContent = "Thanh toán thành công";
                description.textContent =
                    `Đơn đặt phòng #${data.bookingId} đã được xác nhận đặt cọc.`;
            } else if (data.status === "Chờ thanh toán") {
                title.textContent = "Đang chờ xác nhận VNPay";
                description.textContent =
                    "Hệ thống chưa nhận được thông báo xác nhận thanh toán. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ nếu đã bị trừ tiền.";
            } else {
                title.textContent = "Trạng thái: " + data.status;
                description.textContent =
                    "Vui lòng kiểm tra giao dịch trước khi thử thanh toán lại.";
            }
        } catch (error) {
            title.textContent = "Không thể kiểm tra";
            description.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    }

    button.addEventListener("click", check);
    check();
});
