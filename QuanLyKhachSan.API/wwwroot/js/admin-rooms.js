
"use strict";

const roomApi = "/api/admin/room-management";

const roomState = {
    rooms: [],
    types: [],
    amenities: [],
    images: [],
    csrfToken: ""
};

const $ = id => document.getElementById(id);

const money = value => new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
}).format(Number(value || 0));

function showMessage(message, isError = false) {
    const element = $("roomMessage");
    element.textContent = message;
    element.classList.toggle("error", isError);
}

async function verifyAdmin() {
    const response = await fetch("/api/account/profile", {
        credentials: "same-origin"
    });

    if (response.status === 401) {
        location.href = "/login.html";
        return false;
    }

    if (!response.ok) {
        throw new Error("Không thể kiểm tra đăng nhập.");
    }

    const account = await response.json();

    if (account.role !== "Admin") {
        throw new Error("Bạn không có quyền quản trị.");
    }

    $("adminUsername").textContent =
        account.username || "Quản trị viên";

    return true;
}

async function getCsrfToken() {
    const response = await fetch("/api/account/csrf-token", {
        credentials: "same-origin"
    });

    if (!response.ok) {
        throw new Error("Không lấy được mã bảo vệ.");
    }

    const data = await response.json();
    roomState.csrfToken = data.csrfToken;
}

async function requestApi(path, options = {}) {
    const method = options.method || "GET";
    const headers = { ...(options.headers || {}) };

    if (method !== "GET") {
        headers["Content-Type"] = "application/json";
        headers["X-CSRF-TOKEN"] = roomState.csrfToken;
    }

    const response = await fetch(roomApi + path, {
        ...options,
        method,
        headers,
        credentials: "same-origin"
    });

    if (response.status === 401) {
        location.href = "/login.html";
        throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    if (response.status === 403) {
        throw new Error("Không có quyền thực hiện thao tác.");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.message || `Lỗi HTTP ${response.status}`
        );
    }

    return result;
}

function sendApi(path, method, payload) {
    return requestApi(path, {
        method,
        body: payload === undefined
            ? undefined
            : JSON.stringify(payload)
    });
}

function createCell(value) {
    const td = document.createElement("td");
    td.textContent = value ?? "—";
    return td;
}

function createButton(text, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", action);
    return button;
}

function populateSelect(id, selectedValue) {
    const select = $(id);
    select.replaceChildren();

    for (const type of roomState.types) {
        const option = new Option(type.name, String(type.id));
        select.add(option);
    }

    if (selectedValue !== undefined) {
        select.value = String(selectedValue);
    }
}

function renderStatistics() {
    const rooms = roomState.rooms;

    $("totalRooms").textContent = rooms.length;

    $("availableRooms").textContent =
        rooms.filter(r => r.status === "Trống").length;

    $("occupiedRooms").textContent =
        rooms.filter(r => r.status === "Đang sử dụng").length;

    $("maintenanceRooms").textContent =
        rooms.filter(r => r.status === "Bảo trì").length;
}

