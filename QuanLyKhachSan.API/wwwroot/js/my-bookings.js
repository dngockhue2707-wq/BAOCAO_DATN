
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("myBookingsList");
    const filter = document.getElementById("statusFilter");
    const message = document.getElementById("bookingsMessage");

    if (!list || !filter || !message) return;

    let bookings = [];
    let deposits = new Map();
    let busy = false;

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    function dateOnly(value) {
        return String(value || "").slice(0, 10);
    }

    function formatDate(value) {
        const date = dateOnly(value);
        if (!date) return "Chưa cập nhật";

        const parts = date.split("-");
        return parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : date;
    }

    function today() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function element(tag, className = "", value) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (value !== undefined) node.textContent = String(value);
        return node;
    }

    function show(text, error = false) {
        message.textContent = text;
        message.classList.toggle("error", error);
    }

    async function jsonRequest(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền thực hiện thao tác này.");
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.title ||
                `Yêu cầu không thành công (${response.status}).`
            );
        }

        return data;
    }

    async function csrfToken() {
        const data = await jsonRequest("/api/account/csrf-token");

        if (!data.csrfToken) {
            throw new Error("Không lấy được mã bảo vệ biểu mẫu.");
        }

        return data.csrfToken;
    }

    async function runAction(action) {
        if (busy) return;
        busy = true;

        try {
            await action();
        } catch (error) {
            show(error.message || "Không thể xử lý yêu cầu.", true);
        } finally {
            busy = false;
        }
    }

    async function cancelBooking(id) {
        if (!confirm("Bạn chắc chắn muốn hủy đơn đặt phòng này?")) {
            return;
        }

        await runAction(async () => {
            show("Đang xử lý hủy đặt phòng...");

            const token = await csrfToken();

            const result = await jsonRequest(
                `/api/bookings/${id}/cancel`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRF-TOKEN": token
                    }
                }
            );

            await loadBookings();
            show(result.message || "Đã hủy đặt phòng.");
        });
    }

    async function payDeposit(id) {
        if (!confirm("Chuyển đến VNPay để thanh toán tiền đặt cọc?")) {
            return;
        }

        await runAction(async () => {
            show("Đang tạo yêu cầu thanh toán VNPay...");

            const token = await csrfToken();

            const result = await jsonRequest(
                "/api/vnpay/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token
                    },
                    body: JSON.stringify({
                        bookingId: id
                    })
                }
            );

            if (!result.paymentUrl) {
                throw new Error("VNPay chưa trả về đường dẫn thanh toán.");
            }

            const url = new URL(result.paymentUrl);

            if (url.protocol !== "https:") {
                throw new Error("Đường dẫn thanh toán không an toàn.");
            }

            location.assign(url.href);
        });
    }

    function makeButton(text, className, action) {
        const button = element("button", className, text);
        button.type = "button";
        button.addEventListener("click", action);
        return button;
    }

    function render() {
        list.replaceChildren();

        const filtered = bookings.filter(b =>
            filter.value === "all" ||
            filter.value === b.status
        );

        if (!filtered.length) {
            list.appendChild(element(
                "p",
                "",
                "Chưa có đơn đặt phòng phù hợp."
            ));
            return;
        }

        filtered.forEach(b => {
            const payment = deposits.get(b.bookingId);
            const card = element("article", "my-booking-card");
            const top = element("div", "my-booking-top");

            top.append(
                element("h2", "", `${b.roomName} · #${b.bookingId}`),
                element("span", "my-booking-status", b.status)
            );

            const info = element("div", "my-booking-info");

            const fields = [
                ["Số phòng", b.roomNumber],
                ["Ngày nhận", formatDate(b.checkIn)],
                ["Ngày trả", formatDate(b.checkOut)],
                ["Người lớn", b.adults],
                ["Trẻ em", b.children],
                ["Ngày đặt", formatDate(b.bookedAt)]
            ];

            fields.forEach(([label, value]) => {
                const box = element("div");
                box.append(
                    element("span", "", label),
                    element("strong", "", value)
                );
                info.appendChild(box);
            });

            const bottom = element("div", "my-booking-bottom");
            const totalBox = element("div");

            totalBox.appendChild(element(
                "strong",
                "",
                money(b.total)
            ));

            if (payment) {
                const status = payment.hasPaid
                    ? "Đã thanh toán tiền cọc"
                    : payment.pending
                        ? "Đang chờ thanh toán"
                        : payment.lastStatus || "Chưa đặt cọc";

                totalBox.appendChild(element(
                    "p",
                    "booking-deposit-status",
                    `Tiền cọc: ${money(payment.depositAmount)} – ${status}`
                ));
            }

            bottom.appendChild(totalBox);

            const actions = element("div", "booking-card-actions");

            const active = [
                "Chờ xác nhận",
                "Đã xác nhận"
            ].includes(b.status);

            const future = dateOnly(b.checkIn) > today();
            const paid = payment?.hasPaid === true;
            const pending = payment?.pending === true;

            if (active && !paid && !pending &&
                dateOnly(b.checkIn) >= today()) {
                actions.appendChild(makeButton(
                    "Thanh toán cọc VNPay",
                    "booking-pay-button",
                    () => payDeposit(b.bookingId)
                ));
            }

            if (active && future && !paid && !pending) {
                actions.appendChild(makeButton(
                    "Hủy đặt phòng",
                    "cancel-booking",
                    () => cancelBooking(b.bookingId)
                ));
            }

            if (actions.childElementCount) {
                bottom.appendChild(actions);
            }

            card.append(top, info, bottom);
            list.appendChild(card);
        });
    }

    async function loadBookings() {
        show("Đang tải đơn đặt phòng...");

        try {
            const [bookingData, paymentData] = await Promise.all([
                jsonRequest("/api/bookings/mine"),
                jsonRequest("/api/vnpay/bookings")
            ]);

            bookings = bookingData.bookings || [];

            deposits = new Map(
                (paymentData.bookings || []).map(item => [
                    item.bookingId,
                    item
                ])
            );

            show("");
            render();
        } catch (error) {
            show(error.message || "Không tải được đơn đặt phòng.", true);
        }
    }

    filter.addEventListener("change", render);

    const refresh = document.getElementById("refreshBookings");
    refresh?.addEventListener("click", loadBookings);

    loadBookings();
});
