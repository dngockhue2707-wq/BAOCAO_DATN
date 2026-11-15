
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;

    const el = (tag, className = "", text = "") => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = String(text ?? "");
        return node;
    };

    const field = (label, control) => {
        const wrap = el("label", "sv-field");
        wrap.append(el("span", "", label), control);
        return wrap;
    };

    async function load() {
        try {
            const [services, bookings, rooms, usage] = await Promise.all([
                s.api("operations/services"),
                s.api("bookings"),
                s.api("operations/rooms"),
                s.api("operations/service-usage")
            ]);

            const serviceItems = Array.isArray(services.items)
                ? services.items : [];
            const bookingItems = Array.isArray(bookings.items)
                ? bookings.items : [];
            const roomItems = Array.isArray(rooms.items)
                ? rooms.items : [];
            const usageItems = Array.isArray(usage.items)
                ? usage.items : [];

            const activeBookings = bookingItems.filter(
                x => x.status === "Đã nhận phòng"
            );

            const uniqueBookings = [
                ...new Map(
                    activeBookings.map(x => [x.id, x])
                ).values()
            ];

            const page = el("div", "sv-page");
            const columns = el("div", "sv-columns");

            const formPanel = el("section", "sv-panel sv-form-panel");
            formPanel.appendChild(
                el("h2", "sv-panel-title", "Ghi nhận dịch vụ")
            );

            const form = el("form", "sv-form");
            const formGrid = el("div", "sv-form-grid");

            const bookingSelect = document.createElement("select");
            const roomSelect = document.createElement("select");
            const serviceSelect = document.createElement("select");
            const quantity = document.createElement("input");

            quantity.type = "number";
            quantity.min = "1";
            quantity.max = "100";
            quantity.value = "1";
            quantity.required = true;

            uniqueBookings.forEach(item => {
                bookingSelect.add(
                    new Option(`#${item.id} - ${item.customer}`, item.id)
                );
            });

            serviceItems.forEach(item => {
                serviceSelect.add(
                    new Option(
                        `${item.name} - ${s.money(item.price)}/${item.unit}`,
                        item.id
                    )
                );
            });

            function updateRooms() {
                roomSelect.replaceChildren();

                const bookingId = Number(bookingSelect.value);

                activeBookings
                    .filter(item => Number(item.id) === bookingId)
                    .forEach(item => {
                        const matchedRoom = roomItems.find(
                            x => String(x.number) === String(item.roomNumber)
                        );

                        if (!matchedRoom) return;

                        if (![...roomSelect.options].some(
                            option => Number(option.value) === Number(matchedRoom.id)
                        )) {
                            roomSelect.add(
                                new Option(
                                    matchedRoom.number,
                                    matchedRoom.id
                                )
                            );
                        }
                    });
            }

            bookingSelect.addEventListener("change", updateRooms);
            updateRooms();

            formGrid.append(
                field("Đơn đặt phòng", bookingSelect),
                field("Phòng", roomSelect),
                field("Dịch vụ", serviceSelect),
                field("Số lượng", quantity)
            );

            const submit = el(
                "button",
                "sv-submit",
                "＋  Ghi nhận dịch vụ"
            );
            submit.type = "submit";

            const submitRow = el("div", "sv-submit-row");
            submitRow.appendChild(submit);

            form.append(formGrid, submitRow);

            form.addEventListener("submit", async event => {
                event.preventDefault();

                const input = {
                    bookingId: Number(bookingSelect.value),
                    roomId: Number(roomSelect.value),
                    serviceId: Number(serviceSelect.value),
                    quantity: Number(quantity.value)
                };

                if (
                    !input.bookingId ||
                    !input.roomId ||
                    !input.serviceId
                ) {
                    s.notify(
                        "Vui lòng chọn đầy đủ đơn, phòng và dịch vụ.",
                        true
                    );
                    return;
                }

                if (
                    !Number.isInteger(input.quantity) ||
                    input.quantity < 1 ||
                    input.quantity > 100
                ) {
                    s.notify("Số lượng từ 1 đến 100.", true);
                    return;
                }

                if (!confirm("Xác nhận ghi nhận dịch vụ này?")) return;

                submit.disabled = true;

                try {
                    const result = await s.api(
                        "operations/service-usage",
                        "POST",
                        input
                    );

                    await load();
                    s.notify(result.message || "Đã ghi nhận dịch vụ.");
                } catch (error) {
                    s.notify(error.message || "Ghi nhận thất bại.", true);
                    submit.disabled = false;
                }
            });

            formPanel.appendChild(form);

            const historyPanel = el("section", "sv-panel sv-history-panel");

            const historyHead = el("div", "sv-history-head");
            historyHead.append(
                el("h2", "sv-panel-title", "Lịch sử sử dụng"),
                el("span", "sv-count", `${usageItems.length} lượt`)
            );

            const rows = usageItems.map(item => [
                el("strong", "sv-booking-id", `#${item.bookingId}`),
                el("strong", "", item.room),
                item.service,
                item.quantity,
                s.money(item.price),
                el("strong", "sv-money", s.money(item.total)),
                s.date(item.date)
            ]);

            historyPanel.append(
                historyHead,
                s.table(
                    [
                        "Đơn",
                        "Phòng",
                        "Dịch vụ",
                        "SL",
                        "Đơn giá",
                        "Thành tiền",
                        "Ngày sử dụng"
                    ],
                    rows
                )
            );

            columns.append(formPanel, historyPanel);
            page.appendChild(columns);
            s.content.replaceChildren(page);
        } catch (error) {
            s.notify(
                error.message || "Không tải được dịch vụ.",
                true
            );
        }
    }

    load();
});
