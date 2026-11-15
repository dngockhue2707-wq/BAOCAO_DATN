
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;

    let bookings = [];
    let cancellations = [];
    let refunds = [];
    let keyword = "";
    let selectedStatus = "Tất cả";
    let activeTab = "bookings";
    let loading = false;

    const root = document.createElement("div");
    root.className = "sb-bookings-page";

    const el = (tag, className = "", text = "") => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = String(text ?? "");
        return node;
    };

    const money = amount =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(amount) || 0);

    const date = value => value ? s.date(value) : "—";

    const dateTime = value => {
        if (!value) return "—";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
            ? String(value)
            : parsed.toLocaleString("vi-VN");
    };

    const badgeClass = status => {
        const classes = {
            "Chờ xác nhận": "waiting",
            "Chờ xử lý": "waiting",
            "Chờ hoàn": "waiting",
            "Đã xác nhận": "confirmed",
            "Đã đặt cọc": "deposit",
            "Đã nhận phòng": "checked-in",
            "Đã trả phòng": "completed",
            "Đã thanh toán": "completed",
            "Đã hủy": "cancelled",
            "Đã hoàn": "completed",
            "Từ chối": "cancelled"
        };

        return classes[status] || "neutral";
    };

    const badge = status => el(
        "span",
        "sb-status " + badgeClass(status),
        status || "—"
    );

    const actionButton = (title, handler, secondary = false) => {
        const button = el(
            "button",
            "sb-button" + (secondary ? " secondary" : ""),
            title
        );

        button.type = "button";
        button.addEventListener("click", handler);
        return button;
    };

    const icon = type => {
        const symbols = {
            total: "▤",
            waiting: "◷",
            confirmed: "✓",
            cancelled: "×"
        };

        return el("span", "sb-stat-icon " + type, symbols[type]);
    };

    const statCard = (title, value, type) => {
        const card = el("article", "sb-stat-card");
        const symbol = icon(type);

        const info = el("div", "sb-stat-info");
        info.append(
            el("strong", "", value),
            el("span", "", title)
        );

        card.append(symbol, info);
        return card;
    };

    const renderStats = () => {
        const stats = el("div", "sb-stats");

        const pending = bookings.filter(x =>
            x.status === "Chờ xác nhận"
        ).length;

        const confirmed = bookings.filter(x =>
            ["Đã xác nhận", "Đã đặt cọc", "Đã nhận phòng",
             "Đã trả phòng"].includes(x.status)
        ).length;

        const cancelled = bookings.filter(x =>
            x.status === "Đã hủy"
        ).length;

        [
            ["Tổng đơn", bookings.length, "total"],
            ["Chờ xác nhận", pending, "waiting"],
            ["Đã xác nhận", confirmed, "confirmed"],
            ["Đã hủy", cancelled, "cancelled"]
        ].forEach(item => stats.appendChild(statCard(...item)));

        return stats;
    };

    const createTabs = () => {
        const tabs = el("div", "sb-tabs");

        [
            ["bookings", "Danh sách đặt phòng"],
            ["cancellations", "Yêu cầu hủy", cancellations.filter(
                x => x.status === "Chờ xử lý"
            ).length],
            ["refunds", "Hoàn cọc", refunds.filter(
                x => x.status === "Chờ hoàn"
            ).length]
        ].forEach(([id, label, count]) => {
            const button = el(
                "button",
                "sb-tab" + (activeTab === id ? " active" : ""),
                label
            );

            button.type = "button";

            if (count) {
                button.appendChild(
                    el("span", "sb-tab-count", count)
                );
            }

            button.addEventListener("click", () => {
                activeTab = id;
                render();
            });

            tabs.appendChild(button);
        });

        return tabs;
    };

    const hasPendingCancellation = bookingId =>
        cancellations.some(x =>
            Number(x.bookingId) === Number(bookingId) &&
            x.status === "Chờ xử lý"
        );

    async function requestJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.title ||
                `HTTP ${response.status}`
            );
        }

        return result;
    }

    async function postCancellation(path, body) {
        const csrf = await requestJson("/api/account/csrf-token");

        if (!csrf.csrfToken) {
            throw new Error("Không lấy được mã bảo mật.");
        }

        return requestJson(`/api/cancellations/${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrf.csrfToken
            },
            body: JSON.stringify(body)
        });
    }

    async function approve(item) {
        if (!confirm(
            `Duyệt hủy đơn #${item.bookingId}?\n` +
            `Tiền cọc: ${money(item.depositAmount)}\n` +
            `Dự kiến hoàn: ${money(item.estimatedRefund)}\n\n` +
            "Đơn sẽ chuyển sang trạng thái Đã hủy."
        )) return;

        const note = prompt("Ghi chú xử lý (có thể để trống):", "");
        if (note === null) return;

        if (note.trim().length > 500) {
            s.notify("Ghi chú tối đa 500 ký tự.", true);
            return;
        }

        try {
            const result = await postCancellation(
                `${item.requestId}/approve`,
                { note: note.trim() }
            );

            await load();
            s.notify(result.message || "Đã duyệt yêu cầu hủy.");
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    async function reject(item) {
        const note = prompt(
            `Nhập lý do từ chối yêu cầu #${item.requestId}:`,
            ""
        );

        if (note === null) return;

        const reason = note.trim();

        if (reason.length < 5 || reason.length > 500) {
            s.notify("Lý do phải từ 5 đến 500 ký tự.", true);
            return;
        }

        if (!confirm(
            `Xác nhận từ chối yêu cầu #${item.requestId}?`
        )) return;

        try {
            const result = await postCancellation(
                `${item.requestId}/reject`,
                { note: reason }
            );

            await load();
            s.notify(result.message || "Đã từ chối yêu cầu.");
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    async function confirmRefund(item) {
        alert(
            "Vui lòng kiểm tra giao dịch hoàn tiền thực tế " +
            "trước khi xác nhận trên website."
        );

        const method = prompt(
            "Phương thức đã hoàn:",
            "Chuyển khoản ngân hàng"
        );
        if (method === null) return;

        const reference = prompt("Mã giao dịch hoàn tiền:", "");
        if (reference === null) return;

        const note = prompt("Ghi chú (có thể để trống):", "");
        if (note === null) return;

        const paymentMethod = method.trim();
        const transactionReference = reference.trim();
        const description = note.trim();

        if (
            paymentMethod.length < 2 ||
            paymentMethod.length > 50 ||
            transactionReference.length < 3 ||
            transactionReference.length > 100 ||
            description.length > 500
        ) {
            s.notify("Thông tin hoàn tiền không hợp lệ.", true);
            return;
        }

        if (!confirm(
            `Xác nhận đã hoàn ${money(item.amount)} ` +
            `cho đơn #${item.bookingId}?\n\n` +
            "Hệ thống chỉ ghi nhận, không tự chuyển tiền."
        )) return;

        try {
            const result = await postCancellation(
                `refunds/${item.refundId}/confirm`,
                {
                    paymentMethod,
                    transactionReference,
                    note: description
                }
            );

            await load();
            s.notify(result.message || "Đã ghi nhận hoàn cọc.");
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    const appendCell = (row, value) => {
        const td = document.createElement("td");

        if (value instanceof Node) {
            td.appendChild(value);
        } else {
            td.textContent = String(value ?? "—");
        }

        row.appendChild(td);
    };

    const table = (headers, records) => {
        const wrapper = el("div", "sb-table-scroll");
        const tableElement = el("table", "sb-table");
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        headers.forEach(header => {
            headerRow.appendChild(el("th", "", header));
        });

        thead.appendChild(headerRow);

        const tbody = document.createElement("tbody");

        if (!records.length) {
            const row = document.createElement("tr");
            const cell = el(
                "td",
                "sb-table-empty",
                "Không có dữ liệu phù hợp."
            );

            cell.colSpan = headers.length;
            row.appendChild(cell);
            tbody.appendChild(row);
        }

        records.forEach(values => {
            const row = document.createElement("tr");
            values.forEach(value => appendCell(row, value));
            tbody.appendChild(row);
        });

        tableElement.append(thead, tbody);
        wrapper.appendChild(tableElement);

        return wrapper;
    };

    const createPanel = title => {
        const panel = el("section", "sb-panel");
        panel.appendChild(el("h2", "sb-panel-title", title));
        return panel;
    };

    function renderBookings() {
        const panel = createPanel("Danh sách đơn đặt phòng");

        const filters = el("div", "sb-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Mã đơn, tên khách, số phòng...";
        search.value = keyword;
        search.setAttribute("aria-label", "Tìm đơn đặt phòng");

        const status = document.createElement("select");
        status.setAttribute("aria-label", "Lọc trạng thái");

        [
            "Tất cả",
            "Chờ xác nhận",
            "Đã xác nhận",
            "Đã đặt cọc",
            "Đã nhận phòng",
            "Đã trả phòng",
            "Đã hủy"
        ].forEach(value => status.add(new Option(value, value)));

        status.value = selectedStatus;
        filters.append(search, status);

        const count = el("p", "sb-result-count");
        const results = el("div");

        function update() {
            keyword = search.value.trim().toLocaleLowerCase("vi-VN");
            selectedStatus = status.value;

            const filtered = bookings.filter(item => {
                const text = [
                    item.id,
                    item.customer,
                    item.roomNumber,
                    item.roomType
                ].join(" ").toLocaleLowerCase("vi-VN");

                return text.includes(keyword) &&
                    (
                        selectedStatus === "Tất cả" ||
                        item.status === selectedStatus
                    );
            });

            count.textContent =
                `Hiển thị ${filtered.length}/${bookings.length} đơn`;

            const rows = filtered.map(item => {
                const actions = el("div", "sb-actions");

                if (
                    item.status === "Chờ xác nhận" &&
                    !hasPendingCancellation(item.id)
                ) {
                    actions.appendChild(
                        actionButton("Xác nhận", () => {
                            if (hasPendingCancellation(item.id)) {
                                s.notify(
                                    "Đơn đang có yêu cầu hủy.",
                                    true
                                );
                                return;
                            }

                            s.action(
                                `bookings/${item.id}/confirm`,
                                `Xác nhận đơn #${item.id}?`,
                                load
                            );
                        })
                    );
                }

                if (hasPendingCancellation(item.id)) {
                    actions.appendChild(
                        el("span", "sb-pending-note", "Chờ xử lý hủy")
                    );
                }

                actions.appendChild(
                    actionButton("Chi tiết", () => {
                        alert(
                            `Mã đơn: #${item.id}\n` +
                            `Khách: ${item.customer}\n` +
                            `Phòng: ${item.roomNumber}\n` +
                            `Loại phòng: ${item.roomType}\n` +
                            `Nhận: ${date(item.checkIn)}\n` +
                            `Trả: ${date(item.checkOut)}\n` +
                            `Trạng thái: ${item.status}`
                        );
                    }, true)
                );

                return [
                    el("strong", "sb-id", "#" + item.id),
                    el("strong", "sb-customer", item.customer),
                    el("span", "sb-room-number", item.roomNumber),
                    item.roomType,
                    date(item.checkIn),
                    date(item.checkOut),
                    badge(item.status),
                    actions
                ];
            });

            results.replaceChildren(
                table(
                    [
                        "Mã đơn",
                        "Khách hàng",
                        "Phòng",
                        "Loại phòng",
                        "Nhận phòng",
                        "Trả phòng",
                        "Trạng thái",
                        "Thao tác"
                    ],
                    rows
                )
            );
        }

        search.addEventListener("input", update);
        status.addEventListener("change", update);

        panel.append(filters, count, results);
        update();

        return panel;
    }

    function renderCancellations() {
        const panel = createPanel("Yêu cầu hủy phòng");

        const pending = cancellations.filter(
            x => x.status === "Chờ xử lý"
        ).length;

        const summary = el(
            "p",
            "sb-result-count",
            `${cancellations.length} yêu cầu · ${pending} đang chờ`
        );

        const rows = cancellations.map(item => {
            const actions = el("div", "sb-actions");

            if (item.status === "Chờ xử lý") {
                actions.append(
                    actionButton("Duyệt", () => approve(item)),
                    actionButton(
                        "Từ chối",
                        () => reject(item),
                        true
                    )
                );
            } else {
                actions.textContent = "—";
            }

            return [
                el("strong", "sb-id", "#" + item.requestId),
                "#" + item.bookingId,
                item.customerName,
                item.reason,
                dateTime(item.requestedAt),
                badge(item.status),
                money(item.depositAmount),
                `${Number(item.refundRate) || 0}%`,
                money(item.estimatedRefund),
                actions
            ];
        });

        panel.append(
            summary,
            table(
                [
                    "Yêu cầu",
                    "Đơn",
                    "Khách hàng",
                    "Lý do",
                    "Ngày gửi",
                    "Trạng thái",
                    "Tiền cọc",
                    "Tỷ lệ hoàn",
                    "Dự kiến hoàn",
                    "Thao tác"
                ],
                rows
            )
        );

        return panel;
    }

    function renderRefunds() {
        const panel = createPanel("Giao dịch hoàn cọc");

        panel.appendChild(
            el(
                "p",
                "sb-result-count",
                `${refunds.length} giao dịch · Chỉ xác nhận sau khi đã hoàn tiền`
            )
        );

        const rows = refunds.map(item => {
            const actions = el("div", "sb-actions");

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
                el("strong", "sb-id", "#" + item.refundId),
                "#" + item.bookingId,
                money(item.amount),
                badge(item.status),
                item.paymentMethod || "—",
                item.transactionReference || "—",
                dateTime(item.refundedAt),
                actions
            ];
        });

        panel.appendChild(
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

        return panel;
    }

    function render() {
        root.replaceChildren(
            renderStats(),
            createTabs()
        );

        if (activeTab === "bookings") {
            root.appendChild(renderBookings());
        }

        if (activeTab === "cancellations") {
            root.appendChild(renderCancellations());
        }

        if (activeTab === "refunds") {
            root.appendChild(renderRefunds());
        }

        s.content.replaceChildren(root);
    }

    async function load() {
        if (loading) return;
        loading = true;

        try {
            const bookingData = await s.api("bookings");

            bookings = Array.isArray(bookingData.items)
                ? bookingData.items
                : [];

            render();

            const [cancelResult, refundResult] =
                await Promise.allSettled([
                    requestJson("/api/cancellations/management"),
                    requestJson("/api/cancellations/refunds")
                ]);

            cancellations = cancelResult.status === "fulfilled" &&
                Array.isArray(cancelResult.value.requests)
                ? cancelResult.value.requests
                : [];

            refunds = refundResult.status === "fulfilled" &&
                Array.isArray(refundResult.value.refunds)
                ? refundResult.value.refunds
                : [];

            if (
                cancelResult.status === "rejected" ||
                refundResult.status === "rejected"
            ) {
                s.notify(
                    "Không tải được đầy đủ yêu cầu hủy hoặc hoàn cọc.",
                    true
                );
            }

            render();
        } catch (error) {
            s.notify(
                error.message || "Không thể tải đơn đặt phòng.",
                true
            );
        } finally {
            loading = false;
        }
    }

    load();
});
