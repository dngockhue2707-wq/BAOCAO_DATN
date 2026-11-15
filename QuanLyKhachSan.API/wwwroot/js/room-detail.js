
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

        if (className) {
            element.className = className;
        }

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

        const rounded = Math.max(
            0,
            Math.min(5, Math.round(average))
        );

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

    // Lấy mã phòng thực tế, ưu tiên phongId.
    const selectedRoomId =
        params.get("phongId") || params.get("id");

    const roomId = Number(selectedRoomId);

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);

    const setText = (elementId, value) => {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = String(value ?? "");
        }
    };

    if (!Number.isInteger(roomId) || roomId <= 0) {
        setText("roomName", "Không tìm thấy phòng");
        setText("roomMessage", "Mã phòng không hợp lệ.");
        return;
    }

    try {
        // API tìm phòng theo MaPhong, không phải MaLoaiPhong.
        const response = await fetch(
            `/api/rooms/by-room/${roomId}`,
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Không thể tải chi tiết phòng."
            );
        }

        const room = data.room;

        if (!room) {
            throw new Error("Không tìm thấy thông tin phòng.");
        }

        // Đảm bảo API trả về đúng mã phòng được chọn.
        if (
            room.maPhong != null &&
            Number(room.maPhong) !== roomId
        ) {
            throw new Error(
                "Thông tin phòng không khớp với phòng đã chọn."
            );
        }

        setText(
            "roomName",
            `${room.tenLoaiPhong} - Phòng ${room.soPhong}`
        );

        setText(
            "roomDescription",
            room.moTa || "Thông tin phòng đang được cập nhật."
        );

        setText(
            "roomPrice",
            `${money(room.giaCoBan)} / đêm`
        );

        document.title =
            `Xem chi tiết phòng ${room.soPhong} | KS Hotel`;

        // Hiển thị hình ảnh phòng.
        const gallery = document.getElementById("roomImages");

        gallery.replaceChildren();

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
            placeholder.textContent = "KS HOTEL";
            gallery.appendChild(placeholder);
        } else {
            images.forEach(path => {
                const img = document.createElement("img");

                img.src = new URL(path, location.origin).href;
                img.alt = `Phòng ${room.soPhong}`;
                img.loading = "lazy";

                gallery.appendChild(img);
            });
        }

        // Thông tin phòng.
        const specsContainer =
            document.getElementById("roomSpecs");

        specsContainer.replaceChildren();

        const specs = [
            room.sucChuaNguoiLon != null
                ? `${room.sucChuaNguoiLon} người lớn`
                : null,

            room.sucChuaTreEm != null
                ? `${room.sucChuaTreEm} trẻ em`
                : null,

            room.dienTich
                ? `${room.dienTich} m²`
                : null,

            room.soGiuong != null
                ? `${room.soGiuong} giường`
                : null,

            room.loaiGiuong
        ].filter(Boolean);

        specs.forEach(value => {
            const span = document.createElement("span");
            span.textContent = value;
            specsContainer.appendChild(span);
        });

        // Tiện nghi phòng.
        const amenitiesContainer =
            document.getElementById("roomAmenities");

        amenitiesContainer.replaceChildren();

        const amenities = Array.isArray(data.amenities)
            ? [...data.amenities]
            : [];

        if (amenities.length === 0) {
            amenities.push(
                "Thông tin tiện nghi đang cập nhật"
            );
        }

        amenities.forEach(value => {
            const span = document.createElement("span");
            span.textContent = `✓ ${value}`;
            amenitiesContainer.appendChild(span);
        });

        // Giữ luồng đặt phòng hiện tại theo mã loại phòng.
        const bookingParams = new URLSearchParams({
            roomId: String(room.maLoaiPhong)
        });

        // Giữ lại ngày nhận, ngày trả và số lượng khách.
        [
            "checkIn",
            "checkOut",
            "adults",
            "children"
        ].forEach(key => {
            const value = params.get(key);

            if (value !== null && value !== "") {
                bookingParams.set(key, value);
            }
        });

        const bookButton =
            document.getElementById("bookRoomButton");

        if (bookButton) {
            bookButton.href =
                `/booking.html?${bookingParams.toString()}`;
        }

        // Đánh giá theo loại phòng.
        if (room.maLoaiPhong != null) {
            await loadRoomReviews(room.maLoaiPhong);
        }

    } catch (error) {
        console.error("Lỗi tải chi tiết phòng:", error);

        setText(
            "roomMessage",
            error.message || "Không thể tải thông tin phòng."
        );
    }
});
