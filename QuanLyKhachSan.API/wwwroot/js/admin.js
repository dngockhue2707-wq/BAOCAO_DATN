
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
        reports: "Báo cáo"
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

    // TẠO GIAO DIỆN CHUNG
    const shell = el("div", "", "admin-shell");
    const sidebar = el("aside", "", "admin-sidebar");
    const brand = el("div", "DNK HOTEL", "admin-brand");
    const nav = document.createElement("nav");

    Object.entries(pages).forEach(([key, title]) => {
        const link = el("a", title);
        link.href = `/admin/${key}.html`;
        if (page === key) link.classList.add("active");
        nav.appendChild(link);
    });

    sidebar.append(brand, nav);
    sidebar.appendChild(button("Đăng xuất", logout, "secondary"));

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
            ["Xem báo cáo", "/admin/reports.html"]
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
        const data = await api("bookings");
        const box = panel("Danh sách đặt phòng");

        const rows = data.items.map(booking => {
            const actions = el("div", "", "admin-actions");

            if (booking.status === "Chờ xác nhận") {
                [
                    ["Xác nhận", "Đã xác nhận"],
                    ["Hủy", "Đã hủy"]
                ].forEach(([label, status]) => {
                    const action = button(
                        label,
                        async () => {
                            if (!confirm(
                                `Đổi đơn #${booking.id} thành "${status}"?`
                            )) return;

                            action.disabled = true;

                            try {
                                const result = await write(
                                    "PUT",
                                    `bookings/${booking.id}/status`,
                                    { status }
                                );

                                showMessage(result.message);
                                await loadBookings();
                            } catch (error) {
                                showMessage(error.message);
                                action.disabled = false;
                            }
                        },
                        status === "Đã hủy" ? "danger" : ""
                    );

                    actions.appendChild(action);
                });
            } else {
                actions.textContent = "—";
            }

            return [
                `#${booking.id}`,
                booking.customer,
                `${booking.roomType} · ${booking.roomNumber}`,
                `${date(booking.checkIn)} – ${date(booking.checkOut)}`,
                money(booking.total),
                booking.status,
                actions
            ];
        });

        box.appendChild(table(
            ["Mã", "Khách", "Phòng", "Lưu trú",
             "Tiền phòng", "Trạng thái", "Thao tác"],
            rows
        ));

        content.replaceChildren(box);
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

        box.appendChild(table(
            ["Mã hóa đơn", "Mã đặt phòng", "Khách hàng",
             "Ngày lập", "Tiền phòng", "Dịch vụ",
             "Tổng tiền", "Còn lại", "Trạng thái"],
            data.items.map(i => [
                `#${i.id}`,
                `#${i.bookingId}`,
                i.customer,
                date(i.date),
                money(i.roomAmount),
                money(i.serviceAmount),
                money(i.total),
                money(i.remaining),
                i.status
            ])
        ));

        content.replaceChildren(box);
    }

    async function loadReports() {
        const data = await api("reports");
        const stats = el("section", "", "admin-stats");

        [
            ["Tổng lượt đặt phòng", data.totalBookings],
            ["Đơn đã trả phòng", data.completedBookings],
            ["Đơn đã hủy", data.cancelledBookings],
            ["Tổng giá trị hóa đơn", money(data.invoicedAmount)],
            ["Tổng tiền đã thu", money(data.receivedAmount)]
        ].forEach(([label, value]) => {
            stats.appendChild(stat(label, value));
        });

        const box = panel("Ghi chú báo cáo");
        box.appendChild(el(
            "p",
            "Số liệu lấy từ các bảng Đặt phòng, Hóa đơn và Thanh toán. " +
            "Tổng giá trị hóa đơn không đồng nghĩa với doanh thu đã thu."
        ));

        content.replaceChildren(stats, box);
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
