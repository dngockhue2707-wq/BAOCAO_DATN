
"use strict";


async function loadRoomReviews(roomTypeId) {
    const averageElement =
        document.getElementById("roomReviewAverage");

    const starsElement =
        document.getElementById("roomReviewStars");

    const totalElement =
        document.getElementById("roomReviewTotal");

    const listElement =
        document.getElementById("roomReviewsList");

    if (!averageElement || !starsElement ||
        !totalElement || !listElement) {
        return;
    }

    function createElement(tag, text, className = "") {
        const element = document.createElement(tag);
        element.textContent = String(text ?? "");
        if (className) element.className = className;
        return element;
    }

    try {
        const response = await fetch(
            `/api/reviews/room-type/${roomTypeId}`,
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Không thể tải đánh giá.");
        }

        const data = await response.json();
        const reviews = data.danhSach || [];

        listElement.replaceChildren();

        if (!reviews.length) {
            averageElement.textContent = "—";
            starsElement.textContent = "☆☆☆☆☆";
            totalElement.textContent = "Chưa có đánh giá";

            listElement.appendChild(
                createElement(
                    "p",
                    "Chưa có nhận xét nào cho loại phòng này.",
                    "detail-review-empty"
                )
            );
            return;
        }

        const average = Number(data.diemTrungBinh) || 0;

        averageElement.textContent =
            average.toFixed(1);

        const rounded = Math.round(average);

        starsElement.textContent =
            "★".repeat(rounded) +
            "☆".repeat(5 - rounded);

        totalElement.textContent =
            `${data.tongDanhGia} đánh giá từ khách lưu trú`;

        reviews.forEach(review => {
            const card = createElement(
                "article",
                "",
                "detail-review-card"
            );

            const header = createElement(
                "div",
                "",
                "detail-review-card-header"
            );

            const name = createElement(
                "strong",
                review.hoTen || "Khách lưu trú"
            );

            const rating = Math.max(
                0,
                Math.min(5, Number(review.soSao) || 0)
            );

            const stars = createElement(
                "span",
                "★".repeat(rating) +
                "☆".repeat(5 - rating),
                "detail-review-card-stars"
            );

            header.append(name, stars);

            const date = createElement(
                "p",
                review.ngayDanhGia
                    ? new Date(review.ngayDanhGia)
                        .toLocaleDateString("vi-VN")
                    : "",
                "detail-review-date"
            );

            const content = createElement(
                "p",
                review.noiDung || "Không có nhận xét.",
                "detail-review-content"
            );

            card.append(header, date, content);
            listElement.appendChild(card);
        });

    } catch (error) {
        totalElement.textContent = "Không thể tải đánh giá";

        listElement.replaceChildren(
            createElement(
                "p",
                error.message,
                "detail-review-empty"
            )
        );
    }
}

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
        const response = await fetch(`/api/rooms/by-room/${id}`, {
            credentials: "same-origin",
            cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Không thể tải chi tiết phòng.");
        }

        const room = data.room;

        setText(
            "roomName",
            `${room.tenLoaiPhong} - Phòng ${room.soPhong}`
        );
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
            `/booking.html?roomId=${room.maLoaiPhong}`;

        await loadRoomReviews(room.maLoaiPhong);

    } catch (error) {
        setText("roomMessage", error.message);
    }
});
