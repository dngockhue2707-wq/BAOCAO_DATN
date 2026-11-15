
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const number = value =>
        new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

    const dateText = value => {
        if (!value) return "—";

        const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateOnly) {
            return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
        }

        const d = new Date(value);
        return Number.isNaN(d.getTime())
            ? String(value)
            : d.toLocaleDateString("vi-VN");
    };

    const icons = {
        bed: '<path d="M3 18v-7m18 7v-7M3 15h18M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 11h18v7H3zM7 11V9h4v2m2 0V9h4v2"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3m-3 3h6"/>',
        users: '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4.2a4 4 0 0 1 0 7.6M22 20v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
        building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-5h6v5M8 7h2m4 0h2M8 11h2m4 0h2"/>',
        coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 11v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5"/>',
        chart: '<path d="M4 20V11h4v9M10 20V7h4v13M16 20V3h4v17M2 20h20"/>',
        bell: '<path d="M4 17h16M6 17v-5a6 6 0 0 1 12 0v5M3 20h18M12 3V2"/>',
        spark: '<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>'
    };

    function renderIcons() {
        document.querySelectorAll("[data-icon]").forEach(node => {
            const path = icons[node.dataset.icon];
            if (!path) return;

            node.innerHTML = `
                <svg viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="1.7"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     aria-hidden="true">
                    ${path}
                </svg>`;
        });
    }

    function showMessage(message) {
        const box = $("dashboardMessage");
        if (!box) return;

        box.textContent = message || "";
        box.classList.toggle("visible", Boolean(message));
    }

    async function api(path) {
        const response = await fetch(`/api/admin/${path}`, {
            credentials: "same-origin"
        });

        if (response.status === 401) {
            window.location.replace("/login.html");
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Không thể tải dữ liệu.");
        }

        return data;
    }

    async function checkAdmin() {
        const response = await fetch("/api/account/profile", {
            credentials: "same-origin"
        });

        if (response.status === 401) {
            window.location.replace("/login.html");
            return false;
        }

        if (!response.ok) {
            throw new Error("Không thể kiểm tra phiên đăng nhập.");
        }

        const account = await response.json();

        if (account.role !== "Admin") {
            throw new Error("Bạn không có quyền truy cập khu Admin.");
        }

        const username = account.username || "Quản trị viên";

        $("adminUsername").textContent = username;
        $("adminAvatar").textContent =
            username.trim().charAt(0).toUpperCase() || "A";

        return true;
    }

    function updateDonut(total, available) {
        total = Math.max(0, Number(total) || 0);
        available = Math.max(
            0,
            Math.min(total, Number(available) || 0)
        );

        const other = total - available;
        const percent = total ? available / total * 100 : 0;

        $("roomDonut").style.background = total
            ? `conic-gradient(
                #D7B47D 0% ${percent}%,
                #60442F ${percent}% 100%
              )`
            : "#EAE4DC";

        $("donutTotal").textContent = number(total);
        $("donutAvailable").textContent =
            `${number(available)} (${percent.toFixed(1).replace(".", ",")}%)`;

        $("donutOther").textContent =
            `${number(other)} (${(total ? 100 - percent : 0)
                .toFixed(1).replace(".", ",")}%)`;
    }

    async function loadDashboard() {
        const data = await api("dashboard");

        const totalRooms = Number(data.totalRooms) || 0;
        const availableRooms = Number(data.availableRooms) || 0;
        const otherRooms = Math.max(0, totalRooms - availableRooms);

        $("totalRooms").textContent = number(totalRooms);
        $("availableRooms").textContent = number(availableRooms);
        $("otherRooms").textContent = number(otherRooms);

        $("pendingBookings").textContent =
            number(data.pendingBookings);

        $("totalCustomers").textContent =
            number(data.totalCustomers);

        $("totalEmployees").textContent =
            number(data.totalEmployees);

        updateDonut(totalRooms, availableRooms);
    }

    function renderRevenueChart(monthly) {
        const container = $("revenueChart");

        const values = Array.from({ length: 12 }, (_, index) => {
            const item = monthly.find(
                x => Number(x.month) === index + 1
            );

            return Math.max(0, Number(item?.receivedAmount) || 0);
        });

        const maxValue = Math.max(1, ...values);

        const width = 750;
        const height = 225;
        const left = 70;
        const right = 15;
        const top = 16;
        const bottom = 32;

        const plotWidth = width - left - right;
        const plotHeight = height - top - bottom;

        const points = values.map((value, index) => ({
            x: left + index * plotWidth / 11,
            y: top + plotHeight - value / maxValue * plotHeight,
            value
        }));

        const linePath = points.map((point, index) =>
            `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        ).join(" ");

        const areaPath =
            `${linePath} L${points[11].x} ${top + plotHeight} ` +
            `L${points[0].x} ${top + plotHeight} Z`;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("class", "lux-line-chart");
        svg.setAttribute("role", "img");
        svg.setAttribute(
            "aria-label",
            "Biểu đồ doanh thu đã thu theo 12 tháng"
        );

        function add(tag, attributes, content) {
            const node = document.createElementNS(ns, tag);

            Object.entries(attributes).forEach(([key, value]) =>
                node.setAttribute(key, String(value))
            );

            if (content !== undefined) {
                node.textContent = String(content);
            }

            svg.appendChild(node);
            return node;
        }

        for (let i = 0; i <= 4; i++) {
            const y = top + plotHeight / 4 * i;
            const amount = maxValue * (4 - i) / 4;

            add("line", {
                x1: left,
                y1: y,
                x2: width - right,
                y2: y,
                stroke: "#EAE4DB",
                "stroke-dasharray": "4 5"
            });

            add("text", {
                x: left - 10,
                y: y + 4,
                fill: "#978B7E",
                "font-size": 10,
                "text-anchor": "end"
            }, amount >= 1000000
                ? `${(amount / 1000000).toFixed(1)}tr`
                : number(Math.round(amount))
            );
        }

        add("path", {
            d: areaPath,
            fill: "#D4AB70",
            "fill-opacity": ".16"
        });

        add("path", {
            d: linePath,
            fill: "none",
            stroke: "#AA7B43",
            "stroke-width": 2.8,
            "stroke-linejoin": "round",
            "stroke-linecap": "round"
        });

        points.forEach((point, index) => {
            const circle = add("circle", {
                cx: point.x,
                cy: point.y,
                r: 3.8,
                fill: "#FFFEFC",
                stroke: "#AA7B43",
                "stroke-width": 2
            });

            const title = document.createElementNS(ns, "title");
            title.textContent =
                `Tháng ${index + 1}: ${money(point.value)}`;

            circle.appendChild(title);

            add("text", {
                x: point.x,
                y: height - 8,
                fill: "#94877B",
                "font-size": 11,
                "text-anchor": "middle"
            }, String(index + 1).padStart(2, "0"));
        });

        container.replaceChildren(svg);
    }

    async function loadRevenue(year) {
        const data = await api(
            `reports?year=${encodeURIComponent(year)}`
        );

        const monthly = Array.isArray(data.monthly)
            ? data.monthly
            : [];

        const received = monthly.reduce(
            (sum, item) =>
                sum + (Number(item.receivedAmount) || 0),
            0
        );

        $("chartRevenue").textContent = money(received);

        if (year === new Date().getFullYear()) {
            $("yearRevenue").textContent = money(received);
            $("revenueCaption").textContent = `Năm ${year}`;
        }

        renderRevenueChart(monthly);
    }

    function createCell(value, className = "") {
        const td = document.createElement("td");
        td.textContent = String(value ?? "—");
        if (className) td.className = className;
        return td;
    }

    function createStatus(value) {
        const text = String(value || "Chưa cập nhật");
        const normalized = text.toLowerCase();

        const node = document.createElement("span");
        node.className = "lux-status";
        node.textContent = text;

        if (/thành công|xác nhận|hoàn thành|đã duyệt/.test(normalized)) {
            node.classList.add("success");
        } else if (/chờ|đang xử lý/.test(normalized)) {
            node.classList.add("pending");
        } else if (/hủy|từ chối/.test(normalized)) {
            node.classList.add("cancelled");
        }

        return node;
    }

    async function loadRecentBookings() {
        const tbody = $("recentBookings");

        try {
            const data = await api("bookings");

            const items = Array.isArray(data)
                ? data
                : Array.isArray(data.items)
                    ? data.items
                    : Array.isArray(data.bookings)
                        ? data.bookings
                        : [];

            const recent = [...items]
                .sort((a, b) =>
                    Number(b.id ?? b.bookingId ?? 0) -
                    Number(a.id ?? a.bookingId ?? 0)
                )
                .slice(0, 4);

            tbody.replaceChildren();

            if (!recent.length) {
                const tr = document.createElement("tr");
                const td = createCell("Chưa có dữ liệu đặt phòng.");
                td.colSpan = 5;
                td.className = "lux-empty";
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            recent.forEach(item => {
                const row = document.createElement("tr");

                const bookingId =
                    item.id ?? item.bookingId ?? "—";

                const customer =
                    item.customer ??
                    item.customerName ??
                    item.name ??
                    "—";

                const checkIn =
                    item.checkIn ?? item.checkInDate;

                const checkOut =
                    item.checkOut ?? item.checkOutDate;

                const status =
                    item.status ?? item.bookingStatus;

                row.append(
                    createCell(`#${bookingId}`, "lux-code"),
                    createCell(customer),
                    createCell(dateText(checkIn)),
                    createCell(dateText(checkOut))
                );

                const statusCell = document.createElement("td");
                statusCell.appendChild(createStatus(status));
                row.appendChild(statusCell);

                tbody.appendChild(row);
            });

        } catch (error) {
            tbody.replaceChildren();

            const tr = document.createElement("tr");
            const td = createCell(
                "Chưa tải được đặt phòng. Xem tại trang Quản lý đặt phòng."
            );

            td.colSpan = 5;
            td.className = "lux-empty";
            tr.appendChild(td);
            tbody.appendChild(tr);

            console.warn("Recent bookings:", error.message);
        }
    }

    function initYearFilter() {
        const year = new Date().getFullYear();
        const select = $("revenueYear");

        for (let value = year; value >= year - 4; value--) {
            select.add(
                new Option(`Năm ${value}`, String(value))
            );
        }

        select.addEventListener("change", async () => {
            try {
                await loadRevenue(Number(select.value));
                showMessage("");
            } catch (error) {
                showMessage(error.message);
            }
        });
    }

    async function init() {
        renderIcons();

        $("todayLabel").textContent =
            new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });

        initYearFilter();

        try {
            const allowed = await checkAdmin();
            if (!allowed) return;

            const results = await Promise.allSettled([
                loadDashboard(),
                loadRevenue(new Date().getFullYear()),
                loadRecentBookings()
            ]);

            const errors = results
                .filter(x => x.status === "rejected")
                .map(x => x.reason.message);

            if (errors.length) {
                showMessage([...new Set(errors)].join(" "));
            }
        } catch (error) {
            showMessage(error.message);
        }
    }

    await init();
});
