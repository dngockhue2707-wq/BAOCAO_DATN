
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("depositList");
    const message = document.getElementById("depositMessage");
    const reload = document.getElementById("reloadDeposits");

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value || 0);

    const node = (tag, className, text) => {
        const item = document.createElement(tag);
        if (className) item.className = className;
        if (text !== undefined) item.textContent = text;
        return item;
    };

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        if (!response.ok) {
            throw new Error(
                data.message || `Không thể xử lý (${response.status}).`
            );
        }

        return data;
    }

    function date(value) {
        if (!value) return "—";
        const part = String(value).slice(0, 10).split("-");
        return part.length === 3
            ? `${part[2]}/${part[1]}/${part[0]}`
            : String(value);
    }

    async function pay(booking, button) {
        button.disabled = true;
        message.textContent = "Đang tạo giao dịch VNPay...";

        try {
            const csrf = await api("/api/account/csrf-token");

            const result = await api("/api/vnpay/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf.csrfToken
                },
                body: JSON.stringify({
                    bookingId: booking.bookingId
                })
            });

            if (!result.paymentUrl ||
                !result.paymentUrl.startsWith(
                    "https://sandbox.vnpayment.vn/")) {
                throw new Error(
                    "Địa chỉ thanh toán không hợp lệ."
                );
            }

            window.location.assign(result.paymentUrl);
        } catch (error) {
            message.textContent = error.message;
            button.disabled = false;
        }
    }

    function addLine(parent, label, value) {
        const row = node("div", "deposit-row");
        row.append(
            node("span", "", label),
            node("strong", "", String(value))
        );
        parent.append(row);
    }

    function render(booking) {
        const card = node("article", "deposit-card");

        card.append(
            node("h3", "", `Đơn đặt phòng #${booking.bookingId}`)
        );

        addLine(card, "Nhận phòng", date(booking.checkIn));
        addLine(card, "Trả phòng", date(booking.checkOut));
        addLine(card, "Trạng thái đơn", booking.bookingStatus);
        addLine(card, "Tổng tiền phòng", money(booking.roomTotal));
        addLine(card, "Tiền đặt cọc (30%)", money(booking.depositAmount));

        if (booking.hasPaid) {
            card.append(
                node("p", "deposit-paid", "Đã thanh toán tiền cọc")
            );
        } else if (booking.pending) {
            card.append(
                node(
                    "p",
                    "deposit-pending",
                    "Đang chờ kết quả giao dịch VNPay"
                )
            );
        } else if (
            ["Chờ xác nhận", "Đã xác nhận"]
                .includes(booking.bookingStatus) &&
            booking.depositAmount >= 5000
        ) {
            const button = node(
                "button",
                "deposit-pay",
                `Thanh toán ${money(booking.depositAmount)} qua VNPay`
            );

            button.type = "button";
            button.addEventListener("click", () =>
                pay(booking, button)
            );

            card.append(button);
        } else {
            card.append(
                node(
                    "p",
                    "deposit-pending",
                    "Đơn hiện không đủ điều kiện đặt cọc."
                )
            );
        }

        return card;
    }

    async function load() {
        message.textContent = "Đang tải đơn đặt phòng...";
        list.replaceChildren();

        try {
            const data = await api("/api/vnpay/bookings");
            const bookings = data.bookings || [];

            if (!bookings.length) {
                message.textContent =
                    "Bạn chưa có đơn đặt phòng. Hãy đặt phòng trước.";
                return;
            }

            bookings.forEach(booking =>
                list.append(render(booking))
            );

            message.textContent = "";
        } catch (error) {
            message.textContent = error.message;
        }
    }

    reload.addEventListener("click", load);
    load();
});
