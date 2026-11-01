
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("availabilityForm");
    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
    const adultsInput = document.getElementById("adults");
    const childrenInput = document.getElementById("children");
    const searchButton = document.getElementById("searchAvailability");
    const message = document.getElementById("availabilityMessage");
    const results = document.getElementById("availabilityResults");
    const count = document.getElementById("availabilityCount");

    if (!form || !results) return;

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    function localDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function addDays(value, days) {
        const [y, m, d] = value.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        return localDate(date);
    }

    function nightsBetween(start, end) {
        const a = Date.parse(`${start}T00:00:00Z`);
        const b = Date.parse(`${end}T00:00:00Z`);
        return Math.round((b - a) / 86400000);
    }

    function showMessage(text, error = false) {
        message.textContent = text;
        message.classList.toggle("error", error);
    }

    function el(tag, text, className = "") {
        const item = document.createElement(tag);
        item.textContent = text;
        if (className) item.className = className;
        return item;
    }

    function render(types, params, nights) {
        results.replaceChildren();

        const available = types.filter(type =>
            Number(type.phongConTrong) > 0
        );

        const totalRooms = available.reduce(
            (sum, type) => sum + Number(type.phongConTrong),
            0
        );

        count.textContent = `${totalRooms} phòng khả dụng`;

        if (!available.length) {
            results.appendChild(el(
                "p",
                "Không có phòng phù hợp trong khoảng thời gian đã chọn."
            ));
            return totalRooms;
        }

        available.forEach(type => {
            const card = el("article", "", "availability-card");

            if (type.hinhAnh) {
                const image = document.createElement("img");
                image.src = type.hinhAnh;
                image.alt = type.tenLoaiPhong;
                image.loading = "lazy";
                image.className = "availability-room-image";
                card.appendChild(image);
            }

            card.appendChild(el("h3", type.tenLoaiPhong));

            card.appendChild(el(
                "p",
                type.moTa || "Không gian nghỉ dưỡng tại DNK Hotel."
            ));

            card.appendChild(el(
                "p",
                `Sức chứa: ${type.sucChuaNguoiLon} người lớn, ${type.sucChuaTreEm} trẻ em`
            ));

            if (type.dienTich) {
                card.appendChild(el(
                    "p",
                    `Diện tích: ${type.dienTich} m²`
                ));
            }

            card.appendChild(el(
                "p",
                `Còn ${type.phongConTrong}/${type.tongPhong} phòng`
            ));

            const priceArea = el("div", "", "availability-price");

            const price = Number(type.giaCoBan);

            priceArea.appendChild(el(
                "strong",
                money(price * nights)
            ));

            priceArea.appendChild(el(
                "small",
                `${nights} đêm × ${money(price)}`
            ));

            card.appendChild(priceArea);

            const detailParams = new URLSearchParams({
                id: String(type.maLoaiPhong),
                checkIn: params.checkIn,
                checkOut: params.checkOut,
                adults: params.adults,
                children: params.children
            });

            const detail = el(
                "a",
                "Xem chi tiết và đặt phòng"
            );

            detail.href = `/room-detail.html?${detailParams.toString()}`;

            card.appendChild(detail);
            results.appendChild(card);
        });

        return totalRooms;
    }

    async function search(event) {
        event?.preventDefault();

        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;
        const adults = adultsInput.value;
        const children = childrenInput.value;
        const today = localDate(new Date());

        const nights = nightsBetween(checkIn, checkOut);

        if (!checkIn || !checkOut ||
            checkIn < today ||
            !Number.isFinite(nights) ||
            nights < 1 ||
            nights > 30) {
            showMessage(
                "Ngày lưu trú không hợp lệ. Bạn có thể đặt từ 1 đến 30 đêm.",
                true
            );
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = "Đang tìm phòng...";
        results.replaceChildren();
        count.textContent = "";
        showMessage("");

        const params = {
            checkIn,
            checkOut,
            adults,
            children
        };

        try {
            const query = new URLSearchParams(params);

            const response = await fetch(
                `/api/rooms?${query.toString()}`,
                { credentials: "same-origin" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không thể kiểm tra phòng trống."
                );
            }

            const total = render(
                data.danhSach || [],
                params,
                nights
            );

            showMessage(
                total > 0
                    ? `Tìm thấy ${total} phòng khả dụng cho ${nights} đêm.`
                    : "Không tìm thấy phòng phù hợp. Vui lòng chọn thời gian hoặc số khách khác."
            );
        } catch (error) {
            showMessage(
                error.message || "Có lỗi xảy ra khi tìm phòng.",
                true
            );
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = "Tìm phòng trống";
        }
    }

    const today = localDate(new Date());
    const query = new URLSearchParams(location.search);

    checkInInput.min = today;
    checkInInput.value =
        query.get("checkIn") >= today
            ? query.get("checkIn")
            : today;

    checkOutInput.min = addDays(checkInInput.value, 1);
    checkOutInput.value =
        query.get("checkOut") > checkInInput.value
            ? query.get("checkOut")
            : addDays(checkInInput.value, 1);

    const adults = Number(query.get("adults"));
    const children = Number(query.get("children"));

    if (adults >= 1 && adults <= 6) {
        adultsInput.value = String(adults);
    }

    if (children >= 0 && children <= 4) {
        childrenInput.value = String(children);
    }

    checkInInput.addEventListener("change", () => {
        const min = addDays(checkInInput.value, 1);
        checkOutInput.min = min;

        if (checkOutInput.value < min) {
            checkOutInput.value = min;
        }

        checkOutInput.max = addDays(checkInInput.value, 30);
    });

    checkOutInput.max = addDays(checkInInput.value, 30);

    form.addEventListener("submit", search);

    if (query.has("checkIn") && query.has("checkOut")) {
        search();
    }
});
