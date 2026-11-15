"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;

    let rooms = [];
    let keyword = "";
    let selectedStatus = "Tất cả";
    let selectedRoom = null;

    const create = (tag, className = "", text = "") => {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null && text !== "") {
            element.textContent = String(text);
        }

        return element;
    };

    const getFloor = room => {
        const floor = room.floor ?? room.tang;

        if (floor !== null && floor !== undefined && String(floor).trim() !== "") {
            return String(floor);
        }

        const number = String(room.number ?? "");
        const numeric = Number(number);

        if (/^\d{3,4}$/.test(number) && Number.isFinite(numeric)) {
            return String(Math.floor(numeric / 100));
        }

        return "Khác";
    };

    const getRoomType = room =>
        room.type ||
        room.roomType ||
        room.loaiPhong ||
        "Phòng khách sạn";

    const statusMap = {
        "Trống": {
            key: "free",
            label: "Trống",
            icon: "○"
        },
        "Đang sử dụng": {
            key: "occupied",
            label: "Có khách",
            icon: "◉"
        },
        "Đang dọn": {
            key: "cleaning",
            label: "Đang dọn",
            icon: "◌"
        },
        "Bảo trì": {
            key: "maintenance",
            label: "Bảo trì",
            icon: "◇"
        },
        "Ngừng hoạt động": {
            key: "disabled",
            label: "Ngừng",
            icon: "—"
        }
    };

    const getStatusConfig = status =>
        statusMap[status] || {
            key: "disabled",
            label: status || "Không rõ",
            icon: "—"
        };

    const roomCount = status =>
        rooms.filter(room => room.status === status).length;

    const filteredRooms = () => {
        const search = keyword.toLocaleLowerCase("vi-VN");

        return rooms.filter(room => {
            const text = [
                room.number,
                getRoomType(room),
                getFloor(room),
                room.status
            ]
                .join(" ")
                .toLocaleLowerCase("vi-VN");

            const matchesSearch = text.includes(search);
            const matchesStatus =
                selectedStatus === "Tất cả" ||
                room.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });
    };

    const createStatCard = (label, value, icon, type) => {
        const card = create("article", `sr-stat-card ${type}`);
        const iconBox = create("span", "sr-stat-icon", icon);
        const body = create("div", "sr-stat-body");

        body.append(
            create("strong", "", value),
            create("span", "", label)
        );

        card.append(iconBox, body);

        return card;
    };

    const createStats = () => {
        const stats = create("section", "sr-stats");

        stats.append(
            createStatCard("Tổng phòng", rooms.length, "▦", "total"),
            createStatCard("Trống", roomCount("Trống"), "○", "free"),
            createStatCard("Có khách", roomCount("Đang sử dụng"), "◉", "occupied"),
            createStatCard("Cần dọn", roomCount("Đang dọn"), "◌", "cleaning"),
            createStatCard("Bảo trì", roomCount("Bảo trì"), "◇", "maintenance"),
            createStatCard("Ngừng hoạt động", roomCount("Ngừng hoạt động"), "—", "disabled")
        );

        return stats;
    };

    const closeModal = () => {
        document.getElementById("staffRoomModal")?.remove();
        selectedRoom = null;
        document.body.classList.remove("sr-modal-open");
    };

    const createActionButton = (label, endpoint, confirmText) => {
        const button = create("button", "sr-modal-action-button", label);
        button.type = "button";

        button.addEventListener("click", async () => {
            await s.action(endpoint, confirmText, load);
        });

        return button;
    };

    const createRoomActions = room => {
        const wrapper = create("div", "sr-modal-actions");

        if (room.status === "Đang dọn") {
            wrapper.appendChild(
                createActionButton(
                    "Hoàn tất dọn",
                    `operations/rooms/${room.id}/cleaned`,
                    `Xác nhận phòng ${room.number} đã dọn xong?`
                )
            );
        }

        if (room.status === "Trống") {
            wrapper.appendChild(
                createActionButton(
                    "Báo bảo trì",
                    `operations/rooms/${room.id}/maintenance`,
                    `Chuyển phòng ${room.number} sang bảo trì?`
                )
            );
        }

        if (room.status === "Bảo trì") {
            wrapper.appendChild(
                createActionButton(
                    "Hoàn tất bảo trì",
                    `operations/rooms/${room.id}/maintenance-complete`,
                    `Xác nhận phòng ${room.number} đã bảo trì xong?`
                )
            );
        }

        if (!wrapper.children.length) {
            wrapper.appendChild(
                create("span", "sr-modal-no-action", "Không có thao tác")
            );
        }

        return wrapper;
    };

    const showDetail = room => {
        closeModal();
        selectedRoom = room;

        const config = getStatusConfig(room.status);

        const overlay = create("div", "sr-modal-overlay");
        overlay.id = "staffRoomModal";

        const modal = create("section", "sr-modal");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", `Thông tin phòng ${room.number}`);

        const header = create("div", "sr-modal-header");

        const titleWrap = create("div", "sr-modal-title-wrap");
        titleWrap.append(
            create("span", "sr-modal-eyebrow", "ROOM DETAILS"),
            create("h2", "", `Phòng ${room.number}`)
        );

        const closeButton = create("button", "sr-modal-close", "×");
        closeButton.type = "button";
        closeButton.setAttribute("aria-label", "Đóng");

        closeButton.addEventListener("click", closeModal);

        header.append(titleWrap, closeButton);

        const statusPill = create(
            "div",
            `sr-modal-status ${config.key}`,
            `${config.icon} ${room.status || "Không rõ"}`
        );

        const body = create("div", "sr-modal-body");
        const grid = create("div", "sr-modal-grid");

        [
            ["Số phòng", room.number || "—"],
            ["Tầng", getFloor(room)],
            ["Loại phòng", getRoomType(room)],
            ["Trạng thái", room.status || "—"]
        ].forEach(([label, value]) => {
            const item = create("div", "sr-modal-field");
            item.append(
                create("span", "", label),
                create("strong", "", value)
            );
            grid.appendChild(item);
        });

        body.append(statusPill, grid);

        const footer = create("div", "sr-modal-footer");
        footer.appendChild(createRoomActions(room));

        modal.append(header, body, footer);
        overlay.appendChild(modal);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        document.body.appendChild(overlay);
        document.body.classList.add("sr-modal-open");

        closeButton.focus();
    };

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && selectedRoom) {
            closeModal();
        }
    });

    const createLegend = () => {
        const legend = create("div", "sr-legend");

        [
            ["free", "Trống"],
            ["occupied", "Có khách"],
            ["cleaning", "Đang dọn"],
            ["maintenance", "Bảo trì"],
            ["disabled", "Ngừng hoạt động"]
        ].forEach(([type, label]) => {
            const item = create("span", "sr-legend-item");
            const dot = create("i", `sr-legend-dot ${type}`);
            item.append(dot, document.createTextNode(label));
            legend.appendChild(item);
        });

        return legend;
    };

    const createRoomCard = room => {
        const config = getStatusConfig(room.status);

        const button = create("button", `sr-room-card ${config.key}`);
        button.type = "button";
        button.title = `Phòng ${room.number} - ${room.status}`;

        const top = create("div", "sr-room-top");
        top.append(
            create("span", `sr-room-badge ${config.key}`, config.label),
            create("span", "sr-room-floor", `Tầng ${getFloor(room)}`)
        );

        const center = create("div", "sr-room-center");
        center.append(
            create("strong", "sr-room-number", room.number),
            create("span", "sr-room-type", getRoomType(room))
        );

        const bottom = create("div", "sr-room-bottom");
        bottom.append(
            create("span", `sr-room-status ${config.key}`, room.status || "Không rõ"),
            create("span", "sr-room-view", "Xem chi tiết")
        );

        button.append(top, center, bottom);

        button.addEventListener("click", () => {
            showDetail(room);
        });

        return button;
    };

    const renderFloorGroups = (container, list) => {
        container.replaceChildren();

        if (!list.length) {
            container.appendChild(
                create("div", "sr-empty", "Không tìm thấy phòng phù hợp.")
            );
            return;
        }

        const groups = new Map();

        list.forEach(room => {
            const floor = getFloor(room);

            if (!groups.has(floor)) {
                groups.set(floor, []);
            }

            groups.get(floor).push(room);
        });

        const floors = [...groups.keys()].sort((a, b) => {
            const first = Number(a);
            const second = Number(b);

            if (Number.isFinite(first) && Number.isFinite(second)) {
                return first - second;
            }

            return String(a).localeCompare(String(b), "vi");
        });

        floors.forEach(floor => {
            const section = create("section", "sr-floor-section");

            const header = create("div", "sr-floor-header");
            const title =
                floor === "Khác"
                    ? "Khu vực khác"
                    : `Tầng ${floor}`;

            const floorRooms = groups.get(floor);

            header.append(
                create("h3", "", title),
                create("span", "", `${floorRooms.length} phòng`)
            );

            const grid = create("div", "sr-room-grid");

            floorRooms
                .sort((a, b) =>
                    String(a.number).localeCompare(
                        String(b.number),
                        "vi",
                        { numeric: true }
                    )
                )
                .forEach(room => {
                    grid.appendChild(createRoomCard(room));
                });

            section.append(header, grid);
            container.appendChild(section);
        });
    };

    const render = () => {
        closeModal();

        const page = create("div", "sr-page");
        const stats = createStats();

        const panel = create("section", "sr-panel");

        const panelHead = create("div", "sr-panel-head");
        panelHead.append(
            create("h2", "", "Sơ đồ phòng"),
            create("span", "sr-panel-count", `${rooms.length}/${rooms.length} phòng`)
        );

        const filters = create("div", "sr-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Tìm số phòng...";
        search.value = keyword;
        search.setAttribute("aria-label", "Tìm phòng");

        const statusSelect = document.createElement("select");
        [
            "Tất cả",
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        ].forEach(value => {
            statusSelect.add(new Option(value, value));
        });
        statusSelect.value = selectedStatus;

        filters.append(search, statusSelect);

        const legend = createLegend();
        const content = create("div", "sr-floor-list");

        const update = () => {
            keyword = search.value.trim();
            selectedStatus = statusSelect.value;

            const result = filteredRooms();
            renderFloorGroups(content, result);

            const counter = panelHead.querySelector(".sr-panel-count");

            if (counter) {
                counter.textContent = `${result.length}/${rooms.length} phòng`;
            }
        };

        search.addEventListener("input", update);
        statusSelect.addEventListener("change", update);

        panel.append(panelHead, filters, legend, content);
        page.append(stats, panel);

        s.content.replaceChildren(page);

        update();
    };

    async function load() {
        try {
            s.notify("Đang tải phòng...");

            const data = await s.api("operations/rooms");

            rooms = Array.isArray(data.items) ? data.items : [];

            render();
            s.notify("");
        } catch (error) {
            s.notify(
                error.message || "Không thể tải tình trạng phòng.",
                true
            );
        }
    }

    load();
});