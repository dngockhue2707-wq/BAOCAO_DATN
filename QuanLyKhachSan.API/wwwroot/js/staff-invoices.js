
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

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
        serviceDetails: document.getElementById("invoiceServiceDetails"),
    };

    let invoices = [];
    let keyword = "";
    let selectedStatus = "Tất cả";
    let currentInvoice = null;

    function value(item, ...keys) {
        for (const key of keys) {
            if (item[key] !== undefined && item[key] !== null) {
                return item[key];
            }
        }
        return null;
    }

    function setText(element, content) {
        if (element) {
            element.textContent = content ?? "Chưa có dữ liệu";
        }
    }

    function money(amount) {
        return s.money(Number(amount || 0));
    }

    function date(value) {
        return value ? s.date(value) : "Chưa có dữ liệu";
    }

    function button(label, callback) {
        return s.button(label, callback);
    }

    async function load() {
        try {
            const data = await s.api("operations/invoices");
            invoices = data.items || [];
            render();
        } catch (error) {
            s.notify(error.message || "Không thể tải danh sách hóa đơn.", true);
        }
    }

    function fillInvoice(invoice) {
        setText(elements.id, "#" + invoice.id);
        setText(elements.bookingId, invoice.bookingId ? "#" + invoice.bookingId : "—");
        setText(elements.date, date(invoice.date));
        setText(elements.status, invoice.status);
        setText(elements.customer, invoice.customer);
        setText(elements.room, value(invoice, "room", "roomNumber") || "Chưa có dữ liệu");
        setText(elements.checkIn, date(value(invoice, "checkIn", "ngayNhan")));
        setText(elements.checkOut, date(value(invoice, "checkOut", "ngayTra")));

        setText(elements.roomAmount, money(invoice.roomAmount));
        setText(elements.serviceAmount, money(invoice.serviceAmount));
        setText(elements.deposit, money(invoice.deposit));
        setText(elements.discount, money(invoice.discount));
        setText(elements.total, money(invoice.total));
        setText(elements.paid, money(invoice.paid));
        setText(elements.remaining, money(invoice.remaining));
    }

    function renderPaymentHistory(items) {
        const tbody = elements.paymentHistory;
        if (!tbody) return;

        tbody.replaceChildren();

        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.textContent = "Chưa có giao dịch thanh toán.";

            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        items.forEach(item => {
            const row = document.createElement("tr");

            const values = [
                date(item.date),
                item.method || "Không rõ",
                money(item.amount),
                item.status || "Chưa xác định"
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }

    async function loadPayments(invoice) {
        if (!elements.paymentHistory) return;

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "Đang tải lịch sử thanh toán...";

        row.appendChild(cell);
        elements.paymentHistory.replaceChildren(row);

        try {
            const data = await s.api(
                `operations/invoices/${invoice.id}/payments`
            );

            renderPaymentHistory(data.items || []);
        } catch (error) {
            renderPaymentHistory([]);
            s.notify(error.message || "Không thể tải lịch sử thanh toán.", true);
        }
    }

    function renderRooms(items) {
        const tbody = elements.roomDetails;
        if (!tbody) return;

        tbody.replaceChildren();

        if (!items.length) {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = "Không có thông tin phòng.";
            return;
        }

        items.forEach(item => {
            const row = tbody.insertRow();

            [
                item.roomNumber,
                item.floor == null ? "Chưa xác định" : item.floor,
                item.quantity,
                money(item.amount)
            ].forEach(value => {
                row.insertCell().textContent = value;
            });
        });
    }

    function renderServices(items) {
        const tbody = elements.serviceDetails;
        if (!tbody) return;

        tbody.replaceChildren();

        if (!items.length) {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = "Khách chưa sử dụng dịch vụ.";
            return;
        }

        items.forEach(item => {
            const row = tbody.insertRow();

            [
                item.name,
                item.quantity,
                money(item.unitPrice),
                money(item.amount),
                date(item.date)
            ].forEach(value => {
                row.insertCell().textContent = value;
            });
        });
    }


    async function showDetail(invoice) {
        try {
            currentInvoice = invoice;

            const data = await s.api(
                `operations/invoices/${invoice.id}/detail`
            );

            const detail = data.invoice;

            setText(elements.id, "#" + detail.id);
            setText(elements.bookingId, "#" + detail.bookingId);
            setText(elements.date, date(detail.date));
            setText(elements.status, detail.status);
            setText(elements.customer, detail.customer);
            setText(elements.checkIn, date(detail.checkIn));
            setText(elements.checkOut, date(detail.checkOut));

            setText(elements.roomAmount, money(detail.roomAmount));
            setText(elements.serviceAmount, money(detail.serviceAmount));
            setText(elements.deposit, money(detail.deposit));
            setText(elements.discount, money(detail.discount));
            setText(elements.total, money(detail.total));
            setText(elements.paid, money(invoice.paid));
            setText(elements.remaining, money(detail.remaining));

            setText(
                elements.room,
                (data.rooms || []).map(x => x.roomNumber).join(", ") || "Chưa có phòng"
            );

            renderRooms(data.rooms || []);
            renderServices(data.services || []);
            renderPaymentHistory(data.payments || []);

            if (elements.modal) {
                elements.modal.hidden = false;
                document.body.classList.add("invoice-modal-open");
            }
        } catch (error) {
            s.notify(error.message || "Không thể tải chi tiết hóa đơn.", true);
        }
    }

    function closeDetail() {
        if (elements.modal) {
            elements.modal.hidden = true;
        }

        document.body.classList.remove("invoice-modal-open");
        document.body.classList.remove("invoice-print-mode");

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
            s.notify("Hóa đơn đã được thanh toán đầy đủ.", true);
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

            s.notify(result.message || "Đã ghi nhận thanh toán.");
            await load();
        } catch (error) {
            s.notify(error.message || "Không thể ghi nhận thanh toán.", true);
        }
    }

    function render() {
        const panel = s.panel("Danh sách hóa đơn");
        const filters = s.el("div", "", "staff-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Tìm mã hóa đơn, mã đặt phòng, khách hàng...";
        search.value = keyword;

        const status = document.createElement("select");

        [
            "Tất cả",
            "Chưa thanh toán",
            "Thanh toán một phần",
            "Đã thanh toán"
        ].forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            status.appendChild(option);
        });

        status.value = selectedStatus;
        filters.append(search, status);

        const result = s.el("div");

        function update() {
            keyword = search.value.trim().toLocaleLowerCase("vi");
            selectedStatus = status.value;

            const filtered = invoices.filter(item => {
                const text = [
                    item.id,
                    item.bookingId,
                    item.customer
                ].join(" ").toLocaleLowerCase("vi");

                return text.includes(keyword) &&
                    (selectedStatus === "Tất cả" ||
                        item.status === selectedStatus);
            });

            const rows = filtered.map(item => {
                const actions = s.el("div", "", "staff-actions");

                actions.appendChild(
                    button("Xem chi tiết", () => showDetail(item))
                );

                if (Number(item.remaining || 0) > 0) {
                    actions.appendChild(
                        button("Thu tiền mặt", () => collectCash(item))
                    );
                }

                return [
                    "#" + item.id,
                    "#" + item.bookingId,
                    item.customer,
                    date(item.date),
                    money(item.total),
                    money(item.deposit),
                    money(item.paid),
                    money(item.remaining),
                    item.status,
                    actions
                ];
            });

            result.replaceChildren(
                s.el("p", `Hiển thị ${filtered.length}/${invoices.length} hóa đơn`),
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

        panel.append(filters, result);
        s.content.replaceChildren(panel);

        update();
    }

    elements.close?.addEventListener("click", closeDetail);
    elements.closeFooter?.addEventListener("click", closeDetail);
    elements.print?.addEventListener("click", printInvoice);

    elements.modal?.addEventListener("click", event => {
        if (event.target === elements.modal) {
            closeDetail();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && elements.modal && !elements.modal.hidden) {
            closeDetail();
        }
    });

    load();
});
