
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(value);

    const setText = (elementId, value) => {
        document.getElementById(elementId).textContent = value;
    };

    if (!Number.isInteger(id) || id <= 0) {
        setText("roomName", "Không tìm thấy phòng");
        return;
    }

    try {
        const response = await fetch(`/api/rooms/${id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Không thể tải chi tiết phòng.");
        }

        const room = data.room;

        setText("roomName", room.tenLoaiPhong);
        setText(
            "roomDescription",
            room.moTa || "Thông tin phòng đang được cập nhật."
        );
        setText("roomPrice", `${money(room.giaCoBan)} / đêm`);

        const gallery = document.getElementById("roomImages");

        const images = (data.images || []).filter(path => {
            try {
                const url = new URL(path, location.origin);
                return url.protocol === "https:" ||
                       url.protocol === "http:";
            } catch {
                return false;
            }
        });

        if (images.length === 0) {
            const placeholder = document.createElement("div");
            placeholder.className = "detail-placeholder";
            placeholder.textContent = "DNK HOTEL";
            gallery.appendChild(placeholder);
        } else {
            images.forEach(path => {
                const img = document.createElement("img");
                img.src = new URL(path, location.origin).href;
                img.alt = room.tenLoaiPhong;
                img.loading = "lazy";
                gallery.appendChild(img);
            });
        }

        const specs = [
            `${room.sucChuaNguoiLon} người lớn`,
            `${room.sucChuaTreEm} trẻ em`,
            room.dienTich ? `${room.dienTich} m²` : null,
            `${room.soGiuong} giường`,
            room.loaiGiuong
        ].filter(Boolean);

        specs.forEach(value => {
            const span = document.createElement("span");
            span.textContent = value;
            document.getElementById("roomSpecs").appendChild(span);
        });

        const amenities = data.amenities || [];

        if (amenities.length === 0) {
            amenities.push("Thông tin tiện nghi đang cập nhật");
        }

        amenities.forEach(value => {
            const span = document.createElement("span");
            span.textContent = `✓ ${value}`;
            document.getElementById("roomAmenities").appendChild(span);
        });

        document.getElementById("bookRoomButton").href =
            `/booking.html?roomId=${id}`;

    } catch (error) {
        setText("roomMessage", error.message);
    }
});
