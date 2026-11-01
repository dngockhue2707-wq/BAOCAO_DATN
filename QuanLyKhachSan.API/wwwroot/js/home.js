"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    const guests = document.getElementById("guests");
    const message = document.getElementById("searchMessage");

    if (!searchForm || !checkin || !checkout || !guests) return;

    function getLocalDate(daysToAdd = 0) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    const today = getLocalDate();

    checkin.min = today;
    checkout.min = getLocalDate(1);

    checkin.addEventListener("change", () => {
        if (!checkin.value) return;

        const nextDay = new Date(checkin.value + "T00:00:00");
        nextDay.setDate(nextDay.getDate() + 1);

        const year = nextDay.getFullYear();
        const month = String(nextDay.getMonth() + 1).padStart(2, "0");
        const day = String(nextDay.getDate()).padStart(2, "0");

        const minCheckout = `${year}-${month}-${day}`;

        checkout.min = minCheckout;

        if (checkout.value && checkout.value < minCheckout) {
            checkout.value = "";
        }

        message.textContent = "";
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        message.textContent = "";

        const from = checkin.value;
        const to = checkout.value;

        if (!from || !to) {
            message.textContent =
                "Vui lòng chọn ngày nhận và trả phòng.";
            return;
        }

        if (from < getLocalDate()) {
            message.textContent =
                "Ngày nhận phòng không được ở trong quá khứ.";
            return;
        }

        if (to <= from) {
            message.textContent =
                "Ngày trả phòng phải sau ngày nhận phòng.";
            return;
        }

        const params = new URLSearchParams({
            checkin: from,
            checkout: to,
            guests: guests.value
        });

        window.location.href = `/availability.html?${params.toString()}`;
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.querySelector(".room-grid");

    if (!grid) return;

    try {
        const response = await fetch("/api/room-catalog", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) return;

        const result = await response.json();

        if (!result.success || !Array.isArray(result.danhSach)) return;

        const types = result.danhSach
            .filter(type => Array.isArray(type.phong) && type.phong.length > 0)
            .slice(0, 3);

        if (!types.length) return;

        grid.replaceChildren();

        types.forEach(type => {
            const room = type.phong.find(item => item.hinhAnh) || type.phong[0];

            const card = document.createElement("article");
            card.className = "room-card";

            const image = document.createElement("div");
            image.className = "room-image";

            if (room.hinhAnh) {
                image.style.backgroundImage =
                    `url("${room.hinhAnh.replace(/["\\]/g, "")}")`;
                image.style.backgroundSize = "cover";
                image.style.backgroundPosition = "center";
            }

            const tag = document.createElement("span");
            tag.className = "room-tag";
            tag.textContent = type.tenLoaiPhong;

            image.appendChild(tag);

            const info = document.createElement("div");
            info.className = "room-info";

            const category = document.createElement("span");
            category.className = "room-category";
            category.textContent = `PHÒNG ${room.soPhong}`;

            const title = document.createElement("h3");
            title.textContent = type.tenLoaiPhong;

            const description = document.createElement("p");
            description.textContent =
                room.moTa || type.moTa || "Không gian nghỉ dưỡng tại DNK Hotel.";

            const link = document.createElement("a");
            link.className = "room-link";
            link.href = `/room-detail.html?id=${room.maPhong}`;
            link.textContent = "Khám phá phòng ↗";

            info.append(category, title, description, link);
            card.append(image, info);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Không tải được phòng nổi bật:", error);
    }
});