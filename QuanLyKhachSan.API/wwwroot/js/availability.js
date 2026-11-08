
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
        if (!start || !end) return NaN;

        const a = Date.parse(`${start}T00:00:00Z`);
        const b = Date.parse(`${end}T00:00:00Z`);

        return Math.round((b - a) / 86400000);
    }

    function showMessage(text, error = false) {
        if (!message) return;

        message.textContent = text;
        message.classList.toggle("error", error);
    }

    function el(tag, text = "", className = "") {
        const item = document.createElement(tag);
        item.textContent = String(text ?? "");

        if (className) {
            item.className = className;
        }

        return item;
    }

    function imageUrl(value) {
        if (typeof value !== "string" || !value.trim()) {
            return "";
        }

        const path = value.trim().replace(/\\/g, "/");

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        if (
            path.startsWith("//") ||
            /^[a-z][\w+.-]*:/i.test(path)
        ) {
            return "";
        }

        return "/" + path
            .replace(/^\/?wwwroot\//i, "")
            .replace(/^\/+/, "");
    }

    function fallbackImage() {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="800" height="480"
                 viewBox="0 0 800 480">
                <rect width="800" height="480" fill="#F3E7D6"/>
                <rect x="30" y="30" width="740" height="420"
                      rx="20" fill="#FAF8F5"/>
                <g fill="none" stroke="#926024"
                   stroke-width="9" stroke-linecap="round"
                   stroke-linejoin="round">
                    <rect x="260" y="165" width="280"
                          height="165" rx="14"/>
                    <path d="M260 245h280"/>
                    <path d="M290 245v-45h90v45"/>
                    <path d="M420 245v-45h90v45"/>
                    <path d="M280 330v25M520 330v25"/>
                </g>
                <text x="400" y="405"
                      font-family="Georgia,serif"
                      font-size="32" fill="#926024"
                      text-anchor="middle">DNK HOTEL</text>
            </svg>
        `;

        return "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(svg);
    }

    function createRoomImage(room) {
        const image = document.createElement("img");

        image.className = "availability-room-image";
        image.alt = `Phòng ${room.soPhong}`;
        image.loading = "lazy";
        image.decoding = "async";

        const src = imageUrl(room.hinhAnh);

        image.onerror = function () {
            console.warn(
                "Không tải được ảnh phòng:",
                room.soPhong,
                src
            );

            this.onerror = null;
            this.src = fallbackImage();
        };

        image.src = src || fallbackImage();

        return image;
    }

    function roomList(data) {
        const raw = Array.isArray(data)
            ? data
            : data?.danhSachPhong ??
              data?.phongTrong ??
              data?.danhSach ??
              [];

        if (!Array.isArray(raw)) {
            throw new Error("Dữ liệu danh sách phòng không hợp lệ.");
        }

        const rooms = raw.map(item => ({
            maPhong: item.maPhong ?? item.phongId,
            soPhong: item.soPhong ?? item.tenPhong,
            maLoaiPhong:
                item.maLoaiPhong ??
                item.loaiPhong?.maLoaiPhong,
            tenLoaiPhong:
                item.tenLoaiPhong ??
                item.loaiPhong?.tenLoaiPhong ??
                "Phòng nghỉ",
            tang: item.tang ?? item.soTang,
            moTa:
                item.moTa ??
                item.loaiPhong?.moTa,
            sucChuaNguoiLon:
                item.sucChuaNguoiLon ??
                item.loaiPhong?.sucChuaNguoiLon,
            sucChuaTreEm:
                item.sucChuaTreEm ??
                item.loaiPhong?.sucChuaTreEm,
            dienTich:
                item.dienTich ??
                item.loaiPhong?.dienTich,
            giaCoBan:
                item.giaCoBan ??
                item.loaiPhong?.giaCoBan,
            hinhAnh:
                item.hinhAnh ??
                item.loaiPhong?.hinhAnh
        }));

        if (
            raw.length &&
            rooms.some(room =>
                room.maPhong == null ||
                !room.soPhong
            )
        ) {
            throw new Error(
                "API hiện chưa trả danh sách từng phòng cụ thể. Cần cập nhật RoomsController."
            );
        }

        return rooms;
    }

    function render(rooms, params, nights) {
        results.replaceChildren();

        if (count) {
            count.textContent =
                `${rooms.length} phòng khả dụng`;
        }

        if (!rooms.length) {
            results.appendChild(el(
                "p",
                "Không tìm thấy phòng trống phù hợp với thời gian và số khách đã chọn."
            ));
            return;
        }

        rooms.forEach(room => {
            const card = el(
                "article",
                "",
                "availability-card"
            );

            card.appendChild(createRoomImage(room));

            card.appendChild(el(
                "h3",
                `Phòng ${room.soPhong}`
            ));

            const roomInfo = [
                room.tenLoaiPhong,
                room.tang != null
                    ? `Tầng ${room.tang}`
                    : ""
            ].filter(Boolean).join(" · ");

            card.appendChild(el("p", roomInfo));

            if (room.moTa) {
                card.appendChild(el(
                    "p",
                    room.moTa
                ));
            }

            if (room.sucChuaNguoiLon != null) {
                card.appendChild(el(
                    "p",
                    `Sức chứa: ${room.sucChuaNguoiLon} người lớn, ${room.sucChuaTreEm ?? 0} trẻ em`
                ));
            }

            if (room.dienTich != null) {
                card.appendChild(el(
                    "p",
                    `Diện tích: ${room.dienTich} m²`
                ));
            }

            const priceArea = el(
                "div",
                "",
                "availability-price"
            );

            const price = Number(room.giaCoBan);

            if (
                room.giaCoBan != null &&
                Number.isFinite(price) &&
                price >= 0
            ) {
                priceArea.appendChild(el(
                    "strong",
                    money(price * nights)
                ));

                priceArea.appendChild(el(
                    "small",
                    `${nights} đêm × ${money(price)}`
                ));
            } else {
                priceArea.appendChild(el(
                    "small",
                    "Liên hệ để biết giá"
                ));
            }

            card.appendChild(priceArea);

            const detailParams = new URLSearchParams({
                id: String(room.maLoaiPhong ?? ""),
                phongId: String(room.maPhong),
                checkIn: params.checkIn,
                checkOut: params.checkOut,
                adults: params.adults,
                children: params.children
            });

            const detail = el(
                "a",
                "Xem chi tiết và đặt phòng"
            );

            detail.href =
                `/room-detail.html?${detailParams.toString()}`;

            card.appendChild(detail);
            results.appendChild(card);
        });
    }

    async function search(event) {
        event?.preventDefault();

        const params = {
            checkIn: checkInInput.value,
            checkOut: checkOutInput.value,
            adults: adultsInput.value,
            children: childrenInput.value
        };

        const nights = nightsBetween(
            params.checkIn,
            params.checkOut
        );

        const today = localDate(new Date());

        if (
            !params.checkIn ||
            !params.checkOut ||
            params.checkIn < today ||
            !Number.isFinite(nights) ||
            nights < 1 ||
            nights > 30
        ) {
            showMessage(
                "Ngày lưu trú không hợp lệ. Bạn có thể đặt từ 1 đến 30 đêm.",
                true
            );
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = "Đang tìm phòng...";

        results.replaceChildren();

        if (count) {
            count.textContent = "";
        }

        showMessage("");

        try {
            const query = new URLSearchParams(params);

            const response = await fetch(
                `/api/room-availability?${query.toString()}`,
                {
                    credentials: "same-origin"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Không thể lấy phòng trống (HTTP ${response.status}).`
                );
            }

            const data = await response.json();

            const rooms = (data.rooms || []).map(room => ({
                maPhong: room.id,
                soPhong: room.roomNumber,
                tang: room.floor,
                maLoaiPhong: room.roomTypeId,
                tenLoaiPhong: room.roomTypeName,
                moTa: room.description,
                sucChuaNguoiLon: room.adultCapacity,
                sucChuaTreEm: room.childCapacity,
                dienTich: room.area,
                giaCoBan: room.pricePerNight,
                hinhAnh: room.hinhAnh || ""
            })).filter(room =>
                Number(room.sucChuaNguoiLon) >= Number(params.adults) &&
                Number(room.sucChuaTreEm) >= Number(params.children)
            );

            render(rooms, params, nights);

            showMessage(
                rooms.length
                    ? `Tìm thấy ${rooms.length} phòng còn trống cho ${nights} đêm.`
                    : "Không có phòng phù hợp."
            );
        } catch (error) {
            console.error("Lỗi tìm phòng:", error);

            showMessage(
                error.message ||
                "Có lỗi xảy ra khi tìm phòng.",
                true
            );
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = "Tìm phòng trống";
        }
    }

    const today = localDate(new Date());
    const query = new URLSearchParams(
        window.location.search
    );

    checkInInput.min = today;

    const requestedCheckIn = query.get("checkIn");

    checkInInput.value =
        requestedCheckIn && requestedCheckIn >= today
            ? requestedCheckIn
            : today;

    function updateCheckoutBounds() {
        if (!checkInInput.value) return;

        const min = addDays(checkInInput.value, 1);
        const max = addDays(checkInInput.value, 30);

        checkOutInput.min = min;
        checkOutInput.max = max;

        if (
            !checkOutInput.value ||
            checkOutInput.value < min ||
            checkOutInput.value > max
        ) {
            checkOutInput.value = min;
        }
    }

    checkOutInput.value = query.get("checkOut") || "";
    updateCheckoutBounds();

    const adults = Number(query.get("adults"));
    const children = Number(query.get("children"));

    if (
        query.has("adults") &&
        adults >= 1 &&
        adults <= 6
    ) {
        adultsInput.value = String(adults);
    }

    if (
        query.has("children") &&
        children >= 0 &&
        children <= 4
    ) {
        childrenInput.value = String(children);
    }

    checkInInput.addEventListener(
        "change",
        updateCheckoutBounds
    );

    form.addEventListener("submit", search);

    if (
        query.has("checkIn") &&
        query.has("checkOut")
    ) {
        search();
    }
});