function renderRooms() {
    const search = $("roomSearch").value
        .trim()
        .toLowerCase();

    const floor = $("roomFloorFilter").value;
    const status = $("roomStatusFilter").value;

    const filtered = roomState.rooms.filter(room => {
        const matchesSearch =
            String(room.roomNumber).toLowerCase().includes(search) ||
            String(room.roomTypeName).toLowerCase().includes(search);

        const matchesFloor =
            !floor || String(room.floor) === floor;

        const matchesStatus =
            !status || room.status === status;

        return matchesSearch && matchesFloor && matchesStatus;
    });

    const tbody = $("roomsTableBody");
    tbody.replaceChildren();

    for (const room of filtered) {
        const tr = document.createElement("tr");

        tr.append(
            createCell(room.roomNumber),
            createCell(room.roomTypeName),
            createCell(room.floor),
            createCell(money(room.basePrice))
        );

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = "room-status-badge";
        badge.textContent = room.status;

        if (room.status === "Đang sử dụng") {
            badge.classList.add("busy");
        }

        if (
            room.status === "Bảo trì" ||
            room.status === "Ngừng hoạt động"
        ) {
            badge.classList.add("maintenance");
        }

        statusCell.appendChild(badge);
        tr.appendChild(statusCell);

        const actionCell = document.createElement("td");

        actionCell.appendChild(
            createButton(
                "Quản lý trạng thái",
                "room-edit-button",
                () => openRoomDialog(room)
            )
        );

        tr.appendChild(actionCell);
        tbody.appendChild(tr);
    }

    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = createCell("Không tìm thấy phòng.");

        td.colSpan = 6;
        td.className = "admin-empty";

        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    $("roomRecordCount").textContent =
        `Hiển thị ${filtered.length}/${roomState.rooms.length} phòng`;
}

function renderTypes() {
    const tbody = $("typesTableBody");
    tbody.replaceChildren();

    for (const type of roomState.types) {
        const tr = document.createElement("tr");

        tr.append(
            createCell(type.name),
            createCell(type.adultCapacity),
            createCell(type.childCapacity),
            createCell(
                type.area == null ? "—" : `${type.area} m²`
            ),
            createCell(money(type.basePrice)),
            createCell(
                type.active ? "Đang hoạt động" : "Ngừng hoạt động"
            )
        );

        const action = document.createElement("td");

        action.appendChild(
            createButton(
                "Chỉnh sửa",
                "room-edit-button",
                () => openTypeDialog(type)
            )
        );

        tr.appendChild(action);
        tbody.appendChild(tr);
    }
}

async function loadRooms() {
    roomState.rooms = await requestApi("/rooms");
    renderRooms();
    renderStatistics();
}

async function loadTypes() {
    roomState.types = await requestApi("/types");
    renderTypes();

    populateSelect("roomType");
    populateSelect("amenityTypeSelect");
    populateSelect("imageTypeSelect");
}

function openRoomDialog(room) {
    $("roomForm").reset();

    $("roomId").value = room.id;
    $("roomDialogTitle").textContent =
        `Quản lý trạng thái phòng ${room.roomNumber}`;

    $("roomNumber").value = room.roomNumber;
    $("roomFloor").value = room.floor ?? "";
    $("roomDescription").value = room.description || "";

    populateSelect("roomType", room.roomTypeId);

    $("roomStatus").value = room.status;

    const allowedStatuses = [
        room.status,
        ...(room.status === "Trống"
            ? ["Bảo trì", "Ngừng hoạt động"]
            : room.status === "Bảo trì"
                ? ["Trống", "Ngừng hoạt động"]
                : room.status === "Ngừng hoạt động"
                    ? ["Trống", "Bảo trì"]
                    : room.status === "Đang dọn"
                        ? ["Trống", "Bảo trì"]
                        : [])
    ];

    Array.from($("roomStatus").options).forEach(option => {
        option.hidden = false;
        option.disabled = !allowedStatuses.includes(option.value);
    });

    $("roomDialog").showModal();
}

async function saveRoom(event) {
    event.preventDefault();

    const id = Number($("roomId").value);
    const status = $("roomStatus").value;

    const submit = $("roomForm").querySelector(
        'button[type="submit"]'
    );

    submit.disabled = true;

    try {
        if (!id) {
            throw new Error("Không tìm thấy phòng.");
        }

        const result = await sendApi(
            `/rooms/${id}/status`,
            "PUT",
            { status }
        );

        $("roomDialog").close();
        await loadRooms();

        showMessage(
            result.message || "Cập nhật trạng thái thành công."
        );
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        submit.disabled = false;
    }
}

