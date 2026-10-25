
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);

    const state = {
        customers: [],
        filtered: [],
        page: 1,
        pageSize: 10,
        csrfToken: ""
    };

    const text = value => {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    };

    const display = value => text(value) || "—";

    function message(value, isError = false) {
        const element = $("customerMessage");

        element.textContent = value;
        element.classList.toggle("error", isError);
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập lại.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền truy cập.");
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return result;
    }

    async function verifyAdmin() {
        const account = await api("/api/account/profile");

        if (account.role !== "Admin") {
            throw new Error("Tài khoản không có quyền quản trị.");
        }

        $("adminUsername").textContent =
            account.username || "Quản trị viên";
    }

    async function getCsrfToken() {
        const data = await api("/api/account/csrf-token");
        state.csrfToken = data.csrfToken;
    }

    function td(value) {
        const cell = document.createElement("td");
        cell.textContent = display(value);
        return cell;
    }

    function getCustomerName(customer) {
        return display(customer.name);
    }

    function renderStatistics() {
        $("totalCustomers").textContent =
            state.customers.length;

        $("customersWithPhone").textContent =
            state.customers.filter(
                customer => text(customer.phone) !== ""
            ).length;

        $("customersWithEmail").textContent =
            state.customers.filter(
                customer => text(customer.email) !== ""
            ).length;
    }
    
    function formatDate(value) {
        if (!value) return "Chưa cập nhật";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Chưa cập nhật";
        }

        return date.toLocaleDateString("vi-VN");
    }

    function openDetail(customer) {
        $("detailCustomerName").textContent =
            display(customer.name);

        $("detailCustomerId").textContent =
            display(customer.id);

        $("detailAccountId").textContent =
            display(customer.accountId);

        $("detailCustomerFullName").textContent =
            display(customer.name);

        $("detailCustomerUsername").textContent =
            display(customer.username);

        $("detailCustomerPhone").textContent =
            display(customer.phone);

        $("detailCustomerEmail").textContent =
            display(customer.email);

        $("detailCustomerIdentity").textContent =
            display(customer.identityNumber);

        $("detailCustomerBirthday").textContent =
            formatDate(customer.dateOfBirth);

        $("detailCustomerGender").textContent =
            display(customer.gender);

        $("detailCustomerCreated").textContent =
            formatDate(customer.createdAt);

        $("detailCustomerAddress").textContent =
            display(customer.address);

        $("customerDetailDialog").showModal();
    }

    function renderTable() {
        const body = $("customersTableBody");
        body.replaceChildren();

        const total = state.filtered.length;

        const pages = Math.max(
            1,
            Math.ceil(total / state.pageSize)
        );

        state.page = Math.min(
            Math.max(state.page, 1),
            pages
        );

        const start = (state.page - 1) * state.pageSize;
        const current = state.filtered.slice(
            start,
            start + state.pageSize
        );

        for (const customer of current) {
            const row = document.createElement("tr");

            row.append(
                td(customer.id),
                td(customer.name),
                td(customer.username),
                td(customer.phone),
                td(customer.email)
            );

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "customer-view-button";
            viewButton.textContent = "Xem chi tiết";

            viewButton.addEventListener("click", () => {
                openDetail(customer);
            });

            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);

            body.appendChild(row);
        }

        if (current.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "customer-empty";
            cell.textContent = "Không tìm thấy khách hàng phù hợp.";

            row.appendChild(cell);
            body.appendChild(row);
        }

        $("customerResultCount").textContent =
            `Hiển thị ${current.length}/${total} khách hàng`;

        $("customerPageInfo").textContent =
            `Trang ${state.page}/${pages}`;

        $("previousCustomers").disabled = state.page <= 1;
        $("nextCustomers").disabled = state.page >= pages;
    }

    function filterCustomers() {
        const keyword = $("customerSearch").value
            .trim()
            .toLocaleLowerCase("vi-VN");

        const filter = $("customerContactFilter").value;

        state.filtered = state.customers.filter(customer => {
            const searchable = [
                customer.id,
                customer.name,
                customer.username,
                customer.phone,
                customer.email,
                customer.address
            ].map(text).join(" ").toLocaleLowerCase("vi-VN");

            const matchesKeyword =
                !keyword || searchable.includes(keyword);

            const hasEmail = text(customer.email) !== "";
            const hasPhone = text(customer.phone) !== "";

            let matchesContact = true;

            if (filter === "email") {
                matchesContact = hasEmail;
            } else if (filter === "phone") {
                matchesContact = hasPhone;
            } else if (filter === "missing") {
                matchesContact = !hasEmail || !hasPhone;
            }

            return matchesKeyword && matchesContact;
        });

        state.page = 1;
        renderTable();
    }

    async function loadCustomers() {
        message("Đang tải danh sách khách hàng...");

        try {
            const data = await api("/api/admin/customers");

            if (!data || !Array.isArray(data.items)) {
                throw new Error(
                    "API khách hàng trả về dữ liệu không đúng định dạng."
                );
            }

            state.customers = data.items;

            renderStatistics();
            filterCustomers();

            message("");
        } catch (error) {
            message(error.message, true);

            const body = $("customersTableBody");
            body.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "customer-empty";
            cell.textContent = "Không thể tải danh sách khách hàng.";

            row.appendChild(cell);
            body.appendChild(row);
        }
    }

    async function logout() {
        const button = $("logoutButton");
        button.disabled = true;

        try {
            if (!state.csrfToken) {
                await getCsrfToken();
            }

            await api("/api/account/logout", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": state.csrfToken
                }
            });

            window.location.href = "/login.html";
        } catch (error) {
            message(error.message, true);
            button.disabled = false;
        }
    }

    $("customerSearch").addEventListener(
        "input",
        filterCustomers
    );

    $("customerContactFilter").addEventListener(
        "change",
        filterCustomers
    );

    $("refreshCustomers").addEventListener(
        "click",
        loadCustomers
    );

    $("previousCustomers").addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            renderTable();
        }
    });

    $("nextCustomers").addEventListener("click", () => {
        const pages = Math.ceil(
            state.filtered.length / state.pageSize
        );

        if (state.page < pages) {
            state.page++;
            renderTable();
        }
    });

    $("closeCustomerDetail").addEventListener("click", () => {
        $("customerDetailDialog").close();
    });

    $("closeCustomerDetailTop").addEventListener("click", () => {
        $("customerDetailDialog").close();
    });

    $("logoutButton").addEventListener("click", logout);

    try {
        await verifyAdmin();
        await getCsrfToken();
        await loadCustomers();
    } catch (error) {
        message(error.message, true);
    }
});
