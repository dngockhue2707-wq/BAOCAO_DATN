
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        pageTitle: document.getElementById("pageTitle"),
        pageDescription: document.getElementById("pageDescription"),
        overviewPanel: document.getElementById("overviewPanel"),
        typeNavigation: document.getElementById("typeNavigation"),
        tabs: document.getElementById("roomTypeTabs"),
        message: document.getElementById("roomsMessage"),
        summary: document.getElementById("typeSummary"),
        typeName: document.getElementById("typeName"),
        typeDescription: document.getElementById("typeDescription"),
        typePrice: document.getElementById("typePrice"),
        typePriceBox: document.getElementById("typePriceBox"),
        listTitle: document.getElementById("listTitle"),
        roomCount: document.getElementById("roomCount"),
        grid: document.getElementById("roomsGrid")
    };

    if (!elements.grid || !elements.tabs) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type");
    const isSpecificTypePage = requestedType !== null;

    let roomTypes = [];
    let activeTypeId = null;

    const money = new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    });

    function makeElement(tag, className = "", text = null) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== null && text !== undefined) {
            element.textContent = String(text);
        }

        return element;
    }

    function statusClass(value) {
        const status = String(value || "")
            .trim()
            .toLowerCase();

        if (
            ["trống", "còn trống", "sẵn sàng", "available"]
                .includes(status)
        ) {
            return "available";
        }

        if (
            ["đang sử dụng", "đang ở", "bảo trì", "occupied", "maintenance"]
                .includes(status)
        ) {
            return "unavailable";
        }

        return "";
    }

    function renderCard(room, type) {
        const card = makeElement("article", "rooms-card");

        const image = makeElement("div", "rooms-card-image");
        image.append(
            makeElement("span", "rooms-card-symbol", "✦"),
            makeElement("span", "rooms-card-number", `Phòng ${room.soPhong}`)
        );

        const body = makeElement("div", "rooms-card-body");
        const meta = makeElement("div", "rooms-card-meta");

        const floorText = room.tang === null || room.tang === undefined
            ? "DNK Hotel"
            : `Tầng ${room.tang}`;

        meta.append(
            makeElement("span", "", floorText),
            makeElement(
                "span",
                `rooms-status ${statusClass(room.trangThai)}`,
                room.trangThai || "Chưa cập nhật"
            )
        );

        const title = makeElement("h3", "", type.tenLoaiPhong);

        const description = makeElement(
            "p",
            "",
            room.moTa || "Không gian nghỉ dưỡng tiện nghi tại DNK Hotel."
        );

        const button = makeElement(
            "a",
            "rooms-card-action",
            "Xem chi tiết loại phòng"
        );

        button.href =
            `/room-detail.html?id=${encodeURIComponent(type.maLoaiPhong)}`;

        body.append(meta, title, description, button);
        card.append(image, body);

        return card;
    }

    function renderTabs() {
        elements.tabs.replaceChildren();

        roomTypes.forEach(type => {
            const button = makeElement(
                "button",
                "rooms-tab",
                type.tenLoaiPhong
            );

            button.type = "button";

            button.addEventListener("click", () => {
                activeTypeId = type.maLoaiPhong;
                renderCurrentType();
            });

            elements.tabs.appendChild(button);
        });
    }

    function renderCurrentType() {
        const type = roomTypes.find(
            item => item.maLoaiPhong === activeTypeId
        );

        if (!type) {
            return;
        }

        elements.tabs.querySelectorAll("button").forEach((button, index) => {
            const selected = roomTypes[index].maLoaiPhong === activeTypeId;
            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });

        elements.summary.hidden = false;
        elements.typeName.textContent = type.tenLoaiPhong;
        elements.typeDescription.textContent =
            type.moTa || "Khám phá các phòng nghỉ thuộc loại này.";

        if (type.giaCoBan === null || type.giaCoBan === undefined) {
            elements.typePriceBox.hidden = true;
        } else {
            elements.typePriceBox.hidden = false;
            elements.typePrice.textContent = money.format(type.giaCoBan);
        }

        elements.listTitle.textContent =
            `Danh sách ${type.tenLoaiPhong}`;

        const rooms = Array.isArray(type.phong) ? type.phong : [];

        elements.roomCount.textContent = `${rooms.length} phòng`;
        elements.grid.replaceChildren();

        if (rooms.length === 0) {
            elements.grid.append(
                makeElement(
                    "div",
                    "rooms-empty",
                    "Chưa có phòng nào thuộc loại phòng này."
                )
            );
            return;
        }

        rooms.forEach(room => {
            elements.grid.append(renderCard(room, type));
        });
    }

    async function loadRooms() {
        try {
            elements.message.classList.remove("error");
            elements.message.textContent =
                "Đang tải danh sách phòng từ SQL Server...";

            const response = await fetch("/api/room-catalog", {
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !Array.isArray(result.danhSach)) {
                throw new Error("Dữ liệu phòng không hợp lệ.");
            }

            roomTypes = result.danhSach.map(type => ({
                maLoaiPhong: Number(type.maLoaiPhong),
                tenLoaiPhong: type.tenLoaiPhong,
                moTa: type.moTa,
                giaCoBan: type.giaCoBan,
                phong: Array.isArray(type.phong) ? type.phong : []
            }));

            if (roomTypes.length === 0) {
                elements.message.textContent =
                    "Chưa có loại phòng nào trong SQL Server.";
                return;
            }

            if (isSpecificTypePage) {
                const type = roomTypes.find(
                    item => String(item.maLoaiPhong) === requestedType
                );

                elements.overviewPanel.hidden = true;
                elements.typeNavigation.hidden = false;

                if (!type) {
                    elements.message.classList.add("error");
                    elements.message.textContent =
                        "Không tìm thấy loại phòng được yêu cầu.";
                    elements.listTitle.textContent = "Danh sách phòng";
                    return;
                }

                activeTypeId = type.maLoaiPhong;
                elements.pageTitle.textContent = type.tenLoaiPhong;
                elements.pageDescription.textContent =
                    type.moTa || `Khám phá danh sách ${type.tenLoaiPhong} tại DNK Hotel.`;
                document.title = `${type.tenLoaiPhong} | DNK Hotel`;
            } else {
                elements.overviewPanel.hidden = false;
                elements.typeNavigation.hidden = true;
                activeTypeId = roomTypes[0].maLoaiPhong;
                renderTabs();
            }

            renderCurrentType();
            elements.message.textContent = "";
        } catch (error) {
            console.error("Không thể tải phòng:", error);
            elements.message.classList.add("error");
            elements.message.textContent =
                "Không thể tải phòng từ SQL Server. Vui lòng kiểm tra API /api/room-catalog.";
        }
    }

    loadRooms();
});