function openTypeDialog(type) {
    $("typeForm").reset();

    $("typeId").value = type.id;
    $("typeDialogTitle").textContent =
        `Chỉnh sửa ${type.name}`;

    $("typeName").value = type.name;
    $("typePrice").value = type.basePrice;
    $("typeArea").value = type.area ?? "";
    $("typeAdults").value = type.adultCapacity;
    $("typeChildren").value = type.childCapacity;
    $("typeBeds").value = type.bedCount ?? "";
    $("typeBedName").value = type.bedType ?? "";
    $("typeDescription").value = type.description ?? "";
    $("typeActive").checked = type.active;

    $("typeDialog").showModal();
}

function optionalNumber(value) {
    return value === "" ? null : Number(value);
}

async function saveType(event) {
    event.preventDefault();

    const id = Number($("typeId").value);

    const payload = {
        name: $("typeName").value.trim(),
        description: $("typeDescription").value.trim(),
        adultCapacity: Number($("typeAdults").value),
        childCapacity: Number($("typeChildren").value),
        area: optionalNumber($("typeArea").value),
        bedCount: optionalNumber($("typeBeds").value),
        bedType: $("typeBedName").value.trim(),
        basePrice: Number($("typePrice").value),
        active: $("typeActive").checked
    };

    const submit = $("typeForm").querySelector(
        'button[type="submit"]'
    );

    submit.disabled = true;

    try {
        const result = await sendApi(
            `/types/${id}`,
            "PUT",
            payload
        );

        $("typeDialog").close();

        await loadTypes();
        await loadRooms();
        await loadTypeDetails();

        showMessage(result.message);
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        submit.disabled = false;
    }
}

function renderAmenities(selectedIds = []) {
    const container = $("amenityCheckboxes");
    container.replaceChildren();

    for (const amenity of roomState.amenities) {
        if (
            !amenity.active &&
            !selectedIds.includes(amenity.id)
        ) {
            continue;
        }

        const label = document.createElement("label");
        label.className = "room-checkbox-line";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = amenity.id;
        checkbox.checked = selectedIds.includes(amenity.id);
        checkbox.disabled = !amenity.active;

        label.append(checkbox, amenity.name);
        container.appendChild(label);
    }
}

async function loadAmenities() {
    const id = Number($("amenityTypeSelect").value);

    if (!id) {
        $("amenityCheckboxes").replaceChildren();
        return;
    }

    const result = await requestApi(`/type-details/${id}`);
    renderAmenities(result.amenityIds);
}

async function saveAmenities() {
    const roomTypeId = Number($("amenityTypeSelect").value);

    const amenityIds = Array.from(
        $("amenityCheckboxes input:checked")
    ).map(input => Number(input.value));

    if (!roomTypeId) {
        showMessage("Chưa chọn loại phòng.", true);
        return;
    }

    try {
        const result = await sendApi(
            "/amenities",
            "PUT",
            { roomTypeId, amenityIds }
        );

        showMessage(result.message);
    } catch (error) {
        showMessage(error.message, true);
    }
}

function renderImages() {
    const grid = $("roomImageGrid");
    grid.replaceChildren();

    if (roomState.images.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Loại phòng này chưa có hình ảnh.";
        grid.appendChild(empty);
        return;
    }

    for (const photo of roomState.images) {
        const item = document.createElement("article");
        item.className = "room-image-item";

        const image = document.createElement("img");
        image.src = photo.path;
        image.alt = photo.description || "Hình ảnh phòng";
        image.loading = "lazy";

        const info = document.createElement("div");
        info.className = "room-image-info";

        const title = document.createElement("strong");
        title.textContent = photo.isCover
            ? "Ảnh đại diện"
            : "Ảnh phụ";

        const actions = document.createElement("div");
        actions.className = "room-image-actions";

        const cover = createButton(
            "Đặt đại diện",
            "room-small-button",
            () => setCoverImage(photo.id)
        );

        cover.disabled = photo.isCover;

        const remove = createButton(
            "Xóa ảnh",
            "room-small-button danger",
            () => deleteImage(photo.id)
        );

        actions.append(cover, remove);
        info.append(title, actions);
        item.append(image, info);

        grid.appendChild(item);
    }
}

