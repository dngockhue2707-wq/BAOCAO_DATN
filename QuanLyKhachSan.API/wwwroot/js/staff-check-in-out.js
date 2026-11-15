
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;
    let bookings = [];
    let keyword = "";
    let filter = "Tất cả";

    const create = (tag, className = "", value = "") => {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = String(value ?? "");
        return node;
    };

    const badge = status => {
        const types = {
            "Đã xác nhận": "confirmed",
            "Đã đặt cọc": "deposit",
            "Đã nhận phòng": "occupied"
        };
        return create(
            "span",
            "sc-status " + (types[status] || "neutral"),
            status
        );
    };

    const card = (label, value, symbol, type) => {
        const node = create("article", "sc-stat");
        node.appendChild(create("span", "sc-stat-icon " + type, symbol));
        const body = create("div");
        body.append(
            create("strong", "", value),
            create("small", "", label)
        );
        node.appendChild(body);
        return node;
    };

    function render() {
        const page = create("div", "sc-page");
        const stats = create("div", "sc-stats");

        const arriving = bookings.filter(x =>
            ["Đã xác nhận", "Đã đặt cọc"].includes(x.status)
        );

        const staying = bookings.filter(x =>
            x.status === "Đã nhận phòng"
        );

        stats.append(
            card("Chờ nhận phòng", arriving.length, "↗", "arrival"),
            card("Đang lưu trú", staying.length, "▣", "staying"),
            card("Tổng đơn đang xử lý", arriving.length + staying.length, "▤", "checkout")
        );

        const panel = create("section", "sc-panel");
        const heading = create("div", "sc-panel-head");
        heading.appendChild(create("h2", "", "Danh sách thủ tục"));
        heading.appendChild(
            create("span", "sc-panel-count", `${arriving.length + staying.length} đơn`)
        );

        const filters = create("div", "sc-filters");
        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Mã đơn, tên khách, số phòng...";
        search.value = keyword;

        const statusSelect = document.createElement("select");
        ["Tất cả", "Chờ nhận phòng", "Đang lưu trú"].forEach(x => {
            statusSelect.add(new Option(x, x));
        });
        statusSelect.value = filter;

        filters.append(search, statusSelect);

        const counter = create("p", "sc-result");
        const output = create("div");

        function update() {
            keyword = search.value.trim().toLocaleLowerCase("vi-VN");
            filter = statusSelect.value;

            const filtered = bookings.filter(item => {
                const active = [
                    "Đã xác nhận",
                    "Đã đặt cọc",
                    "Đã nhận phòng"
                ].includes(item.status);

                const matchText = [
                    item.id,
                    item.customer,
                    item.roomNumber
                ].join(" ").toLocaleLowerCase("vi-VN").includes(keyword);

                const matchStatus =
                    filter === "Tất cả" ||
                    (filter === "Chờ nhận phòng" &&
                        ["Đã xác nhận", "Đã đặt cọc"].includes(item.status)) ||
                    (filter === "Đang lưu trú" &&
                        item.status === "Đã nhận phòng");

                return active && matchText && matchStatus;
            });

            counter.textContent = `Hiển thị ${filtered.length} đơn`;

            const rows = filtered.map(item => {
                const actions = create("div", "sc-actions");

                if (["Đã xác nhận", "Đã đặt cọc"].includes(item.status)) {
                    const button = create("button", "sc-button", "Check-in");
                    button.type = "button";
                    button.addEventListener("click", () => {
                        s.action(
                            `bookings/${item.id}/check-in`,
                            `Xác nhận khách nhận phòng cho đơn #${item.id}?`,
                            load
                        );
                    });
                    actions.appendChild(button);
                }

                if (item.status === "Đã nhận phòng") {
                    const button = create("button", "sc-button", "Check-out");
                    button.type = "button";
                    button.addEventListener("click", () => {
                        s.action(
                            `bookings/${item.id}/check-out`,
                            `Xác nhận khách trả phòng đơn #${item.id}?`,
                            load
                        );
                    });
                    actions.appendChild(button);
                }

                return [
                    create("strong", "sc-id", `#${item.id}`),
                    create("strong", "sc-customer", item.customer),
                    create("strong", "", item.roomNumber),
                    s.date(item.checkIn),
                    s.date(item.checkOut),
                    badge(item.status),
                    actions
                ];
            });

            output.replaceChildren(s.table(
                [
                    "Mã đơn",
                    "Khách hàng",
                    "Phòng",
                    "Ngày nhận",
                    "Ngày trả",
                    "Trạng thái",
                    "Thao tác"
                ],
                rows
            ));
        }

        search.addEventListener("input", update);
        statusSelect.addEventListener("change", update);

        panel.append(heading, filters, counter, output);
        page.append(stats, panel);
        s.content.replaceChildren(page);
        update();
    }

    async function load() {
        try {
            const data = await s.api("bookings");
            bookings = Array.isArray(data.items) ? data.items : [];
            render();
        } catch (error) {
            s.notify(error.message || "Không tải được danh sách.", true);
        }
    }

    load();
});
 