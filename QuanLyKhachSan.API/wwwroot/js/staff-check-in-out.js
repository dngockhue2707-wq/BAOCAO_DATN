
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

    async function load() {
        try {
            const data = await s.api("bookings");
            const panel = s.panel("Thủ tục nhận và trả phòng");

            const active = data.items.filter(item =>
                ["Đã xác nhận", "Đã đặt cọc", "Đã nhận phòng"]
                    .includes(item.status)
            );

            const rows = active.map(item => {
                const actions = s.el("div", "", "staff-actions");

                if (["Đã xác nhận", "Đã đặt cọc"].includes(item.status)) {
                    actions.appendChild(s.button("Check-in", () => {
                        s.action(
                            `bookings/${item.id}/check-in`,
                            `Xác nhận khách nhận phòng cho đơn #${item.id}?`,
                            load
                        );
                    }));
                }

                if (item.status === "Đã nhận phòng") {
                    actions.appendChild(s.button("Check-out", () => {
                        s.action(
                            `bookings/${item.id}/check-out`,
                            `Xác nhận khách trả phòng đơn #${item.id}?`,
                            load
                        );
                    }));
                }

                return [
                    "#" + item.id,
                    item.customer,
                    item.roomNumber,
                    s.date(item.checkIn),
                    s.date(item.checkOut),
                    item.status,
                    actions
                ];
            });

            panel.appendChild(s.table(
                ["Mã đơn", "Khách", "Phòng", "Ngày nhận",
                 "Ngày trả", "Trạng thái", "Thao tác"],
                rows
            ));

            s.content.replaceChildren(panel);
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    load();
});