async function refreshImages() {
    const id = Number($("imageTypeSelect").value);

    if (!id) {
        roomState.images = [];
        renderImages();
        return;
    }

    const result = await requestApi(`/type-details/${id}`);
    roomState.images = result.images;
    renderImages();
}

async function addImage(event) {
    event.preventDefault();

    const payload = {
        roomTypeId: Number($("imageTypeSelect").value),
        path: $("imagePath").value.trim(),
        description: $("imageDescription").value.trim(),
        isCover: $("imageCover").checked
    };

    try {
        const result = await sendApi(
            "/images",
            "POST",
            payload
        );

        $("imageForm").reset();
        await refreshImages();

        showMessage(result.message);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function setCoverImage(id) {
    try {
        const result = await sendApi(
            `/images/${id}/cover`,
            "PUT"
        );

        await refreshImages();
        showMessage(result.message);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteImage(id) {
    if (!confirm("Bạn có chắc muốn xóa ảnh này?")) {
        return;
    }

    try {
        const result = await sendApi(
            `/images/${id}`,
            "DELETE"
        );

        await refreshImages();
        showMessage(result.message);
    } catch (error) {
        showMessage(error.message, true);
    }
}

function activateTab(name) {
    for (const tab of [
        "rooms", "types", "amenities", "images"
    ]) {
        $(`${tab}Section`).hidden = tab !== name;
    }

    document.querySelectorAll(
        ".room-tab[data-tab]"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tab === name
        );
    });
}

async function logout() {
    try {
        const response = await fetch("/api/account/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRF-TOKEN": roomState.csrfToken
            }
        });

        if (!response.ok) {
            throw new Error("Đăng xuất không thành công.");
        }

        location.href = "/login.html";
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function initializeRooms() {
    try {
        if (!await verifyAdmin()) return;

        document.querySelectorAll(
            ".room-tab[data-tab]"
        ).forEach(tab => {
            tab.addEventListener("click", () => {
                activateTab(tab.dataset.tab);
            });
        });

        $("roomSearch").addEventListener("input", renderRooms);

        $("roomFloorFilter").addEventListener(
            "change", renderRooms
        );

        $("roomStatusFilter").addEventListener(
            "change", renderRooms
        );

        $("closeRoomDialog").addEventListener("click", () => {
            $("roomDialog").close();
        });

        $("closeTypeDialog").addEventListener("click", () => {
            $("typeDialog").close();
        });

        $("roomForm").addEventListener("submit", saveRoom);
        $("typeForm").addEventListener("submit", saveType);
        $("imageForm").addEventListener("submit", addImage);

        $("saveAmenitiesButton").addEventListener(
            "click", saveAmenities
        );

        $("amenityTypeSelect").addEventListener(
            "change", () => {
                loadAmenities().catch(error => {
                    showMessage(error.message, true);
                });
            }
        );

        $("imageTypeSelect").addEventListener(
            "change", () => {
                refreshImages().catch(error => {
                    showMessage(error.message, true);
                });
            }
        );

        $("logoutButton").addEventListener("click", logout);

        await getCsrfToken();

        const [rooms, types, amenities] = await Promise.all([
            requestApi("/rooms"),
            requestApi("/types"),
            requestApi("/amenities")
        ]);

        roomState.rooms = rooms;
        roomState.types = types;
        roomState.amenities = amenities;

        renderRooms();
        renderStatistics();
        renderTypes();

        populateSelect("roomType");
        populateSelect("amenityTypeSelect");
        populateSelect("imageTypeSelect");

        await loadAmenities();
        await refreshImages();
    } catch (error) {
        showMessage(error.message, true);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeRooms
);
