
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body.dataset.page || "dashboard";
    const root = document.getElementById("adminApp");

    const pages = {
        dashboard: "Tổng quan",
        rooms: "Quản lý phòng",
        bookings: "Quản lý đặt phòng",
        customers: "Khách hàng",
        employees: "Nhân viên",
        services: "Dịch vụ",
        invoices: "Hóa đơn",
        reports: "Doanh thu"
    };

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const date = value => value
        ? new Date(value).toLocaleDateString("vi-VN")
        : "—";

    function el(tag, text, className = "") {
        const node = document.createElement(tag);
        if (text !== undefined && text !== null) {
            node.textContent = String(text);
        }
        if (className) node.className = className;
        return node;
    }

    function button(text, onClick, style = "") {
        const node = el("button", text, `admin-button ${style}`);
        node.type = "button";
        node.addEventListener("click", onClick);
        return node;
    }

    function field(label, input) {
        const wrap = el("div", "", "admin-field");
        const lbl = el("label", label);
        wrap.append(lbl, input);
        return wrap;
    }

    function input(type = "text", value = "") {
        const node = document.createElement("input");
        node.className = "admin-input";
        node.type = type;
        node.value = value;
        return node;
    }

    function select(values, selectedValue) {
        const node = document.createElement("select");
        node.className = "admin-select";

        values.forEach(value => {
            node.add(new Option(value, value));
        });

        node.value = selectedValue;
        return node;
    }

    function panel(title) {
        const section = el("section", "", "admin-panel");
        section.appendChild(el("h2", title));
        return section;
    }

    function stat(label, value) {
        const card = el("article", "", "admin-stat");
        card.append(el("span", label), el("strong", value));
        return card;
    }

    function table(headers, rows) {
        const wrapper = el("div", "", "admin-table-wrapper");
        const tbl = el("table", "", "admin-table");
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");

        headers.forEach(header => {
            tr.appendChild(el("th", header));
        });

        thead.appendChild(tr);
        tbl.appendChild(thead);

        const tbody = document.createElement("tbody");

        rows.forEach(values => {
            const row = document.createElement("tr");

            values.forEach(value => {
                const td = document.createElement("td");

                if (value instanceof Node) {
                    td.appendChild(value);
                } else {
                    td.textContent = String(value ?? "—");
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        if (rows.length === 0) {
            const emptyRow = document.createElement("tr");
            const cell = el("td", "Chưa có dữ liệu.", "admin-empty");
            cell.colSpan = headers.length;
            emptyRow.appendChild(cell);
            tbody.appendChild(emptyRow);
        }

        tbl.appendChild(tbody);
        wrapper.appendChild(tbl);
        return wrapper;
    }

    async function api(path, options = {}) {
        const response = await fetch(`/api/admin/${path}`, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Không thể tải dữ liệu.");
        }

        return data;
    }

    async function csrf() {
        const response = await fetch("/api/account/csrf-token", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        const data = await response.json();
        return data.csrfToken;
    }

    async function write(method, path, body) {
        const token = await csrf();

        return api(path, {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": token
            },
            body: JSON.stringify(body)
        });
    }

    async function logout() {
        try {
            const token = await csrf();

            const response = await fetch("/api/account/logout", {
                method: "POST",
                headers: { "X-CSRF-TOKEN": token },
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Đăng xuất thất bại.");
            }

            location.href = "/login.html";
        } catch (error) {
            showMessage(error.message);
        }
    }

    const shell = el("div", "", "admin-shell");

    const sidebar = document.createElement("div");
    sidebar.id = "adminSidebar";

    const main = el("main", "", "admin-main");
    const topbar = el("header", "", "admin-topbar");
    const heading = document.createElement("div");

    heading.append(
        el("span", "DNK HOTEL · QUẢN TRỊ", "admin-label"),
        el("h1", pages[page] || "Quản trị")
    );

    const user = el("div", "Quản trị viên", "admin-user");
    topbar.append(heading, user);

    const message = el("p", "", "admin-message");
    message.setAttribute("role", "status");

    const content = document.createElement("div");

    main.append(topbar, message, content);
    shell.append(sidebar, main);
    root.appendChild(shell);
    
    document.addEventListener("DOMContentLoaded", loadAdminLayout);
    document.addEventListener("admin-shell-ready", loadAdminLayout);

    function showMessage(value) {
        message.textContent = value;
    }

    // KIỂM TRA ĐĂNG NHẬP ADMIN
    try {
        const response = await fetch("/api/account/profile", {
            credentials: "same-origin"
        });

        if (response.status === 401) {
            location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Không thể kiểm tra phiên đăng nhập.");
        }

        const account = await response.json();

        if (account.role !== "Admin") {
            content.replaceChildren(
                el("p", "Bạn không có quyền truy cập khu Admin.")
            );
            return;
        }

        user.textContent = account.username || "Quản trị viên";

    } catch (error) {
        showMessage(error.message);
        return;
    }

    async function loadDashboard() {
        const data = await api("dashboard");
        const stats = el("section", "", "admin-stats");

        [
            ["Tổng phòng", data.totalRooms],
            ["Phòng trạng thái trống", data.availableRooms],
            ["Đơn chờ xác nhận", data.pendingBookings],
            ["Khách hàng", data.totalCustomers],
            ["Nhân viên", data.totalEmployees],
            ["Dịch vụ hoạt động", data.activeServices]
        ].forEach(([label, value]) => {
            stats.appendChild(stat(label, value));
        });

        const box = panel("Điều hướng nhanh");

        [
            ["Xem danh sách phòng", "/admin/rooms.html"],
            ["Duyệt đặt phòng", "/admin/bookings.html"],
            ["Quản lý dịch vụ", "/admin/services.html"],
            ["Xem Doanh thu", "/admin/reports.html"]
        ].forEach(([label, href]) => {
            const a = el("a", label, "admin-button");
            a.href = href;
            a.style.marginRight = "10px";
            a.style.marginBottom = "10px";
            box.appendChild(a);
        });

        content.replaceChildren(stats, box);
    }

    async function loadBookings() {
        if (!window.AdminBookings) {
            throw new Error("Không tải được chức năng quản lý đặt phòng.");
        }

        await window.AdminBookings.init({
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
        });
    }

    async function loadEmployees() {
        const data = await api("employees");
        const box = panel("Danh sách nhân viên");

        box.appendChild(table(
            ["Mã", "Họ tên", "Tài khoản", "Chức vụ",
             "Số điện thoại", "Email", "Trạng thái"],
            data.items.map(e => [
                e.id,
                e.name,
                e.username,
                e.position,
                e.phone,
                e.email,
                e.active ? "Đang làm việc" : "Ngừng hoạt động"
            ])
        ));

        content.replaceChildren(box);
    }

    async function loadServices() {
        const data = await api("services");
        const formBox = panel("Thêm / sửa dịch vụ");

        const name = input();
        const unit = input();
        const price = input("number", "0");
        price.min = "0";
        price.step = "1000";

        const description = document.createElement("textarea");
        description.className = "admin-textarea";
        description.rows = 3;

        const active = document.createElement("input");
        active.type = "checkbox";
        active.checked = true;

        const form = el("form", "", "admin-form");
        const nameField = field("Tên dịch vụ", name);
        const unitField = field("Đơn vị tính", unit);
        const priceField = field("Đơn giá (VNĐ)", price);
        const descField = field("Mô tả", description);
        descField.classList.add("full-width");
        const activeField = field("Đang hoạt động", active);

        form.append(
            nameField, unitField, priceField,
            descField, activeField
        );

        const submit = el("button", "Thêm dịch vụ", "admin-button");
        submit.type = "submit";

        const reset = button("Làm mới", () => {
            editingId = null;
            form.reset();
            submit.textContent = "Thêm dịch vụ";
        }, "secondary");

        const actions = el("div", "", "admin-actions full-width");
        actions.append(submit, reset);
        form.appendChild(actions);

        let editingId = null;

        form.addEventListener("submit", async event => {
            event.preventDefault();

            submit.disabled = true;

            try {
                const payload = {
                    name: name.value.trim(),
                    unit: unit.value.trim(),
                    price: Number(price.value),
                    description: description.value.trim(),
                    active: active.checked
                };

                const result = editingId === null
                    ? await write("POST", "services", payload)
                    : await write(
                        "PUT", `services/${editingId}`, payload
                    );

                showMessage(result.message);
                await loadServices();

            } catch (error) {
                showMessage(error.message);
            } finally {
                submit.disabled = false;
            }
        });

        formBox.appendChild(form);

        const listBox = panel("Danh sách dịch vụ");

        listBox.appendChild(table(
            ["Mã", "Tên dịch vụ", "Đơn vị",
             "Đơn giá", "Trạng thái", "Thao tác"],
            data.items.map(service => {
                const edit = button("Sửa", () => {
                    editingId = service.id;
                    name.value = service.name;
                    unit.value = service.unit;
                    price.value = service.price;
                    description.value = service.description;
                    active.checked = service.active;
                    submit.textContent = "Lưu thay đổi";
                    window.scrollTo({ top: 0, behavior: "smooth" });
                });

                return [
                    service.id,
                    service.name,
                    service.unit,
                    money(service.price),
                    service.active ? "Hoạt động" : "Tạm ngừng",
                    edit
                ];
            })
        ));

        content.replaceChildren(formBox, listBox);
    }
    
    async function loadInvoices() {
        const data = await api("invoices");
        const box = panel("Danh sách hóa đơn");

        const overlay = el("div", "", "invoice-modal-overlay");
        overlay.style.cssText = `
            display:none;
            position:fixed;
            inset:0;
            z-index:9999;
            background:rgba(25,20,16,.65);
            align-items:center;
            justify-content:center;
            padding:24px;
        `;

        const modal = el("div", "", "invoice-modal");
        modal.style.cssText = `
            background:#fff;
            width:min(950px,100%);
            max-height:90vh;
            overflow-y:auto;
            border-radius:14px;
            padding:28px;
            box-shadow:0 20px 60px rgba(0,0,0,.2);
        `;

        const modalHeader = el("div", "", "invoice-modal-header");
        modalHeader.style.cssText = `
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:16px;
            margin-bottom:22px;
        `;

        const modalTitle = el("h2", "Chi tiết hóa đơn");
        const closeButton = button("×", closeModal, "secondary");
        closeButton.style.cssText = `
            font-size:25px;
            min-width:42px;
            height:42px;
        `;

        modalHeader.append(modalTitle, closeButton);

        const modalBody = el("div", "");
        modal.append(modalHeader, modalBody);
        overlay.appendChild(modal);

        function closeModal() {
            overlay.style.display = "none";
            document.body.style.overflow = "";
        }

        function detailSection(title, rows) {
            const section = el("section", "", "admin-panel");
            section.style.marginBottom = "18px";
            section.appendChild(el("h3", title));

            const grid = el("div", "");
            grid.style.cssText = `
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
                gap:14px;
            `;

            rows.forEach(([label, value]) => {
                const item = el("div", "");
                item.style.cssText = `
                    padding:12px;
                    background:#FAF8F5;
                    border-radius:8px;
                `;

                const name = el("div", label);
                name.style.cssText = `
                    color:#817569;
                    font-size:13px;
                    margin-bottom:6px;
                `;

                const contentValue = el("strong", value ?? "—");
                contentValue.style.color = "#30251E";

                item.append(name, contentValue);
                grid.appendChild(item);
            });

            section.appendChild(grid);
            return section;
        }

        function renderHistory(title, headers, rows) {
            const section = panel(title);
            section.style.marginBottom = "18px";

            section.appendChild(table(headers, rows));
            return section;
        }

        async function showInvoiceDetail(id) {
            try {
                modalBody.replaceChildren(
                    el("p", "Đang tải thông tin hóa đơn...")
                );

                modalTitle.textContent = `Chi tiết hóa đơn #${id}`;
                overlay.style.display = "flex";
                document.body.style.overflow = "hidden";

                const result = await api(`invoices/${id}`);
                const invoice = result.invoice;

                if (!invoice) {
                    throw new Error("Không tìm thấy thông tin hóa đơn.");
                }

                modalBody.replaceChildren();

                modalBody.appendChild(detailSection(
                    "Thông tin khách hàng",
                    [
                        ["Họ tên", invoice.customer],
                        ["Số điện thoại", invoice.phone],
                        ["Email", invoice.email]
                    ]
                ));

                modalBody.appendChild(detailSection(
                    "Thông tin đặt phòng",
                    [
                        ["Mã đặt phòng", `#${invoice.bookingId}`],
                        ["Ngày nhận phòng", date(invoice.checkIn)],
                        ["Ngày trả phòng", date(invoice.checkOut)],
                        ["Trạng thái đặt phòng", invoice.bookingStatus]
                    ]
                ));

                modalBody.appendChild(detailSection(
                    "Thông tin hóa đơn",
                    [
                        ["Ngày lập", date(invoice.date)],
                        ["Tiền phòng", money(invoice.roomAmount)],
                        ["Tiền dịch vụ", money(invoice.serviceAmount)],
                        ["Tiền đặt cọc", money(invoice.deposit)],
                        ["Giảm giá", money(invoice.discount)],
                        ["Tổng tiền", money(invoice.total)],
                        ["Còn phải thu", money(invoice.remaining)],
                        ["Trạng thái", invoice.status]
                    ]
                ));

                if (invoice.note) {
                    modalBody.appendChild(
                        detailSection("Ghi chú", [["Nội dung", invoice.note]])
                    );
                }

                modalBody.appendChild(renderHistory(
                    "Lịch sử đặt cọc",
                    ["Mã cọc", "Số tiền", "Phương thức", "Ngày", "Mã giao dịch", "Trạng thái"],
                    (result.deposits || []).map(x => [
                        x.id,
                        money(x.amount),
                        x.method,
                        date(x.date),
                        x.transactionCode,
                        x.status
                    ])
                ));

                modalBody.appendChild(renderHistory(
                    "Lịch sử thanh toán",
                    ["Mã thanh toán", "Số tiền", "Phương thức", "Ngày", "Mã giao dịch", "Trạng thái"],
                    (result.payments || []).map(x => [
                        x.id,
                        money(x.amount),
                        x.method,
                        date(x.date),
                        x.transactionCode,
                        x.status
                    ])
                ));

            } catch (error) {
                modalBody.replaceChildren(
                    el("p", error.message)
                );
            }
        }

        overlay.addEventListener("click", event => {
            if (event.target === overlay) closeModal();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && overlay.style.display === "flex") {
                closeModal();
            }
        });

        box.appendChild(table(
            [
                "Mã hóa đơn",
                "Mã đặt phòng",
                "Khách hàng",
                "Ngày lập",
                "Tiền phòng",
                "Dịch vụ",
                "Tổng tiền",
                "Còn lại",
                "Trạng thái",
                "Thao tác"
            ],
            data.items.map(i => [
                `#${i.id}`,
                `#${i.bookingId}`,
                i.customer,
                date(i.date),
                money(i.roomAmount),
                money(i.serviceAmount),
                money(i.total),
                money(i.remaining),
                i.status,
                button("Xem chi tiết", () => showInvoiceDetail(i.id))
            ])
        ));

        content.replaceChildren(box, overlay);
    }

    async function loadReports() {
        const currentYear = new Date().getFullYear();

        const yearSelect = select(
            Array.from({ length: 5 }, (_, i) => String(currentYear - i)),
            String(currentYear)
        );

        async function renderReports(year) {
            const data = await api(`reports?year=${year}`);

            const stats = el("section", "", "admin-stats");

            [
                ["Tổng lượt đặt phòng", data.totalBookings],
                ["Đơn đã trả phòng", data.completedBookings],
                ["Đơn đã hủy", data.cancelledBookings],
                ["Tổng giá trị hóa đơn", money(data.invoicedAmount)],
                ["Doanh thu đã thu", money(data.receivedAmount)]
            ].forEach(([label, value]) => {
                stats.appendChild(stat(label, value));
            });

            const filterBox = panel("Bộ lọc Doanh thu");
            filterBox.appendChild(
                field("Năm thống kê", yearSelect)
            );

            const chartBox = panel(`Doanh thu theo tháng - ${data.year}`);

            const chartLegend = el("div", "");
            chartLegend.style.cssText = `
                display:flex;
                gap:20px;
                flex-wrap:wrap;
                margin-bottom:20px;
            `;

            chartLegend.append(
                el("span", "■ Giá trị hóa đơn"),
                el("span", "■ Tiền đã thu")
            );

            const chart = el("div", "");
            chart.style.cssText = `
                display:grid;
                grid-template-columns:repeat(12,minmax(0,1fr));
                gap:8px;
                align-items:end;
                min-height:240px;
                padding:15px 0;
                overflow-x:auto;
            `;

            const maxValue = Math.max(
                1,
                ...data.monthly.flatMap(x => [
                    Number(x.invoiceAmount),
                    Number(x.receivedAmount)
                ])
            );

            data.monthly.forEach(item => {
                const column = el("div", "");
                column.style.cssText = `
                    display:flex;
                    flex-direction:column;
                    justify-content:end;
                    align-items:center;
                    min-width:25px;
                    height:220px;
                    gap:7px;
                `;

                const bars = el("div", "");
                bars.style.cssText = `
                    display:flex;
                    align-items:end;
                    justify-content:center;
                    gap:3px;
                    height:190px;
                    width:100%;
                `;

                [
                    [item.invoiceAmount, "#B98B55"],
                    [item.receivedAmount, "#526B52"]
                ].forEach(([value, color]) => {
                    const bar = el("div", "");
                    const amount = Number(value) || 0;

                    bar.style.cssText = `
                        width:35%;
                        min-width:5px;
                        height:${amount > 0
                            ? Math.max(3, amount / maxValue * 180)
                            : 0}px;
                        background:${color};
                        border-radius:4px 4px 0 0;
                    `;

                    bar.title = money(amount);
                    bars.appendChild(bar);
                });

                column.append(
                    bars,
                    el("span", String(item.month).padStart(2, "0"))
                );

                chart.appendChild(column);
            });

            chartBox.append(chartLegend, chart);

            const bookingBox = panel("Thống kê trạng thái đặt phòng");

            bookingBox.appendChild(table(
                ["Trạng thái", "Số lượng"],
                data.bookingStatuses.map(x => [
                    x.status,
                    x.count
                ])
            ));

            const roomBox = panel("Thống kê trạng thái phòng");

            roomBox.appendChild(table(
                ["Trạng thái phòng", "Số lượng"],
                data.roomStatuses.map(x => [
                    x.status,
                    x.count
                ])
            ));

            const monthlyBox = panel("Bảng doanh thu chi tiết");

            monthlyBox.appendChild(table(
                ["Tháng", "Giá trị hóa đơn", "Tiền đã thu"],
                data.monthly.map(x => [
                    `Tháng ${x.month}`,
                    money(x.invoiceAmount),
                    money(x.receivedAmount)
                ])
            ));

            content.replaceChildren(
                stats,
                filterBox,
                chartBox,
                monthlyBox,
                bookingBox,
                roomBox
            );
        }

        yearSelect.addEventListener("change", async () => {
            try {
                showMessage("Đang cập nhật Doanh thu...");
                await renderReports(Number(yearSelect.value));
                showMessage("");
            } catch (error) {
                showMessage(error.message);
            }
        });

        await renderReports(currentYear);
    }

    try {
        showMessage("Đang tải dữ liệu...");

            const loaders = {
                dashboard: loadDashboard,
                bookings: loadBookings,
                services: loadServices,
                invoices: loadInvoices,
                reports: loadReports
            };

        if (!loaders[page]) {
            throw new Error("Trang quản lý không tồn tại.");
        }

        await loaders[page]();
        showMessage("");

    } catch (error) {
        showMessage(error.message);
    }
});
