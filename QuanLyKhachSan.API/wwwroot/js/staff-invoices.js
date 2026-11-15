
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;

    const elements = {
        modal: document.getElementById("invoiceDetailModal"),
        close: document.getElementById("closeInvoiceModal"),
        closeFooter: document.getElementById("closeInvoiceModalFooter"),
        print: document.getElementById("printInvoiceButton"),
        paymentHistory: document.getElementById("invoicePaymentHistory"),
        printArea: document.getElementById("invoicePrintArea"),
        id: document.getElementById("detailInvoiceId"),
        bookingId: document.getElementById("detailBookingId"),
        date: document.getElementById("detailDate"),
        status: document.getElementById("detailStatus"),
        customer: document.getElementById("detailCustomer"),
        room: document.getElementById("detailRoom"),
        checkIn: document.getElementById("detailCheckIn"),
        checkOut: document.getElementById("detailCheckOut"),
        roomAmount: document.getElementById("detailRoomAmount"),
        serviceAmount: document.getElementById("detailServiceAmount"),
        deposit: document.getElementById("detailDeposit"),
        discount: document.getElementById("detailDiscount"),
        total: document.getElementById("detailTotal"),
        paid: document.getElementById("detailPaid"),
        remaining: document.getElementById("detailRemaining"),
        roomDetails: document.getElementById("invoiceRoomDetails"),
        serviceDetails: document.getElementById("invoiceServiceDetails")
    };

    let invoices = [];
    let keyword = "";
    let selectedStatus = "Tất cả";
    let currentInvoice = null;

    const el = (tag, className = "", text = "") => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = String(text ?? "");
        return node;
    };

    const value = (item, ...keys) => {
        for (const key of keys) {
            if (item && item[key] !== undefined && item[key] !== null) {
                return item[key];
            }
        }
        return null;
    };

    const setText = (node, content) => {
        if (node) node.textContent = String(content ?? "—");
    };

    const money = amount => s.money(Number(amount) || 0);
    const date = input => input ? s.date(input) : "—";

    const statusBadge = status => {
        const types = {
            "Đã thanh toán": "paid",
            "Thanh toán một phần": "partial",
            "Chưa thanh toán": "unpaid"
        };

        return el(
            "span",
            "iv-status " + (types[status] || "neutral"),
            status
        );
    };

    const stat = (label, amount, symbol, type) => {
        const card = el("article", "iv-stat");
        card.appendChild(el("span", "iv-stat-icon " + type, symbol));

        const info = el("div", "iv-stat-info");
        info.append(
            el("strong", "", amount),
            el("small", "", label)
        );
        card.appendChild(info);
        return card;
    };

    const button = (label, handler, secondary = false) => {
        const node = el(
            "button",
            "iv-button" + (secondary ? " secondary" : ""),
            label
        );
        node.type = "button";
        node.addEventListener("click", handler);
        return node;
    };

    function fillDetails(invoice) {
        setText(elements.id, `#${invoice.id}`);
        setText(
            elements.bookingId,
            invoice.bookingId ? `#${invoice.bookingId}` : "—"
        );
        setText(elements.date, date(invoice.date));
        setText(elements.status, invoice.status);
        setText(elements.customer, invoice.customer);
        setText(
            elements.room,
            value(invoice, "room", "roomNumber") || "—"
        );
        setText(
            elements.checkIn,
            date(value(invoice, "checkIn", "ngayNhan"))
        );
        setText(
            elements.checkOut,
            date(value(invoice, "checkOut", "ngayTra"))
        );
        setText(elements.roomAmount, money(invoice.roomAmount));
        setText(elements.serviceAmount, money(invoice.serviceAmount));
        setText(elements.deposit, money(invoice.deposit));
        setText(elements.discount, money(invoice.discount));
        setText(elements.total, money(invoice.total));
        setText(elements.paid, money(invoice.paid));
        setText(elements.remaining, money(invoice.remaining));
    }

    function fillTable(tbody, records, columns, emptyText) {
        if (!tbody) return;

        tbody.replaceChildren();

        if (!records.length) {
            const row = document.createElement("tr");
            const cell = el("td", "", emptyText);
            cell.colSpan = columns;
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        records.forEach(values => {
            const row = document.createElement("tr");

            values.forEach(item => {
                const cell = document.createElement("td");
                cell.textContent = String(item ?? "—");
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }

    async function showDetail(invoice) {
        try {
            currentInvoice = invoice;

            const data = await s.api(
                `operations/invoices/${invoice.id}/detail`
            );

            const detail = data.invoice || invoice;
            fillDetails({ ...invoice, ...detail });

            const rooms = Array.isArray(data.rooms) ? data.rooms : [];
            const services = Array.isArray(data.services) ? data.services : [];
            const payments = Array.isArray(data.payments) ? data.payments : [];

            setText(
                elements.room,
                rooms.map(x => x.roomNumber).join(", ") ||
                    value(invoice, "room", "roomNumber") ||
                    "—"
            );

            fillTable(
                elements.roomDetails,
                rooms.map(x => [
                    x.roomNumber,
                    x.floor ?? "—",
                    x.quantity,
                    money(x.amount)
                ]),
                4,
                "Không có thông tin phòng."
            );

            fillTable(
                elements.serviceDetails,
                services.map(x => [
                    x.name,
                    x.quantity,
                    money(x.unitPrice),
                    money(x.amount),
                    date(x.date)
                ]),
                5,
                "Khách chưa sử dụng dịch vụ."
            );

            fillTable(
                elements.paymentHistory,
                payments.map(x => [
                    date(x.date),
                    x.method || "—",
                    money(x.amount),
                    x.status || "—"
                ]),
                4,
                "Chưa có giao dịch thanh toán."
            );

            if (elements.modal) {
                elements.modal.hidden = false;
                document.body.classList.add("invoice-modal-open");
            }
        } catch (error) {
            s.notify(
                error.message || "Không thể tải chi tiết hóa đơn.",
                true
            );
        }
    }

    function closeDetail() {
        if (elements.modal) elements.modal.hidden = true;

        document.body.classList.remove(
            "invoice-modal-open",
            "invoice-print-mode"
        );

        currentInvoice = null;
    }

    function printInvoice() {
        if (!currentInvoice || !elements.printArea) return;

        document.body.classList.add("invoice-print-mode");

        window.addEventListener("afterprint", () => {
            document.body.classList.remove("invoice-print-mode");
        }, { once: true });

        window.print();
    }

    async function collectCash(invoice) {
        const remaining = Number(invoice.remaining || 0);

        if (remaining <= 0) {
            s.notify("Hóa đơn đã thanh toán đầy đủ.", true);
            return;
        }

        const raw = prompt(
            `HÓA ĐƠN #${invoice.id}\n` +
            `Khách hàng: ${invoice.customer}\n` +
            `Còn phải thu: ${money(remaining)}\n\n` +
            "Nhập số tiền mặt thực nhận:"
        );

        if (raw === null) return;

        const amount = Number(raw.replace(/[^\d]/g, ""));

        if (!Number.isFinite(amount) || amount <= 0) {
            s.notify("Số tiền thanh toán không hợp lệ.", true);
            return;
        }

        if (amount > remaining) {
            s.notify("Số tiền thu vượt quá công nợ.", true);
            return;
        }

        if (!confirm(
            `Xác nhận đã nhận ${money(amount)} tiền mặt từ khách?`
        )) return;

        try {
            const result = await s.api(
                `operations/invoices/${invoice.id}/cash-payment`,
                "POST",
                { amount }
            );

            await load();
            s.notify(result.message || "Đã ghi nhận thanh toán.");
        } catch (error) {
            s.notify(
                error.message || "Không thể ghi nhận thanh toán.",
                true
            );
        }
    }

    function render() {
        const page = el("div", "iv-page");
        const stats = el("div", "iv-stats");

        const totalPaid = invoices.reduce(
            (sum, item) => sum + (Number(item.paid) || 0),
            0
        );

        const paidCount = invoices.filter(
            item => item.status === "Đã thanh toán"
        ).length;

        const unpaidCount = invoices.filter(
            item => item.status !== "Đã thanh toán"
        ).length;

        stats.append(
            stat("Tổng hóa đơn", invoices.length, "▤", "total"),
            stat("Tổng tiền đã thu", money(totalPaid), "◉", "money"),
            stat("Đã thanh toán", paidCount, "✓", "paid"),
            stat("Chưa hoàn tất", unpaidCount, "◷", "unpaid")
        );

        const panel = el("section", "iv-panel");
        panel.appendChild(
            el("h2", "iv-panel-title", "Danh sách hóa đơn")
        );

        const filters = el("div", "iv-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Mã hóa đơn, mã đặt phòng, khách hàng...";
        search.value = keyword;

        const status = document.createElement("select");

        [
            "Tất cả",
            "Chưa thanh toán",
            "Thanh toán một phần",
            "Đã thanh toán"
        ].forEach(x => status.add(new Option(x, x)));

        status.value = selectedStatus;
        filters.append(search, status);

        const count = el("p", "iv-result");
        const results = el("div");

        function update() {
            keyword = search.value.trim().toLocaleLowerCase("vi-VN");
            selectedStatus = status.value;

            const filtered = invoices.filter(item => {
                const searchable = [
                    item.id,
                    item.bookingId,
                    item.customer
                ].join(" ").toLocaleLowerCase("vi-VN");

                return searchable.includes(keyword) &&
                    (
                        selectedStatus === "Tất cả" ||
                        item.status === selectedStatus
                    );
            });

            count.textContent =
                `Hiển thị ${filtered.length}/${invoices.length} hóa đơn`;

            const rows = filtered.map(item => {
                const actions = el("div", "iv-actions");

                actions.appendChild(
                    button("Chi tiết", () => showDetail(item), true)
                );

                if (Number(item.remaining || 0) > 0) {
                    actions.appendChild(
                        button("Thu tiền", () => collectCash(item))
                    );
                }

                return [
                    el("strong", "iv-id", `#${item.id}`),
                    `#${item.bookingId}`,
                    el("strong", "iv-customer", item.customer),
                    date(item.date),
                    money(item.total),
                    money(item.deposit),
                    money(item.paid),
                    el("strong", "iv-money", money(item.remaining)),
                    statusBadge(item.status),
                    actions
                ];
            });

            results.replaceChildren(
                s.table(
                    [
                        "Mã HĐ",
                        "Mã đặt phòng",
                        "Khách hàng",
                        "Ngày lập",
                        "Tổng tiền",
                        "Đặt cọc",
                        "Đã trả",
                        "Còn lại",
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
        page.append(stats, panel);
        s.content.replaceChildren(page);
        update();
    }

    async function load() {
        try {
            const data = await s.api("operations/invoices");
            invoices = Array.isArray(data.items) ? data.items : [];
            render();
        } catch (error) {
            s.notify(
                error.message || "Không thể tải danh sách hóa đơn.",
                true
            );
        }
    }

    elements.close?.addEventListener("click", closeDetail);
    elements.closeFooter?.addEventListener("click", closeDetail);
    elements.print?.addEventListener("click", printInvoice);

    elements.modal?.addEventListener("click", event => {
        if (event.target === elements.modal) closeDetail();
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            elements.modal &&
            !elements.modal.hidden
        ) {
            closeDetail();
        }
    });

    load();
});
