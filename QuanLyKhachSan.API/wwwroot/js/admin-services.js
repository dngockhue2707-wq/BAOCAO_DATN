
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);

    const state = {
        services: [],
        filtered: [],
        page: 1,
        pageSize: 10,
        csrfToken: "",
        loading: false,
        saving: false
    };

    const text = value => {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    };

    const display = value => text(value) || "—";

    const money = value => {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(number);
    };

    function showMessage(value, isError = false) {
        const element = $("serviceMessage");

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
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền thực hiện thao tác này.");
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
        const result = await api("/api/account/csrf-token");

        if (!result.csrfToken) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        state.csrfToken = result.csrfToken;
    }

    async function sendData(url, method, data) {
        if (!state.csrfToken) {
            await getCsrfToken();
        }

        return await api(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": state.csrfToken
            },
            body: JSON.stringify(data)
        });
    }

    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = display(value);
        return td;
    }

    function createButton(label, className, handler) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", handler);

        return button;
    }

    function statusText(service) {
        return service.active
            ? "Đang hoạt động"
            : "Ngừng hoạt động";
    }

    function renderStatistics() {
        const active = state.services.filter(
            service => service.active === true
        ).length;

        $("totalServices").textContent = state.services.length;
        $("activeServices").textContent = active;
        $("inactiveServices").textContent =
            state.services.length - active;
    }

    function openServiceForm(service = null) {
        $("serviceForm").reset();

        $("serviceId").value = service?.id ?? "";
        $("serviceName").value = service?.name ?? "";
        $("serviceUnit").value = service?.unit ?? "";
        $("servicePrice").value = service?.price ?? "";
        $("serviceDescription").value =
            service?.description ?? "";

        $("serviceActive").value =
            service?.active === false ? "false" : "true";

        $("serviceFormTitle").textContent = service
            ? "Chỉnh sửa dịch vụ"
            : "Thêm dịch vụ";

        $("saveServiceButton").textContent = service
            ? "Lưu thay đổi"
            : "Thêm dịch vụ";

        $("serviceFormDialog").showModal();
        $("serviceName").focus();
    }

    function openServiceDetail(service) {
        $("detailServiceName").textContent =
            display(service.name);

        $("detailServiceId").textContent =
            display(service.id);

        $("detailServiceUnit").textContent =
            display(service.unit);

        $("detailServicePrice").textContent =
            money(service.price);

        $("detailServiceStatus").textContent =
            statusText(service);

        $("detailServiceDescription").textContent =
            display(service.description);

        $("serviceDetailDialog").showModal();
    }

    function renderTable() {
        const body = $("servicesTableBody");
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
        const current = state.filtered.slice(
            start,
            start + state.pageSize
        );

        for (const service of current) {
            const row = document.createElement("tr");

            row.appendChild(createCell(service.id));

            const nameCell = createCell(service.name);
            nameCell.className = "service-name-cell";
            row.appendChild(nameCell);

            row.appendChild(createCell(service.unit));

            const priceCell = createCell(money(service.price));
            priceCell.className = "service-price-cell";
            row.appendChild(priceCell);

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = service.active
                ? "service-status active"
                : "service-status inactive";

            badge.textContent = statusText(service);
            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            actionCell.className = "service-actions";

            const detailButton = createButton(
                "Xem chi tiết",
                "service-action-button",
                () => openServiceDetail(service)
            );

            const editButton = createButton(
                "Sửa",
                "service-action-button",
                () => openServiceForm(service)
            );

            const toggleButton = createButton(
                service.active
                    ? "Ngừng hoạt động"
                    : "Kích hoạt lại",
                service.active
                    ? "service-action-button warning"
                    : "service-action-button success",
                () => changeServiceStatus(service)
            );

            actionCell.append(
                detailButton,
                editButton,
                toggleButton
            );

            row.appendChild(actionCell);
            body.appendChild(row);
        }

        if (current.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "service-empty";
            cell.textContent = state.services.length === 0
                ? "Chưa có dịch vụ nào."
                : "Không tìm thấy dịch vụ phù hợp.";

            row.appendChild(cell);
            body.appendChild(row);
        }

        $("serviceResultCount").textContent =
            `Hiển thị ${current.length}/${total} dịch vụ`;

        $("servicePageInfo").textContent =
            `Trang ${state.page}/${totalPages}`;

        $("previousServices").disabled = state.page <= 1;
        $("nextServices").disabled = state.page >= totalPages;
    }

    function applyFilters(resetPage = true) {
        const keyword = $("serviceSearch").value
            .trim()
            .toLocaleLowerCase("vi-VN");

        const status = $("serviceStatusFilter").value;
        const sort = $("serviceSort").value;

        state.filtered = state.services.filter(service => {
            const searchable = [
                service.id,
                service.name,
                service.unit,
                service.description
            ]
                .map(text)
                .join(" ")
                .toLocaleLowerCase("vi-VN");

            const matchesKeyword =
                !keyword || searchable.includes(keyword);

            const matchesStatus =
                status === "all" ||
                (status === "active" && service.active === true) ||
                (status === "inactive" && service.active === false);

            return matchesKeyword && matchesStatus;
        });

        state.filtered.sort((a, b) => {
            if (sort === "oldest") {
                return Number(a.id) - Number(b.id);
            }

            if (sort === "name") {
                return text(a.name).localeCompare(
                    text(b.name),
                    "vi-VN"
                );
            }

            if (sort === "priceAsc") {
                return Number(a.price) - Number(b.price);
            }

            if (sort === "priceDesc") {
                return Number(b.price) - Number(a.price);
            }

            return Number(b.id) - Number(a.id);
        });

        if (resetPage) {
            state.page = 1;
        }

        renderTable();
    }

    async function loadServices() {
        if (state.loading) {
            return false;
        }

        state.loading = true;
        $("refreshServices").disabled = true;

        showMessage("Đang tải danh sách dịch vụ...");

        try {
            const result = await api("/api/admin/services");

            const items = Array.isArray(result)
                ? result
                : Array.isArray(result.items)
                    ? result.items
                    : null;

            if (!items) {
                throw new Error(
                    "Dữ liệu dịch vụ trả về không đúng định dạng."
                );
            }

            state.services = items.map(service => ({
                id: service.id,
                name: service.name,
                unit: service.unit,
                price: service.price,
                description: service.description,
                active: service.active === true
            }));

            renderStatistics();
            applyFilters(false);
            showMessage("");

            return true;
        } catch (error) {
            showMessage(
                `Không thể tải danh sách dịch vụ: ${error.message}`,
                true
            );

            return false;
        } finally {
            state.loading = false;
            $("refreshServices").disabled = false;
        }
    }

    function validateForm() {
        const data = {
            name: $("serviceName").value.trim(),
            unit: $("serviceUnit").value.trim(),
            price: Number($("servicePrice").value),
            description: $("serviceDescription").value.trim(),
            active: $("serviceActive").value === "true"
        };

        if (!data.name || data.name.length > 150) {
            throw new Error(
                "Tên dịch vụ phải có từ 1 đến 150 ký tự."
            );
        }

        if (data.unit.length > 50) {
            throw new Error(
                "Đơn vị tính không được quá 50 ký tự."
            );
        }

        if (
            $("servicePrice").value.trim() === "" ||
            !Number.isFinite(data.price) ||
            data.price < 0 ||
            data.price > 1000000000 ||
            !Number.isInteger(data.price)
        ) {
            throw new Error(
                "Đơn giá phải là số nguyên từ 0 đến 1 tỷ đồng."
            );
        }

        if (data.description.length > 1000) {
            throw new Error(
                "Mô tả không được quá 1000 ký tự."
            );
        }

        return data;
    }

    async function saveService(event) {
        event.preventDefault();

        if (state.saving) {
            return;
        }

        let data;

        try {
            data = validateForm();
        } catch (error) {
            alert(error.message);
            return;
        }

        const id = $("serviceId").value.trim();
        const editing = id !== "";

        state.saving = true;
        $("saveServiceButton").disabled = true;

        try {
            const result = await sendData(
                editing
                    ? `/api/admin/services/${id}`
                    : "/api/admin/services",
                editing ? "PUT" : "POST",
                data
            );

            $("serviceFormDialog").close();

            if (editing) {
                const index = state.services.findIndex(
                    service => String(service.id) === id
                );

                if (index !== -1) {
                    state.services[index] = {
                        ...state.services[index],
                        ...data
                    };
                }

                renderStatistics();
                applyFilters(false);
            }

            const refreshed = await loadServices();

            if (refreshed) {
                showMessage(
                    result.message ||
                    (editing
                        ? "Đã cập nhật dịch vụ."
                        : "Đã thêm dịch vụ.")
                );
            } else {
                showMessage(
                    "Đã lưu dịch vụ nhưng chưa tải lại được danh sách. " +
                    "Nhấn Làm mới để cập nhật dữ liệu.",
                    true
                );
            }
        } catch (error) {
            showMessage(error.message, true);
        } finally {
            state.saving = false;
            $("saveServiceButton").disabled = false;
        }
    }

    async function changeServiceStatus(service) {
        const nextActive = !service.active;
        const action = nextActive
            ? "kích hoạt lại"
            : "ngừng hoạt động";

        if (!confirm(
            `Bạn có chắc muốn ${action} dịch vụ "${service.name}"?`
        )) {
            return;
        }

        const data = {
            name: text(service.name),
            unit: text(service.unit),
            price: Number(service.price),
            description: text(service.description),
            active: nextActive
        };

        try {
            const result = await sendData(
                `/api/admin/services/${service.id}`,
                "PUT",
                data
            );

            service.active = nextActive;

            renderStatistics();
            applyFilters(false);

            const refreshed = await loadServices();

            if (refreshed) {
                showMessage(
                    result.message || "Đã cập nhật trạng thái dịch vụ."
                );
            } else {
                showMessage(
                    "Đã lưu trạng thái nhưng chưa tải lại được danh sách.",
                    true
                );
            }
        } catch (error) {
            showMessage(error.message, true);
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
            showMessage(error.message, true);
            button.disabled = false;
        }
    }

    $("addServiceButton").addEventListener("click", () => {
        openServiceForm();
    });

    $("refreshServices").addEventListener("click", async () => {
        $("serviceSearch").value = "";
        $("serviceStatusFilter").value = "all";
        $("serviceSort").value = "newest";

        await loadServices();
    });

    $("serviceSearch").addEventListener("input", () => {
        applyFilters();
    });

    $("serviceStatusFilter").addEventListener("change", () => {
        applyFilters();
    });

    $("serviceSort").addEventListener("change", () => {
        applyFilters();
    });

    $("previousServices").addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            renderTable();
        }
    });

    $("nextServices").addEventListener("click", () => {
        const pages = Math.ceil(
            state.filtered.length / state.pageSize
        );

        if (state.page < pages) {
            state.page++;
            renderTable();
        }
    });

    $("serviceForm").addEventListener("submit", saveService);

    $("cancelServiceForm").addEventListener("click", () => {
        $("serviceFormDialog").close();
    });

    $("closeServiceFormTop").addEventListener("click", () => {
        $("serviceFormDialog").close();
    });

    $("closeServiceDetail").addEventListener("click", () => {
        $("serviceDetailDialog").close();
    });

    $("closeServiceDetailTop").addEventListener("click", () => {
        $("serviceDetailDialog").close();
    });

    $("logoutButton").addEventListener("click", logout);

    try {
        await verifyAdmin();
        await getCsrfToken();
        await loadServices();
    } catch (error) {
        showMessage(error.message, true);
    }
});
