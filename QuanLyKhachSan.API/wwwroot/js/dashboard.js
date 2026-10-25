
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const message = document.getElementById("dashboardMessage");
    const roomsBody = document.getElementById("dashboardRooms");
    const bookingsBody = document.getElementById("dashboardBookings");

    let currentRole = "";

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(value);

    const date = value =>
        new Date(value).toLocaleDateString("vi-VN");

    function make(tag, text, className = "") {
        const el = document.createElement(tag);
        el.textContent = String(text);
        if (className) el.className = className;
        return el;
    }

    function cell(row, value) {
        const td = document.createElement("td");
        if (value instanceof Node) {
            td.appendChild(value);
        } else {
            td.textContent = String(value);
        }
        row.appendChild(td);
        return td;
    }

    async function getCsrfToken() {
        const response = await fetch("/api/account/csrf-token");
        if (!response.ok) throw new Error("Không lấy được mã bảo vệ.");

        const data = await response.json();
        return data.csrfToken;
    }

    async function sendUpdate(url, body) {
        const csrfToken = await getCsrfToken();

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken
            },
            credentials: "same-origin",
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Cập nhật thất bại.");
        }

        return result;
    }

    async function loadSummary() {
        const response = await fetch("/api/management/summary");
        if (!response.ok) throw new Error("Không tải được thống kê.");

        const data = await response.json();

        ["totalRooms", "availableRooms",
         "pendingBookings", "totalCustomers"].forEach(key => {
            document.getElementById(key).textContent = data[key];
        });
    }

    async function loadRooms() {
        const response = await fetch("/api/management/rooms");
        if (!response.ok) throw new Error("Không tải được danh sách phòng.");

        const data = await response.json();
        roomsBody.replaceChildren();

        const statuses = [
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        ];

        data.rooms.forEach(room => {
            const tr = document.createElement("tr");

            cell(tr, room.number);
            cell(tr, room.floor);
            cell(tr, room.roomType);

            const select = document.createElement("select");

            statuses.forEach(status => {
                const option = new Option(status, status);
                select.add(option);
            });

            select.value = room.status;
            select.disabled = currentRole !== "Admin";

            cell(tr, select);

            if (currentRole === "Admin") {
                const save = make("button", "Lưu", "dashboard-action");

                save.addEventListener("click", async () => {
                    save.disabled = true;

                    try {
                        const result = await sendUpdate(
                            `/api/management/rooms/${room.id}/status`,
                            { status: select.value }
                        );

                        message.textContent = result.message;
                        await loadSummary();
                        await loadRooms();
                    } catch (error) {
                        message.textContent = error.message;
                        save.disabled = false;
                    }
                });

                cell(tr, save);
            } else {
                cell(tr, "Chỉ quản trị viên được sửa");
            }

            roomsBody.appendChild(tr);
        });
    }

    async function loadBookings() {
        const response = await fetch("/api/management/bookings");
        if (!response.ok) throw new Error("Không tải được đơn đặt phòng.");

        const data = await response.json();
        bookingsBody.replaceChildren();

        data.bookings.forEach(booking => {
            const tr = document.createElement("tr");

            cell(tr, `#${booking.id}`);
            cell(tr, booking.customer);
            cell(tr, `${booking.roomType} · ${booking.roomNumber}`);
            cell(
                tr,
                `${date(booking.checkIn)} – ${date(booking.checkOut)}`
            );
            cell(tr, money(booking.total));
            cell(tr, booking.status);

            if (booking.status === "Chờ xác nhận" &&
                new Date(booking.checkIn) >=
                new Date(new Date().toDateString())) {
                const actions = document.createElement("div");
                actions.className = "dashboard-actions";

                [
                    ["Xác nhận", "Đã xác nhận"],
                    ["Hủy", "Đã hủy"]
                ].forEach(([label, status]) => {
                    const button = make(
                        "button",
                        label,
                        status === "Đã hủy"
                            ? "dashboard-action secondary"
                            : "dashboard-action"
                    );

                    button.addEventListener("click", async () => {
                        if (!confirm(
                            `Chuyển đơn #${booking.id} sang "${status}"?`
                        )) return;

                        button.disabled = true;

                        try {
                            const result = await sendUpdate(
                                `/api/management/bookings/${booking.id}/status`,
                                { status }
                            );

                            message.textContent = result.message;
                            await loadSummary();
                            await loadBookings();
                        } catch (error) {
                            message.textContent = error.message;
                            button.disabled = false;
                        }
                    });

                    actions.appendChild(button);
                });

                cell(tr, actions);
            } else {
                cell(tr, make("span", "—", "dashboard-muted"));
            }

            bookingsBody.appendChild(tr);
        });
    }

    async function loadDashboard() {
        message.textContent = "Đang tải dữ liệu...";

        try {
            const authResponse =
                await fetch("/api/account/profile");

            if (authResponse.status === 401) {
                location.href = "/login.html";
                return;
            }

            if (!authResponse.ok) {
                throw new Error("Không thể xác minh quyền truy cập.");
            }

            const user = await authResponse.json();
            currentRole = user.role;

            if (!["Admin", "Staff"].includes(currentRole)) {
                message.textContent =
                    "Trang này chỉ dành cho quản trị viên và nhân viên.";
                return;
            }

            await Promise.all([
                loadSummary(),
                loadRooms(),
                loadBookings()
            ]);

            message.textContent = "";

        } catch (error) {
            message.textContent = error.message;
        }
    }

    document.getElementById("refreshDashboard")
        .addEventListener("click", loadDashboard);

    loadDashboard();
});
