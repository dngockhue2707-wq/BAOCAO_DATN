
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);

    const state = {
        employees: [],
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

    function showMessage(value, isError = false) {
        const element = $("employeeMessage");
        element.textContent = value;
        element.classList.toggle("error", isError);
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền quản trị.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    async function verifyAdmin() {
        const account = await api("/api/account/profile");

        if (account.role !== "Admin") {
            throw new Error("Bạn không có quyền truy cập khu Admin.");
        }

        $("adminUsername").textContent =
            account.username || "Quản trị viên";
    }

    async function getCsrfToken() {
        const data = await api("/api/account/csrf-token");
        state.csrfToken = data.csrfToken;
    }

    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = display(value);
        return td;
    }

    function employeeName(employee) {
        return display(employee.name);
    }

    function statusText(employee) {
        return employee.active
            ? "Đang làm việc"
            : "Ngừng hoạt động";
    }

    function renderStatistics() {
        $("totalEmployees").textContent =
            state.employees.length;

        $("activeEmployees").textContent =
            state.employees.filter(
                employee => employee.active === true
            ).length;

        $("inactiveEmployees").textContent =
            state.employees.filter(
                employee => employee.active !== true
            ).length;
    }

    function openEmployeeForm(employee = null) {
        $("employeeForm").reset();

        $("employeeId").value = employee?.id ?? "";

        $("employeeFormTitle").textContent = employee
            ? "Chỉnh sửa nhân viên"
            : "Thêm nhân viên";

        $("employeeFullName").value = employee?.name ?? "";
        $("employeePosition").value = employee?.position ?? "";
        $("employeePhone").value = employee?.phone ?? "";
        $("employeeEmail").value = employee?.email ?? "";
        $("employeeUsername").value = employee?.username ?? "";

        $("employeeUsername").readOnly = Boolean(employee);

        $("employeeStatusField").hidden = !employee;

        $("employeeActive").value =
            employee?.active === false ? "false" : "true";

        $("employeeFormDialog").showModal();
    }

    function openEmployeeDetail(employee) {
        $("detailEmployeeName").textContent =
            employeeName(employee);

        $("detailEmployeeId").textContent =
            display(employee.id);

        $("detailEmployeeUsername").textContent =
            display(employee.username);

        $("detailEmployeeFullName").textContent =
            display(employee.name);

        $("detailEmployeePosition").textContent =
            display(employee.position);

        $("detailEmployeePhone").textContent =
            display(employee.phone);

        $("detailEmployeeEmail").textContent =
            display(employee.email);

        $("detailEmployeeStatus").textContent =
            statusText(employee);

        $("employeeDetailDialog").showModal();
    }


    function renderTable() {
        const body = $("employeesTableBody");
        body.replaceChildren();

        const total = state.filtered.length;
        const totalPages = Math.max(
            1,
            Math.ceil(total / state.pageSize)
        );

        state.page = Math.min(
            Math.max(state.page, 1),
            totalPages
        );

        const start = (state.page - 1) * state.pageSize;

        const items = state.filtered.slice(
            start,
            start + state.pageSize
        );

        for (const employee of items) {
            const tr = document.createElement("tr");

            tr.append(
                createCell(employee.id),
                createCell(employee.name),
                createCell(employee.username),
                createCell(employee.position),
                createCell(employee.phone),
                createCell(employee.email)
            );

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = employee.active
                ? "employee-status active"
                : "employee-status inactive";

            badge.textContent = statusText(employee);

            statusCell.appendChild(badge);
            tr.appendChild(statusCell);

            const actionCell = document.createElement("td");

            const detailButton = document.createElement("button");
            detailButton.type = "button";
            detailButton.className = "employee-view-button";
            detailButton.textContent = "Xem chi tiết";

            detailButton.addEventListener("click", () => {
                openEmployeeDetail(employee);
            });

            actionCell.appendChild(detailButton);

            if (employee.role === "NhanVien") {
                const editButton = document.createElement("button");

                editButton.type = "button";
                editButton.className = "employee-view-button";
                editButton.textContent = "Sửa";

                editButton.addEventListener("click", () => {
                    openEmployeeForm(employee);
                });

                actionCell.appendChild(editButton);

            }

            tr.appendChild(actionCell);
            body.appendChild(tr);
        }

        if (!items.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");

            td.colSpan = 8;
            td.className = "employee-empty";
            td.textContent = "Không tìm thấy nhân viên phù hợp.";

            tr.appendChild(td);
            body.appendChild(tr);
        }

        $("employeeResultCount").textContent =
            `Hiển thị ${items.length}/${total} nhân viên`;

        $("employeePageInfo").textContent =
            `Trang ${state.page}/${totalPages}`;

        $("previousEmployees").disabled = state.page <= 1;
        $("nextEmployees").disabled = state.page >= totalPages;
    }

    function filterEmployees() {
        const keyword = $("employeeSearch").value
            .trim()
            .toLocaleLowerCase("vi-VN");

        const status = $("employeeStatusFilter").value;

        state.filtered = state.employees.filter(employee => {
            const searchable = [
                employee.id,
                employee.name,
                employee.username,
                employee.position,
                employee.phone,
                employee.email
            ]
                .map(text)
                .join(" ")
                .toLocaleLowerCase("vi-VN");

            const matchesSearch =
                !keyword || searchable.includes(keyword);

            const matchesStatus =
                status === "all" ||
                (status === "active" && employee.active) ||
                (status === "inactive" && !employee.active);

            return matchesSearch && matchesStatus;
        });

        state.page = 1;
        renderTable();
    }

    async function loadEmployees() {
        const refreshButton = $("refreshEmployees");

        refreshButton.disabled = true;
        showMessage("Đang cập nhật danh sách nhân viên...");

        try {
            const result = await api("/api/admin/employees");

            const employees = Array.isArray(result)
                ? result
                : Array.isArray(result.items)
                    ? result.items
                    : null;

            if (!employees) {
                throw new Error(
                    "Dữ liệu nhân viên không đúng định dạng."
                );
            }

            state.employees = employees;

            renderStatistics();
            filterEmployees();

            showMessage("");
        } catch (error) {
            showMessage(
                `Không thể làm mới danh sách: ${error.message}`,
                true
            );
        } finally {
            refreshButton.disabled = false;
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

            location.href = "/login.html";
        } catch (error) {
            showMessage(error.message, true);
            button.disabled = false;
        }
    }

    $("employeeSearch").addEventListener(
        "input",
        filterEmployees
    );

    $("employeeStatusFilter").addEventListener(
        "change",
        filterEmployees
    );

    $("refreshEmployees").addEventListener("click", async () => {
        $("employeeSearch").value = "";
        $("employeeStatusFilter").value = "all";

        await loadEmployees();
    });

    $("previousEmployees").addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            renderTable();
        }
    });

    $("nextEmployees").addEventListener("click", () => {
        const pages = Math.ceil(
            state.filtered.length / state.pageSize
        );

        if (state.page < pages) {
            state.page++;
            renderTable();
        }
    });

    $("closeEmployeeDetail").addEventListener("click", () => {
        $("employeeDetailDialog").close();
    });

    $("closeEmployeeDetailTop").addEventListener("click", () => {
        $("employeeDetailDialog").close();
    });

    $("addEmployeeButton").addEventListener("click", () => {
        openEmployeeForm();
    });

    $("cancelEmployeeForm").addEventListener("click", () => {
        $("employeeFormDialog").close();
    });

    $("employeeForm").addEventListener("submit", async event => {
        event.preventDefault();

        const id = $("employeeId").value.trim();

        if (!id) {
            showMessage(
                "Chức năng thêm nhân viên cần tạo tài khoản NhanVien riêng.",
                true
            );
            return;
        }

        const employee = state.employees.find(
            item => String(item.id) === id
        );

        if (!employee || employee.role !== "NhanVien") {
            showMessage("Không được chỉnh sửa tài khoản Admin.", true);
            return;
        }

        const data = {
            name: $("employeeFullName").value.trim(),
            position: $("employeePosition").value.trim(),
            phone: $("employeePhone").value.trim(),
            email: $("employeeEmail").value.trim(),
            active: $("employeeActive").value === "true"
        };

        const submitButton = $("employeeForm").querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;

        try {
            if (!state.csrfToken) {
                await getCsrfToken();
            }

            const result = await api(
                `/api/admin/employees/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": state.csrfToken
                    },
                    body: JSON.stringify(data)
                }
            );

            $("employeeFormDialog").close();

            await loadEmployees();

            showMessage(
                result.message || "Đã cập nhật nhân viên thành công."
            );
        } catch (error) {
            showMessage(error.message, true);
        } finally {
            submitButton.disabled = false;
        }
    });

    $("logoutButton").addEventListener("click", logout);

    try {
        await verifyAdmin();
        await getCsrfToken();
        await loadEmployees();
    } catch (error) {
        showMessage(error.message, true);
    }
});
