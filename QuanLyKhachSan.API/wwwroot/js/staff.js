
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body.dataset.page;
    const root = document.getElementById("staffApp");

    const pages = {
        dashboard: "Tổng quan lễ tân",
        bookings: "Quản lý đặt phòng",
        "check-in-out": "Nhận và trả phòng"
    };

    function el(tag, text = "", className = "") {
        const node = document.createElement(tag);
        node.textContent = String(text);
        if (className) node.className = className;
        return node;
    }

    function makeButton(label, callback) {
        const node = el("button", label, "staff-action");
        node.type = "button";
        node.addEventListener("click", callback);
        return node;
    }

    function makeCard(label, value) {
        const card = el("article", "", "staff-card");
        card.append(el("span", label), el("strong", value));
        return card;
    }

    function makeTable(headers, data) {
        const wrapper = el("div", "", "staff-table-wrap");
        const table = el("table", "", "staff-table");

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");

        headers.forEach(label => {
            headRow.appendChild(el("th", label));
        });

        thead.appendChild(headRow);

        const tbody = document.createElement("tbody");

        data.forEach(values => {
            const tr = document.createElement("tr");

            values.forEach(value => {
                const td = document.createElement("td");

                if (value instanceof Node) {
                    td.appendChild(value);
                } else {
                    td.textContent = String(value ?? "—");
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        if (data.length === 0) {
            const tr = document.createElement("tr");
            const td = el("td", "Chưa có dữ liệu.");
            td.colSpan = headers.length;
            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        table.append(thead, tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    const date = value =>
        new Date(value).toLocaleDateString("vi-VN");

    async function request(path, options = {}) {
        const response = await fetch(`/api/staff/${path}`, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Thao tác thất bại.");
        }

        return data;
    }

    async function getToken() {
        const response = await fetch("/api/account/csrf-token");

        if (!response.ok) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        const data = await response.json();
        return data.csrfToken;
    }

    async function post(path) {
        const token = await getToken();

        return request(path, {
            method: "POST",
            headers: {
                "X-CSRF-TOKEN": token
            }
        });
    }

    // KHUNG GIAO DIỆN STAFF
    const shell = el("div", "", "staff-shell");
    const sidebar = el("aside", "", "staff-sidebar");
    sidebar.appendChild(el("div", "DNK HOTEL", "staff-brand"));

    const nav = el("nav", "", "staff-nav");

    Object.entries(pages).forEach(([key, title]) => {
        const link = el("a", title);
        link.href = `/staff/${key}.html`;

        if (key === page) {
            link.classList.add("active");
        }

        nav.appendChild(link);
    });

    sidebar.appendChild(nav);

    const logout = el("button", "Đăng xuất", "staff-logout");

    logout.addEventListener("click", async () => {
        try {
            const token = await getToken();

            const response = await fetch("/api/account/logout", {
                method: "POST",
                headers: { "X-CSRF-TOKEN": token },
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Đăng xuất thất bại.");
            }

            location.href = "/login.html";
        } catch (error) {
            alert(error.message);
        }
    });

    sidebar.appendChild(logout);

    const main = el("main", "", "staff-main");
    const heading = el("div", "", "staff-heading");

    heading.append(
        el("span", "DNK HOTEL · NHÂN VIÊN"),
        el("h1", pages[page] || "Lễ tân"),
        el("p", "Hệ thống hỗ trợ nghiệp vụ khách sạn.")
    );

    const message = el("p", "", "staff-message");
    message.setAttribute("role", "status");

    const content = document.createElement("div");

    main.append(heading, message, content);
    shell.append(sidebar, main);
    root.appendChild(shell);

    function notify(value) {
        message.textContent = value;
    }

    try {
        const response = await fetch("/api/account/profile");

        if (response.status === 401) {
            location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Không xác định được tài khoản.");
        }

        const user = await response.json();

        if (user.role !== "Staff") {
            notify("Tài khoản không có quyền truy cập Staff.");
            return;
        }
    } catch (error) {
        notify(error.message);
        return;
    }

    async function loadDashboard() {
        const data = await request("dashboard");
        const cards = el("section", "", "staff-cards");

        [
            ["Đơn chờ xác nhận", data.pending],
            ["Dự kiến nhận hôm nay", data.arrivalsToday],
            ["Đang lưu trú", data.checkedIn],
            ["Phòng đang dọn", data.cleaning]
        ].forEach(([label, value]) => {
            cards.appendChild(makeCard(label, value));
        });

        const panel = el("section", "", "staff-panel");
        panel.appendChild(el("h2", "Công việc lễ tân"));

        const links = [
            ["Xử lý đặt phòng", "/staff/bookings.html"],
            ["Nhận / trả phòng", "/staff/check-in-out.html"]
        ];

        links.forEach(([title, href]) => {
            const link = el("a", title, "staff-action");
            link.href = href;
            link.style.display = "inline-block";
            link.style.marginRight = "12px";
            link.style.textDecoration = "none";
            panel.appendChild(link);
        });

        content.replaceChildren(cards, panel);
    }

    async function loadBookings() {
        const data = await request("bookings");
        const panel = el("section", "", "staff-panel");

        panel.appendChild(el("h2", "Danh sách đặt phòng"));

        const rows = data.items.map(booking => {
            const actions = el("div", "", "staff-actions");

            if (booking.status === "Chờ xác nhận") {
                actions.appendChild(makeButton(
                    "Xác nhận",
                    async () => {
                        if (!confirm(
                            `Xác nhận đơn #${booking.id}?`
                        )) return;

                        try {
                            const result = await post(
                                `bookings/${booking.id}/confirm`
                            );

                            notify(result.message);
                            await loadBookings();
                        } catch (error) {
                            notify(error.message);
                        }
                    }
                ));
            } else {
                actions.textContent = "—";
            }

            return [
                `#${booking.id}`,
                booking.customer,
                `${booking.roomType} · ${booking.roomNumber}`,
                `${date(booking.checkIn)} – ${date(booking.checkOut)}`,
                booking.status,
                actions
            ];
        });

        panel.appendChild(makeTable(
            ["Mã đơn", "Khách hàng", "Phòng",
             "Ngày lưu trú", "Trạng thái", "Thao tác"],
            rows
        ));

        content.replaceChildren(panel);
    }

    async function loadCheckInOut() {
        const data = await request("bookings");
        const panel = el("section", "", "staff-panel");

        panel.appendChild(el("h2", "Thủ tục nhận / trả phòng"));

        const filtered = data.items.filter(item =>
            ["Đã xác nhận", "Đã đặt cọc",
             "Đã nhận phòng"].includes(item.status)
        );

        const rows = filtered.map(booking => {
            const actions = el("div", "", "staff-actions");

            if (["Đã xác nhận", "Đã đặt cọc"]
                .includes(booking.status)) {
                const checkIn = makeButton(
                    "Nhận phòng",
                    async () => {
                        if (!confirm(
                            `Xác nhận nhận phòng cho đơn #${booking.id}?`
                        )) return;

                        checkIn.disabled = true;

                        try {
                            const result = await post(
                                `bookings/${booking.id}/check-in`
                            );

                            notify(result.message);
                            await loadCheckInOut();
                        } catch (error) {
                            notify(error.message);
                            checkIn.disabled = false;
                        }
                    }
                );

                actions.appendChild(checkIn);
            }

            if (booking.status === "Đã nhận phòng") {
                const checkOut = makeButton(
                    "Trả phòng",
                    async () => {
                        if (!confirm(
                            `Hoàn tất trả phòng đơn #${booking.id}?`
                        )) return;

                        checkOut.disabled = true;

                        try {
                            const result = await post(
                                `bookings/${booking.id}/check-out`
                            );

                            notify(result.message);
                            await loadCheckInOut();
                        } catch (error) {
                            notify(error.message);
                            checkOut.disabled = false;
                        }
                    }
                );

                actions.appendChild(checkOut);
            }

            return [
                `#${booking.id}`,
                booking.customer,
                booking.roomNumber,
                date(booking.checkIn),
                date(booking.checkOut),
                booking.status,
                actions
            ];
        });

        panel.appendChild(makeTable(
            ["Mã", "Khách hàng", "Số phòng",
             "Ngày nhận", "Ngày trả", "Trạng thái", "Thao tác"],
            rows
        ));

        content.replaceChildren(panel);
    }

    try {
        notify("Đang tải dữ liệu...");

        const loaders = {
            dashboard: loadDashboard,
            bookings: loadBookings,
            "check-in-out": loadCheckInOut
        };

        if (!loaders[page]) {
            throw new Error("Không tìm thấy trang.");
        }

        await loaders[page]();
        notify("");

    } catch (error) {
        notify(error.message);
    }
});
