
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
        let bookings = [];
        let cancellations = [];
        let refunds = [];

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
            renderBookings();
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

        // Khu vuc yeu cau huy phong.
        const cancelBox = panel("Yêu cầu hủy phòng");
        const cancelDescription = document.createElement("p");
        cancelDescription.textContent =
            "Xét duyệt các yêu cầu hủy phòng đã đặt cọc. " +
            "Tiền hoàn chỉ được ghi nhận sau khi chuyển khoản thực tế.";

        const cancelActions = document.createElement("div");
        cancelActions.className = "admin-actions";

        const cancelRefresh = button(
            "Cập nhật yêu cầu",
            () => refreshAll(),
            "secondary"
        );

        cancelActions.appendChild(cancelRefresh);

        const cancelCount = document.createElement("p");
        const cancelResults = document.createElement("div");

        cancelBox.append(
            cancelDescription,
            cancelActions,
            cancelCount,
            cancelResults
        );

        // Khu vuc hoan coc.
        const refundBox = panel("Giao dịch hoàn cọc");
        const refundDescription = document.createElement("p");
        refundDescription.textContent =
            "Chỉ xác nhận Đã hoàn sau khi kiểm tra " +
            "giao dịch hoàn tiền thành công ngoài hệ thống.";

        const refundCount = document.createElement("p");
        const refundResults = document.createElement("div");

        refundBox.append(
            refundDescription,
            refundCount,
            refundResults
        );

        content.replaceChildren(
            box,
            cancelBox,
            refundBox
        );

        function dateKey(value) {
            return value ? String(value).slice(0, 10) : "";
        }

        function dateTime(value) {
            if (!value) return "—";

            const d = new Date(value);

            if (Number.isNaN(d.getTime())) {
                return String(value);
            }

            return d.toLocaleString("vi-VN");
        }

        function cell(text) {
            const span = document.createElement("span");
            span.textContent = String(text ?? "—");
            return span;
        }

        function isPendingCancellation(bookingId) {
            return cancellations.some(item =>
                Number(item.bookingId) === Number(bookingId) &&
                item.status === "Chờ xử lý"
            );
        }

        async function requestJson(url, options = {}) {
            const response = await fetch(url, {
                credentials: "same-origin",
                cache: "no-store",
                ...options
            });

            const data = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.title ||
                    `HTTP ${response.status}`
                );
            }

            return data;
        }

        async function cancellationPost(path, body) {
            const csrf = await requestJson(
                "/api/account/csrf-token"
            );

            if (!csrf.csrfToken) {
                throw new Error("Không lấy được mã bảo mật.");
            }

            return await requestJson(
                `/api/cancellations/${path}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrf.csrfToken
                    },
                    body: JSON.stringify(body)
                }
            );
        }

        function renderBookings() {
            const keyword = search.value
                .trim()
                .toLocaleLowerCase("vi-VN");

            const filtered = bookings.filter(item => {
                const searchable = [
                    item.id,
                    `#${item.id}`,
                    item.customer,
                    item.roomNumber,
                    item.roomType
                ].join(" ").toLocaleLowerCase("vi-VN");

                return (
                    (!keyword || searchable.includes(keyword)) &&
                    (!statusFilter.value ||
                        item.status === statusFilter.value) &&
                    (!checkInFilter.value ||
                        dateKey(item.checkIn) ===
                            checkInFilter.value)
                );
            });

            count.textContent =
                `Hiển thị ${filtered.length}/${bookings.length} đơn đặt phòng`;

            const rows = filtered.map(item => {
                const actions = el("div", "", "admin-actions");
                const pending = isPendingCancellation(item.id);

                if (
                    item.status === "Chờ xác nhận" &&
                    !pending
                ) {
                    const confirmButton = button(
                        "Xác nhận",
                        () => changeStatus(
                            item,
                            "Đã xác nhận",
                            confirmButton,
                            cancelButton
                        )
                    );

                    const cancelButton = button(
                        "Hủy",
                        () => changeStatus(
                            item,
                            "Đã hủy",
                            confirmButton,
                            cancelButton
                        ),
                        "danger"
                    );

                    actions.append(confirmButton, cancelButton);
                } else if (pending) {
                    actions.appendChild(
                        cell("Có yêu cầu hủy đang chờ")
                    );
                } else {
                    actions.textContent = "—";
                }

                const status = el(
                    "span",
                    item.status,
                    "admin-booking-status"
                );

                status.dataset.status = item.status;

                return [
                    `#${item.id}`,
                    item.customer,
                    `${item.roomType} · ${item.roomNumber}`,
                    `${date(item.checkIn)} – ${date(item.checkOut)}`,
                    money(item.total),
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
            if (isPendingCancellation(booking.id)) {
                showMessage(
                    "Đơn có yêu cầu hủy đang chờ. " +
                    "Vui lòng xử lý yêu cầu trước."
                );
                return;
            }

            const actionText = newStatus === "Đã hủy"
                ? "hủy"
                : "xác nhận";

            if (!confirm(
                `Bạn có chắc muốn ${actionText} đơn #${booking.id}?`
            )) {
                return;
            }

            confirmButton.disabled = true;
            cancelButton.disabled = true;

            try {
                const result = await write(
                    "PUT",
                    `bookings/${booking.id}/status`,
                    { status: newStatus }
                );

                showMessage(
                    result.message ||
                    "Đã cập nhật trạng thái đặt phòng."
                );

                await refreshAll();
            } catch (error) {
                showMessage(error.message);
                confirmButton.disabled = false;
                cancelButton.disabled = false;
            }
        }

        function actionButton(text, action, variant) {
            const btn = button(text, action, variant);
            btn.type = "button";
            return btn;
        }

        function renderCancellations() {
            const pendingCount = cancellations.filter(
                x => x.status === "Chờ xử lý"
            ).length;

            cancelCount.textContent =
                `${cancellations.length} yêu cầu · ` +
                `${pendingCount} đang chờ xử lý`;

            const rows = cancellations.map(item => {
                const actions = el("div", "", "admin-actions");

                if (item.status === "Chờ xử lý") {
                    actions.append(
                        actionButton(
                            "Duyệt",
                            () => approveCancellation(item)
                        ),
                        actionButton(
                            "Từ chối",
                            () => rejectCancellation(item),
                            "danger"
                        )
                    );
                } else {
                    actions.textContent = "—";
                }

                return [
                    `#${item.requestId}`,
                    `#${item.bookingId}`,
                    item.customerName,
                    item.reason,
                    dateTime(item.requestedAt),
                    cell(item.status),
                    money(item.depositAmount),
                    `${Number(item.refundRate)}%`,
                    money(item.estimatedRefund),
                    actions
                ];
            });

            cancelResults.replaceChildren(
                table(
                    [
                        "Yêu cầu",
                        "Đơn",
                        "Khách hàng",
                        "Lý do",
                        "Ngày gửi",
                        "Trạng thái",
                        "Tiền cọc",
                        "Tỷ lệ",
                        "Dự kiến hoàn",
                        "Thao tác"
                    ],
                    rows
                )
            );
        }

        function renderRefunds() {
            refundCount.textContent =
                `${refunds.length} giao dịch hoàn cọc`;

            const rows = refunds.map(item => {
                const actions = el("div", "", "admin-actions");

                if (item.status === "Chờ hoàn") {
                    actions.appendChild(
                        actionButton(
                            "Xác nhận đã hoàn",
                            () => confirmRefund(item)
                        )
                    );
                } else {
                    actions.textContent = "—";
                }

                return [
                    `#${item.refundId}`,
                    `#${item.bookingId}`,
                    money(item.amount),
                    cell(item.status),
                    item.paymentMethod || "—",
                    item.transactionReference || "—",
                    dateTime(item.refundedAt),
                    actions
                ];
            });

            refundResults.replaceChildren(
                table(
                    [
                        "Mã hoàn",
                        "Đơn",
                        "Số tiền",
                        "Trạng thái",
                        "Phương thức",
                        "Mã giao dịch",
                        "Ngày hoàn",
                        "Thao tác"
                    ],
                    rows
                )
            );
        }

        async function approveCancellation(item) {
            const text =
                `Duyệt hủy đơn #${item.bookingId}?\n` +
                `Tiền cọc: ${money(item.depositAmount)}\n` +
                `Dự kiến hoàn: ${money(item.estimatedRefund)}\n\n` +
                "Duyệt sẽ hủy đơn và giải phóng lịch phòng.";

            if (!confirm(text)) return;

            const note = prompt(
                "Ghi chú xử lý (có thể để trống):",
                ""
            );

            if (note === null) return;

            if (note.length > 500) {
                alert("Ghi chú tối đa 500 ký tự.");
                return;
            }

            try {
                const result = await cancellationPost(
                    `${item.requestId}/approve`,
                    { note }
                );

                showMessage(result.message || "Đã duyệt yêu cầu.");
                await refreshAll();
            } catch (error) {
                showMessage(error.message);
            }
        }

        async function rejectCancellation(item) {
            const note = prompt(
                `Lý do từ chối yêu cầu #${item.requestId} ` +
                "(từ 5 đến 500 ký tự):",
                ""
            );

            if (note === null) return;

            if (note.trim().length < 5 ||
                note.trim().length > 500) {
                alert("Vui lòng nhập lý do từ 5 đến 500 ký tự.");
                return;
            }

            if (!confirm(
                `Xác nhận từ chối yêu cầu #${item.requestId}?`
            )) {
                return;
            }

            try {
                const result = await cancellationPost(
                    `${item.requestId}/reject`,
                    { note: note.trim() }
                );

                showMessage(
                    result.message || "Đã từ chối yêu cầu."
                );

                await refreshAll();
            } catch (error) {
                showMessage(error.message);
            }
        }

        async function confirmRefund(item) {
            alert(
                "Chỉ xác nhận sau khi đã chuyển tiền thật " +
                "và kiểm tra giao dịch thành công."
            );

            const method = prompt(
                "Phương thức đã hoàn tiền " +
                "(ví dụ: Chuyển khoản ngân hàng):",
                "Chuyển khoản ngân hàng"
            );

            if (method === null) return;

            const reference = prompt(
                "Nhập mã giao dịch hoàn tiền thực tế:",
                ""
            );

            if (reference === null) return;

            const note = prompt(
                "Ghi chú (có thể để trống):",
                ""
            );

            if (note === null) return;

            if (
                method.trim().length < 2 ||
                method.trim().length > 50 ||
                reference.trim().length < 3 ||
                reference.trim().length > 100 ||
                note.trim().length > 500
            ) {
                alert("Thông tin giao dịch hoàn tiền không hợp lệ.");
                return;
            }

            if (!confirm(
                `Xác nhận đã hoàn ${money(item.amount)} ` +
                `cho đơn #${item.bookingId}?\n\n` +
                "Thao tác này chỉ ghi nhận hoàn tiền " +
                "trong website, KHÔNG chuyển tiền tự động."
            )) {
                return;
            }

            try {
                const result = await cancellationPost(
                    `refunds/${item.refundId}/confirm`,
                    {
                        paymentMethod: method.trim(),
                        transactionReference: reference.trim(),
                        note: note.trim()
                    }
                );

                showMessage(
                    result.message || "Đã ghi nhận hoàn cọc."
                );

                await refreshAll();
            } catch (error) {
                showMessage(error.message);
            }
        }

        async function refreshAll() {
            cancelRefresh.disabled = true;

            try {
                const bookingData = await api("bookings");

                const [cancelData, refundData] = await Promise.all([
                    requestJson("/api/cancellations/management"),
                    requestJson("/api/cancellations/refunds")
                ]);

                bookings = Array.isArray(bookingData.items)
                    ? bookingData.items
                    : [];

                cancellations = Array.isArray(cancelData.requests)
                    ? cancelData.requests
                    : [];

                refunds = Array.isArray(refundData.refunds)
                    ? refundData.refunds
                    : [];

                renderBookings();
                renderCancellations();
                renderRefunds();

            } catch (error) {
                showMessage(
                    "Không tải được dữ liệu quản lý: " +
                    error.message
                );
            } finally {
                cancelRefresh.disabled = false;
            }
        }

        search.addEventListener("input", renderBookings);
        statusFilter.addEventListener("change", renderBookings);
        checkInFilter.addEventListener("change", renderBookings);

        await refreshAll();
    }
};
