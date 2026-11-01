
"use strict";

window.AdminBookings = {
    async init({
        api,
        write,
        panel,
        button,
        table,
        date,
        money,
        el,
        showMessage,
        content
    }) {
        const data = await api("bookings");
        const bookings = Array.isArray(data.items) ? data.items : [];

        const box = panel("Danh sách đặt phòng");

        const toolbar = el("div", "", "admin-booking-toolbar");

        const search = document.createElement("input");
        search.type = "search";
        search.className = "admin-input";
        search.placeholder = "Tìm mã đơn, tên khách, số phòng...";

        const statusFilter = document.createElement("select");
        statusFilter.className = "admin-select";

        [
            ["", "Tất cả trạng thái"],
            ["Chờ xác nhận", "Chờ xác nhận"],
            ["Đã xác nhận", "Đã xác nhận"],
            ["Đã đặt cọc", "Đã đặt cọc"],
            ["Đã nhận phòng", "Đã nhận phòng"],
            ["Đã trả phòng", "Đã trả phòng"],
            ["Đã hủy", "Đã hủy"]
        ].forEach(([value, label]) => {
            statusFilter.add(new Option(label, value));
        });

        const checkInFilter = document.createElement("input");
        checkInFilter.type = "date";
        checkInFilter.className = "admin-input";
        checkInFilter.title = "Lọc theo ngày nhận phòng";

        const resetButton = button("Đặt lại", () => {
            search.value = "";
            statusFilter.value = "";
            checkInFilter.value = "";
            render();
        }, "secondary");

        toolbar.append(
            search,
            statusFilter,
            checkInFilter,
            resetButton
        );

        const count = el("p", "", "admin-booking-count");
        const results = el("div", "", "admin-booking-results");

        box.append(toolbar, count, results);
        content.replaceChildren(box);

        function dateKey(value) {
            if (!value) return "";
            return String(value).slice(0, 10);
        }

        function render() {
            const keyword = search.value.trim().toLocaleLowerCase("vi-VN");
            const selectedStatus = statusFilter.value;
            const selectedDate = checkInFilter.value;

            const filtered = bookings.filter(booking => {
                const searchable = [
                    booking.id,
                    `#${booking.id}`,
                    booking.customer,
                    booking.roomNumber,
                    booking.roomType
                ].join(" ").toLocaleLowerCase("vi-VN");

                const matchesKeyword =
                    !keyword || searchable.includes(keyword);

                const matchesStatus =
                    !selectedStatus ||
                    booking.status === selectedStatus;

                const matchesDate =
                    !selectedDate ||
                    dateKey(booking.checkIn) === selectedDate;

                return matchesKeyword && matchesStatus && matchesDate;
            });

            count.textContent =
                `Hiển thị ${filtered.length}/${bookings.length} đơn đặt phòng`;

            const rows = filtered.map(booking => {
                const actions = el("div", "", "admin-actions");

                if (booking.status === "Chờ xác nhận") {
                    const confirmButton = button(
                        "Xác nhận",
                        () => changeStatus(
                            booking,
                            "Đã xác nhận",
                            confirmButton,
                            cancelButton
                        )
                    );

                    const cancelButton = button(
                        "Hủy",
                        () => changeStatus(
                            booking,
                            "Đã hủy",
                            confirmButton,
                            cancelButton
                        ),
                        "danger"
                    );

                    actions.append(confirmButton, cancelButton);
                } else {
                    actions.textContent = "—";
                }

                const status = el(
                    "span",
                    booking.status,
                    "admin-booking-status"
                );

                status.dataset.status = booking.status;

                return [
                    `#${booking.id}`,
                    booking.customer,
                    `${booking.roomType} · ${booking.roomNumber}`,
                    `${date(booking.checkIn)} – ${date(booking.checkOut)}`,
                    money(booking.total),
                    status,
                    actions
                ];
            });

            results.replaceChildren(
                table(
                    [
                        "Mã",
                        "Khách hàng",
                        "Phòng",
                        "Thời gian lưu trú",
                        "Tiền phòng",
                        "Trạng thái",
                        "Thao tác"
                    ],
                    rows
                )
            );
        }

        async function changeStatus(
            booking,
            newStatus,
            confirmButton,
            cancelButton
        ) {
            const actionText = newStatus === "Đã hủy"
                ? "hủy"
                : "xác nhận";

            const accepted = confirm(
                `Bạn có chắc muốn ${actionText} đơn đặt phòng #${booking.id}?`
            );

            if (!accepted) return;

            confirmButton.disabled = true;
            cancelButton.disabled = true;

            try {
                const result = await write(
                    "PUT",
                    `bookings/${booking.id}/status`,
                    { status: newStatus }
                );

                const index = bookings.findIndex(
                    item => item.id === booking.id
                );

                if (index !== -1) {
                    bookings[index].status = newStatus;
                }

                showMessage(
                    result.message ||
                    "Cập nhật đơn đặt phòng thành công."
                );

                render();
            } catch (error) {
                showMessage(error.message);
                confirmButton.disabled = false;
                cancelButton.disabled = false;
            }
        }

        search.addEventListener("input", render);
        statusFilter.addEventListener("change", render);
        checkInFilter.addEventListener("change", render);

        render();
    }
};
