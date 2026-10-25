
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("myBookingsList");
    const filter = document.getElementById("statusFilter");
    const message = document.getElementById("bookingsMessage");

    let bookings = [];

    const money = number =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(number);

    const formatDate = date =>
        new Date(date).toLocaleDateString("vi-VN");

    function element(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = String(text);
        return el;
    }

    async function cancelBooking(id) {
        if (!confirm("Bạn chắc chắn muốn hủy đơn đặt phòng này?")) {
            return;
        }

        try {
            const tokenResponse =
                await fetch("/api/account/csrf-token");

            const { csrfToken } = await tokenResponse.json();

            const response = await fetch(
                `/api/bookings/${id}/cancel`,
                {
                    method: "POST",
                    headers: { "X-CSRF-TOKEN": csrfToken },
                    credentials: "same-origin"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không thể hủy đơn.");
            }

            await loadBookings();
        } catch (error) {
            message.textContent = error.message;
        }
    }

    function render() {
        list.replaceChildren();

        const filtered = bookings.filter(item =>
            filter.value === "all" ||
            item.status === filter.value
        );

        if (filtered.length === 0) {
            list.appendChild(
                element("p", "", "Chưa có đơn đặt phòng phù hợp.")
            );
            return;
        }

        filtered.forEach(booking => {
            const card = element("article", "my-booking-card");
            const top = element("div", "my-booking-top");

            top.appendChild(
                element(
                    "h2",
                    "",
                    `${booking.roomName} · #${booking.bookingId}`
                )
            );

            top.appendChild(
                element("span", "my-booking-status", booking.status)
            );

            const info = element("div", "my-booking-info");

            const fields = [
                ["Số phòng", booking.roomNumber],
                ["Ngày nhận", formatDate(booking.checkIn)],
                ["Ngày trả", formatDate(booking.checkOut)],
                ["Người lớn", booking.adults],
                ["Trẻ em", booking.children],
                ["Ngày đặt", formatDate(booking.bookedAt)]
            ];

            fields.forEach(([label, value]) => {
                const box = element("div");
                box.appendChild(element("span", "", label));
                box.appendChild(element("strong", "", value));
                info.appendChild(box);
            });

            const bottom = element("div", "my-booking-bottom");
            bottom.appendChild(
                element("strong", "", money(booking.total))
            );

            if (booking.status === "Chờ xác nhận" &&
                new Date(booking.checkIn) > new Date()) {
                const cancel = element(
                    "button", "cancel-booking", "Hủy đặt phòng"
                );
                cancel.type = "button";
                cancel.addEventListener(
                    "click",
                    () => cancelBooking(booking.bookingId)
                );
                bottom.appendChild(cancel);
            }

            card.append(top, info, bottom);
            list.appendChild(card);
        });
    }

    async function loadBookings() {
        message.textContent = "Đang tải đơn đặt phòng...";

        try {
            const response = await fetch("/api/bookings/mine");

            if (response.status === 401) {
                location.href = "/login.html";
                return;
            }

            if (response.status === 403) {
                throw new Error(
                    "Trang này dành cho tài khoản khách hàng."
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không thể tải đơn.");
            }

            bookings = data.bookings || [];
            message.textContent = "";
            render();
        } catch (error) {
            message.textContent = error.message;
        }
    }

    filter.addEventListener("change", render);
    loadBookings();
});
