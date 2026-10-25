
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const base = "/api/admin/room-extras";

    function notice(text, error = false) {
        const element = $("roomMessage");
        if (!element) return;
        element.textContent = text;
        element.classList.toggle("error", error);
    }

    async function request(path, method = "GET", data) {
        const options = {
            method,
            credentials: "same-origin",
            headers: {}
        };

        if (method !== "GET") {
            const response = await fetch(
                "/api/account/csrf-token",
                { credentials: "same-origin" }
            );

            if (!response.ok) {
                throw new Error("Không lấy được mã bảo vệ.");
            }

            const token = await response.json();
            options.headers["X-CSRF-TOKEN"] = token.csrfToken;

            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(data);
            }
        }

        const response = await fetch(base + path, options);

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập lại.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền quản trị.");
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message || `Lỗi HTTP ${response.status}`
            );
        }

        return result;
    }

    async function loadAmenityCatalog() {
        const response = await fetch(
            "/api/admin/room-management/amenities",
            { credentials: "same-origin" }
        );

        if (!response.ok) {
            throw new Error("Không tải được danh sách tiện nghi.");
        }

        const list = await response.json();
        const body = $("amenityCatalogBody");

        body.replaceChildren();

        for (const amenity of list) {
            const row = document.createElement("tr");

            const name = document.createElement("td");
            name.textContent = amenity.name;

            const status = document.createElement("td");
            status.textContent = amenity.active
                ? "Hoạt động"
                : "Tạm ngừng";

            const action = document.createElement("td");
            const edit = document.createElement("button");

            edit.type = "button";
            edit.className = "room-edit-button";
            edit.textContent = "Sửa";

            edit.addEventListener("click", () => {
                $("amenityCatalogId").value = amenity.id;
                $("amenityCatalogName").value = amenity.name;
                $("amenityCatalogActive").checked = amenity.active;
                $("amenityCatalogSubmit").textContent = "Lưu thay đổi";

                $("amenityCatalogName").focus();
            });

            action.appendChild(edit);
            row.append(name, status, action);
            body.appendChild(row);
        }

        if (list.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 3;
            cell.textContent = "Chưa có tiện nghi.";

            row.appendChild(cell);
            body.appendChild(row);
        }

        if (typeof roomState !== "undefined") {
            roomState.amenities = list;

            const typeId = Number($("amenityTypeSelect").value);

            if (typeId) {
                const detail = await fetch(
                    `/api/admin/room-management/type-details/${typeId}`,
                    { credentials: "same-origin" }
                );

                if (detail.ok) {
                    const data = await detail.json();
                    renderAmenities(data.amenityIds);
                }
            }
        }
    }

    $("amenityCatalogForm").addEventListener("submit", async event => {
        event.preventDefault();

        const id = $("amenityCatalogId").value;
        const submit = $("amenityCatalogSubmit");

        submit.disabled = true;

        try {
            const result = await request(
                id ? `/amenities/${id}` : "/amenities",
                id ? "PUT" : "POST",
                {
                    name: $("amenityCatalogName").value.trim(),
                    active: $("amenityCatalogActive").checked
                }
            );

            $("amenityCatalogForm").reset();
            $("amenityCatalogId").value = "";
            $("amenityCatalogActive").checked = true;
            submit.textContent = "Thêm tiện nghi";

            await loadAmenityCatalog();

            notice(result.message);
        } catch (error) {
            notice(error.message, true);
        } finally {
            submit.disabled = false;
        }
    });

    $("amenityCatalogReset").addEventListener("click", () => {
        $("amenityCatalogForm").reset();
        $("amenityCatalogId").value = "";
        $("amenityCatalogActive").checked = true;
        $("amenityCatalogSubmit").textContent = "Thêm tiện nghi";
    });

    $("typeUploadForm").addEventListener("submit", async event => {
        event.preventDefault();

        const typeId = Number($("imageTypeSelect").value);
        const files = Array.from($("typeImageFiles").files);

        if (!typeId || files.length === 0) {
            notice("Chọn loại phòng và hình ảnh.", true);
            return;
        }

        if (
            files.length > 10 ||
            files.some(file => !file.size || file.size > 5242880)
        ) {
            notice(
                "Tối đa 10 ảnh, mỗi ảnh không quá 5 MB.",
                true
            );
            return;
        }

        const submit = $("typeUploadSubmit");
        submit.disabled = true;

        try {
            const data = new FormData();

            files.forEach(file => {
                data.append("files", file);
            });

            const result = await request(
                `/type-images/${typeId}`,
                "POST",
                data
            );

            $("typeUploadForm").reset();

            await refreshImages();

            notice(result.message);
        } catch (error) {
            notice(error.message, true);
        } finally {
            submit.disabled = false;
        }
    });

    loadAmenityCatalog().catch(error => {
        notice(error.message, true);
    });
});
