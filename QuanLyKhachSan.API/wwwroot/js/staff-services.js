
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

    function field(label, node) {
        const wrap = s.el("label", "", "staff-field");
        wrap.append(s.el("span", label), node);
        return wrap;
    }

    async function load() {
        try {
            const [services, bookings, rooms, usage] = await Promise.all([
                s.api("operations/services"),
                s.api("bookings"),
                s.api("operations/rooms"),
                s.api("operations/service-usage")
            ]);

            const panel = s.panel("Ghi nhận dịch vụ khách sử dụng");
            const form = s.el("form", "", "staff-form");

            const bookingSelect = document.createElement("select");
            const roomSelect = document.createElement("select");
            const serviceSelect = document.createElement("select");
            const quantity = document.createElement("input");
            quantity.type = "number";
            quantity.min = "1";
            quantity.max = "100";
            quantity.value = "1";
            quantity.required = true;

            const checkedIn = bookings.items.filter(
                x => x.status === "Đã nhận phòng"
            );

            const uniqueBookings = [...new Map(
                checkedIn.map(x => [x.id, x])
            ).values()];

            uniqueBookings.forEach(item => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = `#${item.id} - ${item.customer}`;
                bookingSelect.appendChild(option);
            });

            function updateRooms() {
                roomSelect.replaceChildren();

                const selectedId = Number(bookingSelect.value);

                const available = checkedIn.filter(
                    item => item.id === selectedId
                );

                available.forEach(item => {
                    const room = rooms.items.find(
                        x => x.number === item.roomNumber
                    );
                    if (!room) return;

                    const option = document.createElement("option");
                    option.value = room.id;
                    option.textContent = room.number;
                    roomSelect.appendChild(option);
                });
            }

            bookingSelect.addEventListener("change", updateRooms);
            updateRooms();

            services.items.forEach(item => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = `${item.name} - ${s.money(item.price)}/${item.unit}`;
                serviceSelect.appendChild(option);
            });

            const submit = s.el("button", "Ghi nhận dịch vụ", "staff-action");
            submit.type = "submit";

            form.append(
                field("Đơn đặt phòng", bookingSelect),
                field("Phòng", roomSelect),
                field("Dịch vụ", serviceSelect),
                field("Số lượng", quantity),
                submit
            );

            form.addEventListener("submit", async event => {
                event.preventDefault();

                const input = {
                    bookingId: Number(bookingSelect.value),
                    roomId: Number(roomSelect.value),
                    serviceId: Number(serviceSelect.value),
                    quantity: Number(quantity.value)
                };

                if (!input.bookingId || !input.roomId || !input.serviceId) {
                    s.notify("Vui lòng chọn đầy đủ đơn, phòng và dịch vụ.", true);
                    return;
                }

                if (!confirm("Xác nhận ghi nhận dịch vụ này?")) return;

                submit.disabled = true;

                try {
                    const result = await s.api(
                        "operations/service-usage", "POST", input
                    );
                    await load();
                    s.notify(result.message);
                } catch (error) {
                    s.notify(error.message, true);
                    submit.disabled = false;
                }
            });

            const history = s.panel("Lịch sử sử dụng dịch vụ");

            const rows = usage.items.map(item => [
                "#" + item.bookingId,
                item.room,
                item.service,
                item.quantity,
                s.money(item.price),
                s.money(item.total),
                s.date(item.date)
            ]);

            history.appendChild(s.table(
                ["Đơn", "Phòng", "Dịch vụ", "Số lượng",
                 "Đơn giá", "Thành tiền", "Ngày sử dụng"],
                rows
            ));

            panel.appendChild(form);
            s.content.replaceChildren(panel, history);
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    load();
});
