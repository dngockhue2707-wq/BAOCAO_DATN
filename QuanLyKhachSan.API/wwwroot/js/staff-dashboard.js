
"use strict";

document.addEventListener("staff-auth-ready", async () => {
    const s = window.Staff;
    if (!s || !s.content) return;

    const routes = {
        rooms: "/staff/rooms.html",
        bookings: "/staff/bookings.html",
        checkin: "/staff/check-in-out.html",
        invoices: "/staff/invoices.html"
    };

    const create = (tag, className = "", text = "") => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = String(text);
        return node;
    };

    const makeLink = (text, url, className = "") => {
        const node = create("a", className, text);
        node.href = url;
        return node;
    };

    const number = value => {
        if (value === undefined || value === null) return "—";
        const n = Number(value);
        return Number.isFinite(n)
            ? n.toLocaleString("vi-VN")
            : "—";
    };

    const today = new Date();
    const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    const dateKey = value => {
        if (!value) return "";

        const raw = String(value);
        const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    };

    const panelHeader = (title, label, url) => {
        const head = create("div", "bt-panel-head");
        head.appendChild(create("h2", "", title));

        if (url) {
            head.appendChild(
                makeLink(label, url, "bt-panel-link")
            );
        }

        return head;
    };

    const statCard = (title, value, icon, url) => {
        const card = makeLink("", url, "bt-stat");

        const top = create("div", "bt-stat-top");
        top.appendChild(create("span", "", title));
        top.appendChild(create("span", "bt-stat-icon", icon));

        card.append(
            top,
            create("strong", "", number(value))
        );

        return card;
    };

    const roomAppearance = status => {
        switch (status) {
            case "Trống":
                return ["free", "Trống"];
            case "Đang sử dụng":
                return ["busy", "Có khách"];
            case "Đang dọn":
                return ["clean", "Cần dọn"];
            case "Bảo trì":
                return ["maintenance", "Bảo trì"];
            case "Ngừng hoạt động":
                return ["disabled", "Ngừng hoạt động"];
            default:
                return ["unknown", "Chưa xác định"];
        }
    };

    const renderRooms = (container, rooms) => {
        container.replaceChildren();

        const sorted = [...rooms].sort((a, b) =>
            String(a.number ?? "").localeCompare(
                String(b.number ?? ""),
                "vi",
                { numeric: true }
            )
        );

        if (!sorted.length) {
            container.appendChild(
                create("p", "bt-empty", "Chưa có dữ liệu phòng.")
            );
            return;
        }

        sorted.slice(0, 25).forEach(room => {
            const roomNumber = String(room.number ?? "—");
            const [css, label] = roomAppearance(room.status);

            const tile = makeLink(
                roomNumber,
                routes.rooms,
                "bt-room " + css
            );

            tile.title = `Phòng ${roomNumber} · ${label}`;
            tile.setAttribute("aria-label", tile.title);

            container.appendChild(tile);
        });
    };

    const renderGuests = (container, bookings) => {
        container.replaceChildren();

        const guests = bookings
            .filter(item =>
                dateKey(item.checkIn) === todayKey &&
                ["Đã xác nhận", "Đã đặt cọc"].includes(item.status)
            )
            .sort((a, b) =>
                String(a.checkIn ?? "").localeCompare(
                    String(b.checkIn ?? "")
                )
            );

        if (!guests.length) {
            const empty = create("div", "bt-guest-empty");
            empty.appendChild(
                create("span", "bt-empty-icon", "✓")
            );
            empty.appendChild(
                create("strong", "", "Không có khách chờ nhận")
            );
            empty.appendChild(
                makeLink(
                    "Xem lịch đặt phòng →",
                    routes.bookings,
                    "bt-inline-link"
                )
            );
            container.appendChild(empty);
            return;
        }

        guests.slice(0, 4).forEach(item => {
            const name = String(item.customer || "Khách hàng");
            const initials = name
                .trim()
                .split(/\s+/)
                .slice(-2)
                .map(x => x.charAt(0).toUpperCase())
                .join("");

            const row = makeLink(
                "",
                routes.checkin,
                "bt-guest"
            );

            const avatar = create(
                "span",
                "bt-guest-avatar",
                initials
            );

            const info = create("div", "bt-guest-info");
            info.appendChild(
                create("strong", "", name)
            );

            const room = String(item.roomNumber ?? "—");

            let detail = `Phòng ${room}`;

            const dateText = String(item.checkIn ?? "");
            const timeMatch = dateText.match(/T(\d{2}:\d{2})/);

            if (timeMatch) {
                detail += ` · ${timeMatch[1]}`;
            }

            info.appendChild(
                create("small", "", detail)
            );

            const badge = create(
                "span",
                "bt-guest-badge",
                "Chờ nhận"
            );

            row.append(avatar, info, badge);
            container.appendChild(row);
        });

        if (guests.length > 4) {
            container.appendChild(
                makeLink(
                    `Xem thêm ${guests.length - 4} khách →`,
                    routes.checkin,
                    "bt-more"
                )
            );
        }
    };

    const quickAction = (icon, label, url) => {
        const a = makeLink("", url, "bt-quick-item");

        a.appendChild(
            create("span", "bt-quick-icon", icon)
        );

        a.appendChild(
            create("span", "", label)
        );

        return a;
    };

    try {
        s.notify("");

        const summary = await s.api("dashboard");

        const dashboard = create("div", "bt-dashboard");

        // FOUR SUMMARY CARDS
        const stats = create("section", "bt-stats");

        [
            ["Chờ xác nhận", summary.pending, "▤", routes.bookings],
            ["Khách đến", summary.arrivalsToday, "↗", routes.checkin],
            ["Đang lưu trú", summary.checkedIn, "▣", routes.checkin],
            ["Cần dọn", summary.cleaning, "✧", routes.rooms]
        ].forEach(values => {
            stats.appendChild(statCard(...values));
        });

        // MAIN TWO-COLUMN LAYOUT
        const columns = create("div", "bt-columns");

        const roomPanel = create("section", "bt-panel");
        roomPanel.appendChild(
            panelHeader(
                "Sơ đồ phòng",
                "Xem tất cả →",
                routes.rooms
            )
        );

        const roomGrid = create("div", "bt-room-grid");
        roomGrid.appendChild(
            create("p", "bt-empty", "Đang tải phòng...")
        );

        const legend = create("div", "bt-legend");

        [
            ["free", "Trống"],
            ["busy", "Có khách"],
            ["clean", "Cần dọn"],
            ["maintenance", "Bảo trì"]
        ].forEach(([css, label]) => {
            const item = create("span");
            item.append(
                create("i", css),
                document.createTextNode(label)
            );
            legend.appendChild(item);
        });

        roomPanel.append(roomGrid, legend);

        const guestPanel = create("section", "bt-panel");
        guestPanel.appendChild(
            panelHeader(
                "Khách sắp đến",
                "Xem lịch →",
                routes.checkin
            )
        );

        const guestList = create("div", "bt-guest-list");
        guestList.appendChild(
            create("p", "bt-empty", "Đang tải khách...")
        );

        guestPanel.appendChild(guestList);

        columns.append(roomPanel, guestPanel);

        // QUICK ACTIONS
        const quickPanel = create("section", "bt-panel bt-quick-panel");
        quickPanel.appendChild(
            panelHeader("Thao tác nhanh")
        );

        const quickGrid = create("div", "bt-quick-grid");

        [
            ["⇥", "Nhận phòng", routes.checkin],
            ["⇤", "Trả phòng", routes.checkin],
            ["▤", "Đặt phòng", routes.bookings],
            ["▧", "Hóa đơn", routes.invoices]
        ].forEach(values => {
            quickGrid.appendChild(quickAction(...values));
        });

        quickPanel.appendChild(quickGrid);

        dashboard.append(stats, columns, quickPanel);
        s.content.replaceChildren(dashboard);

        // REAL DATABASE DATA
        const [roomsResult, bookingsResult] = await Promise.allSettled([
            s.api("operations/rooms"),
            s.api("bookings")
        ]);

        if (roomsResult.status === "fulfilled") {
            const rooms = Array.isArray(roomsResult.value.items)
                ? roomsResult.value.items
                : [];

            renderRooms(roomGrid, rooms);
        } else {
            roomGrid.replaceChildren(
                makeLink(
                    "Không tải được phòng · Xem danh sách →",
                    routes.rooms,
                    "bt-empty-link"
                )
            );
        }

        if (bookingsResult.status === "fulfilled") {
            const bookings = Array.isArray(bookingsResult.value.items)
                ? bookingsResult.value.items
                : [];

            renderGuests(guestList, bookings);
        } else {
            guestList.replaceChildren(
                makeLink(
                    "Không tải được khách · Xem danh sách →",
                    routes.checkin,
                    "bt-empty-link"
                )
            );
        }

    } catch (error) {
        s.notify(
            error.message || "Không thể tải tổng quan.",
            true
        );
    }
});
