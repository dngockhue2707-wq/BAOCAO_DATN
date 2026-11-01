
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;
    let items = [];

    async function load() {
        try {
            const result = await s.api("bookings");
            items = result.items;
            render();
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    function render() {
        const panel = s.panel("Danh sách đơn đặt phòng");
        const filters = s.el("div", "", "staff-filters");

        const search = document.createElement("input");
        search.placeholder = "Mã đơn, tên khách, số phòng...";

        const status = document.createElement("select");
        ["Tất cả", "Chờ xác nhận", "Đã xác nhận",
         "Đã đặt cọc", "Đã nhận phòng",
         "Đã trả phòng", "Đã hủy"].forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            status.appendChild(option);
        });

        const results = s.el("div");

        function update() {
            const key = search.value.toLocaleLowerCase("vi").trim();
            const selected = status.value;

            const filtered = items.filter(item => {
                const text = [
                    item.id, item.customer,
                    item.roomNumber, item.roomType
                ].join(" ").toLocaleLowerCase("vi");

                return text.includes(key) &&
                    (selected === "Tất cả" || item.status === selected);
            });

            const rows = filtered.map(item => {
                const actions = s.el("div", "", "staff-actions");

                if (item.status === "Chờ xác nhận") {
                    actions.appendChild(s.button("Xác nhận", () => {
                        s.action(
                            `bookings/${item.id}/confirm`,
                            `Xác nhận đơn #${item.id}?`,
                            load
                        );
                    }));
                }

                const detail = s.button("Chi tiết", () => {
                    alert(
                        `Mã đơn: #${item.id}\n` +
                        `Khách: ${item.customer}\n` +
                        `Phòng: ${item.roomNumber}\n` +
                        `Loại phòng: ${item.roomType}\n` +
                        `Nhận: ${s.date(item.checkIn)}\n` +
                        `Trả: ${s.date(item.checkOut)}\n` +
                        `Trạng thái: ${item.status}`
                    );
                });

                actions.appendChild(detail);

                return [
                    "#" + item.id,
                    item.customer,
                    item.roomNumber,
                    item.roomType,
                    s.date(item.checkIn),
                    s.date(item.checkOut),
                    item.status,
                    actions
                ];
            });

            results.replaceChildren(
                s.el("p", `Tổng cộng: ${filtered.length} đơn`),
                s.table(
                    ["Mã đơn", "Khách", "Phòng", "Loại phòng",
                     "Nhận", "Trả", "Trạng thái", "Thao tác"],
                    rows
                )
            );
        }

        search.addEventListener("input", update);
        status.addEventListener("change", update);
        filters.append(search, status);
        panel.append(filters, results);
        s.content.replaceChildren(panel);
        update();
    }

    load();
});
