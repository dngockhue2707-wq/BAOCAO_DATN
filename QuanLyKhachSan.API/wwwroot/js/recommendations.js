
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("recommendationForm");
    const checkInInput = document.getElementById("recCheckIn");
    const checkOutInput = document.getElementById("recCheckOut");
    const submitButton = document.getElementById("findRecommendations");
    const list = document.getElementById("recommendationsList");
    const notice = document.getElementById("recommendationNotice");

    if (!form || !list || !notice) return;

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
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);

        return localDate(date);
    }

    function differenceDays(start, end) {
        const from = Date.parse(start + "T00:00:00Z");
        const to = Date.parse(end + "T00:00:00Z");

        return Math.round((to - from) / 86400000);
    }

    function node(tag, className = "", text = null) {
        const item = document.createElement(tag);

        if (className) {
            item.className = className;
        }

        if (text !== null && text !== undefined) {
            item.textContent = String(text);
        }

        return item;
    }

    function setNotice(text, isError = false) {
        notice.replaceChildren();
        notice.textContent = text;
        notice.classList.toggle("error", isError);
    }

    // Ngày mặc định: ngày mai đến ngày kia
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const defaultCheckIn = localDate(tomorrow);

    checkInInput.min = localDate(new Date());
    checkInInput.value = defaultCheckIn;

    checkOutInput.min = addDays(defaultCheckIn, 1);
    checkOutInput.value = addDays(defaultCheckIn, 1);

    checkInInput.addEventListener("change", () => {
        if (!checkInInput.value) return;

        const minimumCheckout = addDays(checkInInput.value, 1);
        checkOutInput.min = minimumCheckout;

        if (
            !checkOutInput.value ||
            checkOutInput.value <= checkInInput.value
        ) {
            checkOutInput.value = minimumCheckout;
        }
    });

    function createInfo(label, value) {
        const item = node("div", "recommendation-info-item");

        item.append(
            node("span", "", label),
            node("strong", "", value)
        );

        return item;
    }

    function createCard(room, index, nights, hasPreferences) {
        const card = node("article", "recommendation-card");

        const top = node("div", "recommendation-card-top");
        const heading = node("div");

        heading.append(
            node(
                "span",
                "recommendation-card-label",
                `ĐỀ XUẤT ${index + 1}`
            ),
            node(
                "h3",
                "",
                room.roomName || "Phòng DNK Hotel"
            )
        );

        top.appendChild(heading);

        // Chỉ hiển thị điểm cá nhân hóa
        // khi khách đã có hồ sơ sở thích.
        if (hasPreferences) {
            const score = node("div", "recommendation-score");

            score.append(
                node(
                    "strong",
                    "",
                    Math.round(Number(room.score) || 0)
                ),
                node("span", "", "Điểm phù hợp")
            );

            top.appendChild(score);
        }

        const info = node("div", "recommendation-card-info");

        info.append(
            createInfo(
                "Diện tích",
                Number(room.area) > 0
                    ? `${room.area} m²`
                    : "Chưa cập nhật"
            ),
            createInfo(
                "Người lớn",
                `${room.adultsCapacity || 0} người`
            ),
            createInfo(
                "Trẻ em",
                `${room.childrenCapacity || 0} người`
            ),
            createInfo(
                "Phòng khả dụng",
                `${room.availableRoomCount || 0} phòng`
            ),
            createInfo(
                "Giá mỗi đêm",
                money(room.pricePerNight)
            ),
            createInfo(
                "Số đêm",
                `${nights} đêm`
            )
        );

        const reasons = node("div", "recommendation-reasons");

        reasons.appendChild(
            node(
                "h4",
                "",
                hasPreferences
                    ? "Vì sao phòng này phù hợp?"
                    : "Thông tin đề xuất"
            )
        );

        const reasonsList = node("ul");

        const reasonItems = hasPreferences
            ? (Array.isArray(room.reasons) ? room.reasons : [])
            : [
                "Loại phòng có khả năng phục vụ khoảng ngày đã chọn",
                "Hãy cập nhật sở thích để nhận gợi ý cá nhân hóa"
            ];

        reasonItems.forEach(reason => {
            reasonsList.appendChild(
                node("li", "", reason)
            );
        });

        reasons.appendChild(reasonsList);

        const bottom = node("div", "recommendation-card-bottom");
        const priceBox = node("div");

        priceBox.append(
            node(
                "span",
                "recommendation-price-label",
                `Giá tham khảo cho ${nights} đêm`
            ),
            node(
                "strong",
                "recommendation-price",
                money(room.totalPrice)
            )
        );

        const viewButton = node(
            "a",
            "recommendation-view-button",
            "Khám phá phòng"
        );

        // Chưa gắn mã loại phòng vào URL vì cần
        // đối chiếu tham số thật của rooms.js.      
        viewButton.href =
            `/rooms.html?type=${encodeURIComponent(room.roomTypeId)}`;

        bottom.append(priceBox, viewButton);

        card.append(top, info, reasons, bottom);

        return card;
    }

    function showEmpty() {
        list.replaceChildren();

        const box = node("div", "recommendations-empty");

        box.append(
            node("h3", "", "Chưa tìm thấy phòng phù hợp"),
            node(
                "p",
                "",
                "Không có loại phòng khả dụng trong khoảng ngày " +
                "đã chọn. Bạn có thể thử ngày nhận hoặc trả phòng khác."
            )
        );

        list.appendChild(box);
    }

    async function loadRecommendations() {
        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;

        if (!checkIn || !checkOut) {
            setNotice("Vui lòng chọn ngày nhận và trả phòng.", true);
            return;
        }

        const nights = differenceDays(checkIn, checkOut);

        if (
            checkIn < localDate(new Date()) ||
            nights < 1 ||
            nights > 30
        ) {
            setNotice(
                "Ngày lưu trú không hợp lệ. " +
                "Vui lòng chọn từ 1 đến 30 đêm.",
                true
            );
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Đang tìm phòng...";

        setNotice("Đang tìm các phòng phù hợp với bạn...");
        list.replaceChildren();

        const params = new URLSearchParams({
            checkIn,
            checkOut,
            top: "5"
        });

        try {
            const response = await fetch(
                `/api/recommendations/mine?${params.toString()}`,
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            if (response.status === 401) {
                setNotice(
                    "Bạn cần đăng nhập bằng tài khoản khách hàng " +
                    "để sử dụng chức năng gợi ý phòng.",
                    true
                );

                const loginLink = node(
                    "a",
                    "",
                    "Đăng nhập tại đây"
                );
                loginLink.href = "/login.html";

                notice.append(" ", loginLink);
                return;
            }

            if (response.status === 403) {
                throw new Error(
                    "Chức năng gợi ý phòng chỉ dành cho khách hàng."
                );
            }

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Không thể tải danh sách phòng gợi ý."
                );
            }

            if (!Array.isArray(data.recommendations)) {
                throw new Error(
                    "Dữ liệu gợi ý không đúng định dạng."
                );
            }

            if (!data.hasPreferences) {
                setNotice(
                    "Tài khoản của bạn chưa có hồ sơ sở thích. " +
                    "Đây là các phòng khả dụng, chưa phải kết quả " +
                    "cá nhân hóa. Hãy vào Tài khoản → " +
                    "Sở thích lưu trú để cập nhật."
                );
            } else {
                setNotice(
                    `Đã tìm thấy ${data.totalCandidates} loại phòng ` +
                    "có thể xem xét. Danh sách bên dưới được " +
                    "xếp theo điểm phù hợp."
                );
            }

            if (!data.recommendations.length) {
                showEmpty();
                return;
            }

            data.recommendations.forEach((room, index) => {
                list.appendChild(
                    createCard(
                        room,
                        index,
                        data.nights || nights,
                        data.hasPreferences === true
                    )
                );
            });

        } catch (error) {
            setNotice(
                error.message || "Có lỗi khi tải phòng gợi ý.",
                true
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Tìm phòng phù hợp";
        }
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        loadRecommendations();
    });

    loadRecommendations();
});
