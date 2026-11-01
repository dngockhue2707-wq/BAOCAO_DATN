
"use strict";

window.Staff = {
    page: document.body.dataset.page,
    root: null,
    content: null,
    message: null,

    titles: {
        dashboard: "Tổng quan lễ tân",
        bookings: "Quản lý đặt phòng",
        "check-in-out": "Nhận và trả phòng",
        rooms: "Tình trạng phòng",
        services: "Dịch vụ khách sử dụng",
        invoices: "Hóa đơn",
        requests: "Yêu cầu khách hàng"
    },

    el(tag, value = "", className = "") {
        const node = document.createElement(tag);
        node.textContent = String(value ?? "");
        if (className) node.className = className;
        return node;
    },

    button(label, callback) {
        const node = this.el("button", label, "staff-action");
        node.type = "button";
        node.addEventListener("click", callback);
        return node;
    },

    date(value) {
        if (!value) return "—";
        return new Date(value).toLocaleDateString("vi-VN");
    },

    money(value) {
        return Number(value || 0).toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        });
    },

    notify(value, isError = false) {
        if (!this.message) return;
        this.message.textContent = value;
        this.message.classList.toggle("error", isError);
    },

    async csrf() {
        const response = await fetch("/api/account/csrf-token", {
            credentials: "same-origin"
        });
        if (!response.ok) throw new Error("Không lấy được mã bảo vệ.");
        const data = await response.json();
        return data.csrfToken;
    },

    async api(path, method = "GET", body) {
        const headers = {};
        if (method !== "GET") {
            headers["X-CSRF-TOKEN"] = await this.csrf();
            if (body !== undefined) headers["Content-Type"] = "application/json";
        }

        const response = await fetch("/api/staff/" + path, {
            method,
            credentials: "same-origin",
            headers,
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Thao tác thất bại.");
        return data;
    },

    table(headers, rows) {
        const wrapper = this.el("div", "", "staff-table-wrap");
        const table = this.el("table", "", "staff-table");
        const head = document.createElement("thead");
        const tr = document.createElement("tr");

        headers.forEach(title => tr.appendChild(this.el("th", title)));
        head.appendChild(tr);

        const tbody = document.createElement("tbody");
        if (!rows.length) {
            const cell = this.el("td", "Không có dữ liệu phù hợp.");
            cell.colSpan = headers.length;
            const empty = document.createElement("tr");
            empty.appendChild(cell);
            tbody.appendChild(empty);
        }

        rows.forEach(values => {
            const line = document.createElement("tr");
            values.forEach(value => {
                const cell = document.createElement("td");
                if (value instanceof Node) cell.appendChild(value);
                else cell.textContent = String(value ?? "—");
                line.appendChild(cell);
            });
            tbody.appendChild(line);
        });

        table.append(head, tbody);
        wrapper.appendChild(table);
        return wrapper;
    },

    panel(title) {
        const panel = this.el("section", "", "staff-panel");
        panel.appendChild(this.el("h2", title));
        return panel;
    },

    async action(path, text, reload, body) {
        if (!confirm(text)) return;
        try {
            this.notify("Đang xử lý...");
            const result = await this.api(path, "POST", body);
            await reload();
            this.notify(result.message || "Thao tác thành công.");
        } catch (error) {
            this.notify(error.message, true);
        }
    },

    async init() {
        const root = document.getElementById("staffApp");
        if (!root) return;

        this.root = root;

        const shell = this.el("div", "", "staff-shell");
        const sidebar = this.el("div");
        sidebar.id = "staffSidebar";

        const main = this.el("main", "", "staff-main");
        const heading = this.el("div", "", "staff-heading");
        heading.append(
            this.el("span", "DNK HOTEL · NHÂN VIÊN"),
            this.el("h1", this.titles[this.page] || "Nhân viên"),
            this.el("p", "Hệ thống quản lý nghiệp vụ khách sạn.")
        );

        this.message = this.el("p", "", "staff-message");
        this.message.setAttribute("role", "status");
        this.content = this.el("div");

        main.append(heading, this.message, this.content);
        shell.append(sidebar, main);
        root.replaceChildren(shell);

        document.dispatchEvent(new CustomEvent("staff-shell-ready"));

        try {
            const response = await fetch("/api/account/profile", {
                credentials: "same-origin"
            });

            if (response.status === 401) {
                location.href = "/login.html";
                return;
            }

            if (!response.ok) throw new Error("Không xác thực được tài khoản.");

            const user = await response.json();
            if (user.role !== "Staff") {
                this.notify("Bạn không có quyền truy cập trang nhân viên.", true);
                return;
            }

            document.dispatchEvent(new CustomEvent("staff-auth-ready"));
        } catch (error) {
            this.notify(error.message, true);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => Staff.init());
