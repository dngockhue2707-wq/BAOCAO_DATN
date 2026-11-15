
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);

    const state = {
        employees: [],
        filtered: [],
        page: 1,
        pageSize: 8,
        csrfToken: "",
        saving: false
    };

    const text = value => {
        if (value === null || value === undefined) return "";
        return String(value).trim();
    };

    const display = value => text(value) || "—";

    function showMessage(value, isError = false) {
        const element = $("employeeMessage");
        element.textContent = value || "";
        element.classList.toggle("error", isError);
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
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

        const avatar = document.querySelector(".employee-hero-avatar");

        if (avatar) {
            avatar.textContent = (
                account.username || "A"
            ).charAt(0).toUpperCase();
        }
    }

    async function getCsrfToken() {
        const data = await api("/api/account/csrf-token");

        if (!data.csrfToken) {
            throw new Error("Không lấy được mã bảo vệ CSRF.");
        }

        state.csrfToken = data.csrfToken;
    }

    function createCell(value, className = "") {
        const cell = document.createElement("td");
        cell.textContent = display(value);

        if (className) {
            cell.className = className;
        }

        return cell;
    }

    function employeeName(employee) {
        return display(employee.name);
    }

    function employeeInitials(value) {
        const parts = text(value).split(/\s+/).filter(Boolean);

        if (!parts.length) return "NV";

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return (
            parts[parts.length - 2].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }

    function statusText(employee) {
        return employee.active === true
            ? "Đang làm việc"
            : "Ngừng hoạt động";
    }

    function renderStatistics() {
        $("totalEmployees").textContent = state.employees.length;

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
        const form = $("employeeForm");
        form.reset();

        showMessage("");

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

        $("submitEmployeeForm").textContent = employee
            ? "Lưu thay đổi"
            : "Thêm nhân viên";

        $("employeeFormDialog").showModal();
    }

    function openEmployeeDetail(employee) {
        $("detailEmployeeName").textContent =
            employeeName(employee);

        $("detailEmployeeAvatar").textContent =
            employeeInitials(employee.name);

        $("detailEmployeeRole").textContent =
            display(employee.position);

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

    function createPersonCell(employee) {
        const cell = document.createElement("td");

        const wrapper = document.createElement("div");
        wrapper.className = "employee-person";

        const avatar = document.createElement("div");
        avatar.className = "employee-person-avatar";
        avatar.textContent = employeeInitials(employee.name);

        const information = document.createElement("div");
        information.className = "employee-person-details";

        const name = document.createElement("strong");
        name.textContent = display(employee.name);

        const username = document.createElement("span");
        username.textContent =
            `@${display(employee.username)}`;

        information.append(name, username);
        wrapper.append(avatar, information);
        cell.appendChild(wrapper);

        return cell;
    }

    function createContactCell(employee) {
        const cell = document.createElement("td");

        const wrapper = document.createElement("div");
        wrapper.className = "employee-contact-details";

        const phone = document.createElement("span");
        phone.className = "employee-phone";
        phone.textContent = display(employee.phone);

        const email = document.createElement("span");
        email.className = "employee-email";
        email.textContent = display(employee.email);

        wrapper.append(phone, email);
        cell.appendChild(wrapper);

        return cell;
    }

    function createStatusCell(employee) {
        const cell = document.createElement("td");

        const badge = document.createElement("span");
        badge.className = employee.active === true
            ? "employee-status active"
            : "employee-status inactive";

        badge.textContent = statusText(employee);
        cell.appendChild(badge);

        return cell;
    }

    function createActionCell(employee) {
        const cell = document.createElement("td");
        const actions = document.createElement("div");

        actions.className = "employee-row-actions";

        const detailButton = document.createElement("button");
        detailButton.type = "button";
        detailButton.className = "employee-view-button";
        detailButton.textContent = "Chi tiết";

        detailButton.addEventListener("click", () => {
            openEmployeeDetail(employee);
        });

        actions.appendChild(detailButton);

        if (employee.role === "NhanVien") {
            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.className = "employee-edit-button";
            editButton.textContent = "Sửa";

            editButton.addEventListener("click", () => {
                openEmployeeForm(employee);
            });

            actions.appendChild(editButton);
        }

        cell.appendChild(actions);
        return cell;
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
            const row = document.createElement("tr");

            if (employee.active !== true) {
                row.classList.add("employee-inactive-row");
            }

            row.append(
                createCell(`#${employee.id}`, "employee-code"),
                createPersonCell(employee),
                createCell(employee.position, "employee-position"),
                createContactCell(employee),
                createStatusCell(employee),
                createActionCell(employee)
            );

            body.appendChild(row);
        }

        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "employee-empty";
            cell.textContent =
                "Không tìm thấy nhân viên phù hợp.";

            row.appendChild(cell);
            body.appendChild(row);
        }

        const end = Math.min(
            start + items.length,
            total
        );

        $("employeeResultCount").textContent =
            total > 0
                ? `Hiển thị ${start + 1}–${end} trên ${total} nhân viên`
                : "Không có nhân viên phù hợp";

        $("employeePageInfo").textContent =
            `Trang ${state.page}/${totalPages}`;

        $("previousEmployees").disabled =
            state.page <= 1;

        $("nextEmployees").disabled =
            state.page >= totalPages;
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
                (status === "active" && employee.active === true) ||
                (status === "inactive" && employee.active !== true);

            return matchesSearch && matchesStatus;
        });

        state.page = 1;
        renderTable();
    }

    async function loadEmployees() {
        const refreshButton = $("refreshEmployees");

        refreshButton.disabled = true;
        showMessage("Đang tải danh sách nhân viên...");

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
                `Không thể tải danh sách: ${error.message}`,
                true
            );
        } finally {
            refreshButton.disabled = false;
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

    $("refreshEmployees").addEventListener(
        "click",
        async () => {
            $("employeeSearch").value = "";
            $("employeeStatusFilter").value = "all";

            await loadEmployees();
        }
    );

    $("previousEmployees").addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            renderTable();
        }
    });

    $("nextEmployees").addEventListener("click", () => {
        const pages = Math.max(
            1,
            Math.ceil(state.filtered.length / state.pageSize)
        );

        if (state.page < pages) {
            state.page++;
            renderTable();
        }
    });

    $("closeEmployeeDetail").addEventListener(
        "click",
        () => $("employeeDetailDialog").close()
    );

    $("closeEmployeeDetailTop").addEventListener(
        "click",
        () => $("employeeDetailDialog").close()
    );

    $("addEmployeeButton").addEventListener("click", () => {
        openEmployeeForm();
    });

    $("cancelEmployeeForm").addEventListener("click", () => {
        if (!state.saving) {
            $("employeeFormDialog").close();
        }
    });

    $("closeEmployeeFormTop").addEventListener("click", () => {
        if (!state.saving) {
            $("employeeFormDialog").close();
        }
    });

    $("employeeFormDialog").addEventListener(
        "cancel",
        event => {
            if (state.saving) {
                event.preventDefault();
            }
        }
    );

    $("employeeForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (state.saving) return;

            const id = $("employeeId").value.trim();
            const isCreating = !id;

            if (!isCreating) {
                const employee = state.employees.find(
                    item => String(item.id) === id
                );

                if (!employee || employee.role !== "NhanVien") {
                    showMessage(
                        "Không được chỉnh sửa tài khoản Admin.",
                        true
                    );
                    return;
                }
            }

            const data = {
                name: $("employeeFullName").value.trim(),
                position: $("employeePosition").value.trim(),
                phone: $("employeePhone").value.trim(),
                email: $("employeeEmail").value.trim()
            };

            if (isCreating) {
                data.username =
                    $("employeeUsername").value.trim();
            } else {
                data.active =
                    $("employeeActive").value === "true";
            }

            const submitButton = $("submitEmployeeForm");

            state.saving = true;
            submitButton.disabled = true;

            submitButton.textContent = isCreating
                ? "Đang thêm..."
                : "Đang lưu...";

            try {
                if (!state.csrfToken) {
                    await getCsrfToken();
                }

                const result = await api(
                    isCreating
                        ? "/api/admin/employees"
                        : `/api/admin/employees/${id}`,
                    {
                        method: isCreating ? "POST" : "PUT",
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
                    result.message ||
                    (isCreating
                        ? "Đã thêm nhân viên thành công."
                        : "Đã cập nhật nhân viên thành công.")
                );

            } catch (error) {
                showMessage(error.message, true);

            } finally {
                state.saving = false;
                submitButton.disabled = false;

                submitButton.textContent = isCreating
                    ? "Thêm nhân viên"
                    : "Lưu thay đổi";
            }
        }
    );

    try {
        await verifyAdmin();
        await getCsrfToken();
        await loadEmployees();
    } catch (error) {
        showMessage(error.message, true);
    }
});
