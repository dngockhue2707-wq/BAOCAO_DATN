
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

        // 1. Hinh anh phong
        const image = makeElement("div", "rooms-card-image");

        if (room.hinhAnh) {
            const img = document.createElement("img");
            img.src = room.hinhAnh;
            img.alt = `Phòng ${room.soPhong} - ${type.tenLoaiPhong}`;
            img.loading = "lazy";
            image.appendChild(img);
        } else {
            image.appendChild(
                makeElement("span", "rooms-card-symbol", "✦")
            );
        }

        // 2. Noi dung phong
        const body = makeElement("div", "rooms-card-body");
        const info = makeElement("div", "rooms-card-information");

        const meta = makeElement("div", "rooms-card-meta");

        meta.append(
            makeElement(
                "span",
                "",
                room.tang != null ? `Tầng ${room.tang}` : "DNK Hotel"
            ),
            makeElement(
                "span",
                `rooms-status ${statusClass(room.trangThai)}`,
                room.trangThai || "Chưa cập nhật"
            )
        );

        const title = makeElement(
            "h3",
            "",
            type.tenLoaiPhong
        );

        const number = makeElement(
            "span",
            "rooms-room-number",
            `Phòng ${room.soPhong}`
        );

        const description = makeElement(
            "p",
            "rooms-description",
            room.moTa || type.moTa ||
            "Không gian nghỉ dưỡng tiện nghi tại DNK Hotel."
        );

        // 3. Thong tin suc chua, dien tich
        const specs = makeElement("div", "rooms-card-specs");

        // 4. Tien nghi lay tu API chi tiet
        const amenities = makeElement(
            "div",
            "rooms-amenities"
        );

        const amenitiesLoading = makeElement(
            "span",
            "rooms-details-loading",
            "Đang tải thông tin tiện nghi..."
        );

        amenities.appendChild(amenitiesLoading);

        info.append(
            meta,
            title,
            number,
            description,
            specs,
            amenities
        );

        // 5. Gia phong
        const pricePanel = makeElement(
            "div",
            "rooms-card-price-panel"
        );

        const priceLabel = makeElement(
            "span",
            "rooms-price-label",
            "Giá phòng mỗi đêm"
        );

        const price = makeElement(
            "strong",
            "rooms-card-price",
            type.giaCoBan != null
                ? money.format(type.giaCoBan)
                : "Liên hệ"
        );

        const priceNote = makeElement(
            "span",
            "rooms-price-note",
            "Giá tham khảo"
        );

        const button = makeElement(
            "a",
            "rooms-card-action",
            "Xem chi tiết phòng"
        );

        button.href =
            `/room-detail.html?id=${encodeURIComponent(room.maPhong)}`;

        pricePanel.append(
            priceLabel,
            price,
            priceNote,
            button
        );

        body.append(info, pricePanel);
        card.append(image, body);

        // 6. Lay du lieu thuc te tu API chi tiet
        async function loadRoomDetails() {
            try {
                const response = await fetch(
                    `/api/rooms/by-room/${encodeURIComponent(room.maPhong)}`,
                    {
                        credentials: "same-origin",
                        cache: "no-store"
                    }
                );

                if (!response.ok) {
                    throw new Error("Không thể tải chi tiết phòng");
                }

                const data = await response.json();
                const detail = data.room;

                if (!detail) {
                    throw new Error("Không có dữ liệu phòng");
                }

                // Mo ta tu trang chi tiet
                if (detail.moTa) {
                    description.textContent = detail.moTa;
                }

                // Dien tich, suc chua, giuong
                const roomSpecs = [
                    detail.dienTich
                        ? `${detail.dienTich} m²`
                        : null,
                    detail.sucChuaNguoiLon != null
                        ? `${detail.sucChuaNguoiLon} người lớn`
                        : null,
                    detail.sucChuaTreEm != null
                        ? `${detail.sucChuaTreEm} trẻ em`
                        : null,
                    detail.loaiGiuong || null
                ].filter(Boolean);

                specs.replaceChildren();

                roomSpecs.forEach(value => {
                    specs.appendChild(
                        makeElement(
                            "span",
                            "rooms-spec-item",
                            `✓ ${value}`
                        )
                    );
                });

                // Lay tien nghi that
                amenities.replaceChildren();

                const amenityList = Array.isArray(data.amenities)
                    ? data.amenities
                    : [];

                // Hien thi 6 tien nghi dau tien
                amenityList.slice(0, 6).forEach(value => {
                    amenities.appendChild(
                        makeElement(
                            "span",
                            "rooms-amenity",
                            `✓ ${value}`
                        )
                    );
                });

                // Neu con tien nghi, hien thi so luong
                if (amenityList.length > 6) {
                    amenities.appendChild(
                        makeElement(
                            "span",
                            "rooms-amenity-more",
                            `+${amenityList.length - 6} tiện nghi khác`
                        )
                    );
                }

                if (amenityList.length === 0) {
                    amenities.appendChild(
                        makeElement(
                            "span",
                            "rooms-details-loading",
                            "Tiện nghi đang cập nhật"
                        )
                    );
                }

                // Gia phong chinh xac tu API
                if (
                    detail.giaCoBan != null &&
                    Number.isFinite(Number(detail.giaCoBan))
                ) {
                    price.textContent = money.format(
                        Number(detail.giaCoBan)
                    );
                }

            } catch (error) {
                console.error(
                    `Lỗi tải chi tiết phòng ${room.maPhong}:`,
                    error
                );

                amenities.replaceChildren(
                    makeElement(
                        "span",
                        "rooms-details-loading",
                        "Xem chi tiết để biết tiện nghi"
                    )
                );
            }
        }

        loadRoomDetails();

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
