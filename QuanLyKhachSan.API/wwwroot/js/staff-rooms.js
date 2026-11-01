
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

    let rooms = [];

    async function load() {
        try {
            s.notify("Đang tải tình trạng phòng...");

            const data = await s.api("operations/rooms");
            rooms = data.items || [];

            render();
            s.notify(`Đã tải ${rooms.length} phòng.`);
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    function createStats() {
        const stats = s.el("section", "", "staff-cards");

        const groups = [
            ["Tổng số phòng", rooms.length],
            ["Trống", rooms.filter(x => x.status === "Trống").length],
            ["Đang sử dụng", rooms.filter(x => x.status === "Đang sử dụng").length],
            ["Đang dọn", rooms.filter(x => x.status === "Đang dọn").length],
            ["Bảo trì", rooms.filter(x => x.status === "Bảo trì").length],
            ["Ngừng hoạt động", rooms.filter(x => x.status === "Ngừng hoạt động").length]
        ];

        groups.forEach(([label, value]) => {
            const card = s.el("article", "", "staff-card");
            card.append(
                s.el("span", label),
                s.el("strong", value)
            );
            stats.appendChild(card);
        });

        return stats;
    }

    function statusBadge(status) {
        const badge = s.el("span", status, "room-status-badge");

        const classes = {
            "Trống": "room-status-empty",
            "Đang sử dụng": "room-status-occupied",
            "Đang dọn": "room-status-cleaning",
            "Bảo trì": "room-status-maintenance",
            "Ngừng hoạt động": "room-status-disabled"
        };

        badge.classList.add(classes[status] || "room-status-disabled");

        return badge;
    }

    function createActions(room) {
        const actions = s.el("div", "", "staff-actions");

        if (room.status === "Đang dọn") {
            actions.appendChild(
                s.button("Hoàn tất dọn", async () => {
                    await s.action(
                        `operations/rooms/${room.id}/cleaned`,
                        `Xác nhận phòng ${room.number} đã được vệ sinh xong?`,
                        load
                    );
                })
            );
        }

        if (room.status === "Trống") {
            actions.appendChild(
                s.button("Báo bảo trì", async () => {
                    await s.action(
                        `operations/rooms/${room.id}/maintenance`,
                        `Chuyển phòng ${room.number} sang trạng thái bảo trì?`,
                        load
                    );
                })
            );
        }

        if (room.status === "Bảo trì") {
            actions.appendChild(
                s.button("Hoàn tất bảo trì", async () => {
                    await s.action(
                        `operations/rooms/${room.id}/maintenance-complete`,
                        `Xác nhận phòng ${room.number} đã sửa chữa xong và sẵn sàng sử dụng?`,
                        load
                    );
                })
            );
        }

        if (actions.childElementCount === 0) {
            actions.appendChild(s.el("span", "Không có thao tác"));
        }

        return actions;
    }

    function render() {
        const page = s.el("div");

        page.appendChild(createStats());

        const panel = s.panel("Danh sách tình trạng phòng");

        const filters = s.el("div", "", "staff-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Tìm theo số phòng...";
        search.setAttribute("aria-label", "Tìm phòng");

        const filter = document.createElement("select");

        [
            "Tất cả",
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        ].forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            filter.appendChild(option);
        });

        filters.append(search, filter);

        const result = s.el("div");

        function update() {
            const keyword = search.value.trim().toLowerCase();

            const filtered = rooms.filter(room => {
                const matchNumber = String(room.number)
                    .toLowerCase()
                    .includes(keyword);

                const matchStatus =
                    filter.value === "Tất cả" ||
                    room.status === filter.value;

                return matchNumber && matchStatus;
            });

            const rows = filtered.map(room => [
                room.number,
                `Tầng ${room.floor ?? room.tang ?? "Chưa xác định"}`,
                room.type,
                statusBadge(room.status),
                createActions(room)
            ]);

            result.replaceChildren(
                s.el("p", `Hiển thị ${filtered.length}/${rooms.length} phòng`),
                s.table(
                    ["Số phòng", "Tầng", "Loại phòng", "Trạng thái", "Thao tác"],
                    rows
                )
            );
        }

        search.addEventListener("input", update);
        filter.addEventListener("change", update);

        panel.append(filters, result);
        page.appendChild(panel);

        s.content.replaceChildren(page);

        update();
    }

    load();
});
