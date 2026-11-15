
"use strict";

/* ============================================
   KS HOTEL - HOME.JS
   ============================================ */

/* ============================================
   1. HAM DUNG CHUNG
   ============================================ */

function homeLocalDate(daysToAdd = 0) {
    const date = new Date();

    date.setDate(date.getDate() + daysToAdd);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function homeFormatDate(value) {
    const parts = String(value || "").split("-");

    if (parts.length !== 3) {
        return value || "";
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function homeFormatMoney(amount) {
    const number = Number(amount);

    if (!Number.isFinite(number)) {
        return "Liên hệ";
    }

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(number);
}

function homeCreateElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

/* ============================================
   2. TIM PHONG NHANH
   ============================================ */

function homeInitializeSearch() {
    const searchForm = document.getElementById("searchForm");
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    const guests = document.getElementById("guests");
    const message = document.getElementById("searchMessage");

    if (!searchForm || !checkin || !checkout || !guests) {
        return;
    }

    checkin.min = homeLocalDate();
    checkout.min = homeLocalDate(1);

    checkin.addEventListener("change", () => {
        if (!checkin.value) {
            return;
        }

        const date = new Date(
            `${checkin.value}T00:00:00`
        );

        date.setDate(date.getDate() + 1);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        const minimumCheckout =
            `${year}-${month}-${day}`;

        checkout.min = minimumCheckout;

        if (
            checkout.value &&
            checkout.value < minimumCheckout
        ) {
            checkout.value = "";
        }

        if (message) {
            message.textContent = "";
        }
    });

    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        if (message) {
            message.textContent = "";
        }

        const from = checkin.value;
        const to = checkout.value;

        if (!from || !to) {
            if (message) {
                message.textContent =
                    "Vui lòng chọn ngày nhận và trả phòng.";
            }
            return;
        }

        if (from < homeLocalDate()) {
            if (message) {
                message.textContent =
                    "Ngày nhận phòng không được ở trong quá khứ.";
            }
            return;
        }

        if (to <= from) {
            if (message) {
                message.textContent =
                    "Ngày trả phòng phải sau ngày nhận phòng.";
            }
            return;
        }

        const nights = Math.round(
            (
                new Date(`${to}T00:00:00`) -
                new Date(`${from}T00:00:00`)
            ) / 86400000
        );

        if (nights < 1 || nights > 30) {
            if (message) {
                message.textContent =
                    "Thời gian lưu trú phải từ 1 đến 30 đêm.";
            }
            return;
        }

        const params = new URLSearchParams({
            checkin: from,
            checkout: to,
            guests: guests.value
        });

        window.location.href =
            `/availability.html?${params.toString()}`;
    });
}

/* ============================================
   3. TAI PHONG NOI BAT
   ============================================ */

async function homeLoadFeaturedRooms() {
    const grid = document.querySelector(".room-grid");

    if (!grid) {
        return;
    }

    try {
        const response = await fetch("/api/room-catalog", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            return;
        }

        const result = await response.json();

        if (
            !result.success ||
            !Array.isArray(result.danhSach)
        ) {
            return;
        }

        const types = result.danhSach
            .filter(type =>
                Array.isArray(type.phong) &&
                type.phong.length > 0
            )
            .slice(0, 3);

        if (!types.length) {
            return;
        }

        grid.replaceChildren();

        types.forEach(type => {
            const room =
                type.phong.find(item => item.hinhAnh) ||
                type.phong[0];

            const card = homeCreateElement(
                "article",
                "room-card"
            );

            const image = homeCreateElement(
                "div",
                "room-image"
            );

            if (room.hinhAnh) {
                const imagePath = String(
                    room.hinhAnh
                ).replace(/["\\]/g, "");

                image.style.backgroundImage =
                    `url("${imagePath}")`;

                image.style.backgroundSize = "cover";
                image.style.backgroundPosition = "center";
            }

            const tag = homeCreateElement(
                "span",
                "room-tag",
                type.tenLoaiPhong
            );

            image.appendChild(tag);

            const info = homeCreateElement(
                "div",
                "room-info"
            );

            const category = homeCreateElement(
                "span",
                "room-category",
                `PHÒNG ${room.soPhong}`
            );

            const title = homeCreateElement(
                "h3",
                "",
                type.tenLoaiPhong
            );

            const description = homeCreateElement(
                "p",
                "",
                room.moTa ||
                type.moTa ||
                "Không gian nghỉ dưỡng tại KS Hotel."
            );

            const link = homeCreateElement(
                "a",
                "room-link",
                "Khám phá phòng ↗"
            );

            link.href =
                `/room-detail.html?id=${room.maPhong}`;

            info.append(
                category,
                title,
                description,
                link
            );

            card.append(image, info);

            grid.appendChild(card);
        });

    } catch (error) {
        console.error(
            "Không tải được phòng nổi bật:",
            error
        );
    }
}

/* ============================================
   4. HINH ANH LOAI PHONG CA NHAN HOA
   ============================================ */

const HOME_ROOM_IMAGES = [
    {
        keywords: [
            "tiêu chuẩn",
            "tieu chuan",
            "standard"
        ],
        image: "/images/home/standard.png"
    },
    {
        keywords: [
            "cao cấp",
            "cao cap",
            "deluxe"
        ],
        image: "/images/home/deluxe.png"
    },
    {
        keywords: [
            "gia đình",
            "gia dinh",
            "family"
        ],
        image: "/images/home/family.png"
    },
    {
        keywords: [
            "tổng thống",
            "tong thong",
            "president"
        ],
        image: "/images/home/president.png"
    },
    {
        keywords: [
            "suite"
        ],
        image: "/images/home/interior.png"
    }
];

function homeGetRoomImage(name) {
    const normalized = String(
        name || ""
    ).toLowerCase();

    const matched = HOME_ROOM_IMAGES.find(item =>
        item.keywords.some(keyword =>
            normalized.includes(keyword)
        )
    );

    return matched
        ? matched.image
        : "/images/service/room.png";
}

/* ============================================
   5. THONG BAO KHI CHUA CO GOI Y
   ============================================ */

function homeShowPersonalizedEmpty(
    title,
    description,
    buttonText = "Thiết lập gợi ý phòng →"
) {
    const grid = document.getElementById(
        "personalizedGrid"
    );

    const footer = document.getElementById(
        "personalizedFooter"
    );

    if (!grid) {
        return;
    }

    grid.replaceChildren();

    if (footer) {
        footer.hidden = true;
    }

    const box = homeCreateElement(
        "div",
        "personalized-empty"
    );

    const heading = homeCreateElement(
        "h3",
        "",
        title
    );

    const paragraph = homeCreateElement(
        "p",
        "",
        description
    );

    const link = homeCreateElement(
        "a",
        "home-btn home-btn-primary",
        buttonText
    );

    link.href = "/recommendations.html";

    box.append(
        heading,
        paragraph,
        link
    );

    grid.appendChild(box);
}

/* ============================================
   6. TAO THE PHONG GOI Y
   ============================================ */

function homeCreateRecommendationCard(room, index) {
    const card = homeCreateElement(
        "article",
        "personalized-card"
    );

    const image = homeCreateElement(
        "div",
        "personalized-image"
    );

    const imagePath = homeGetRoomImage(
        room.roomName
    );

    image.style.backgroundImage =
        `url("${imagePath}")`;

    const rank = homeCreateElement(
        "span",
        "personalized-rank",
        `GỢI Ý #${room.rank || index + 1}`
    );

    image.appendChild(rank);

    const body = homeCreateElement(
        "div",
        "personalized-card-body"
    );

    const title = homeCreateElement(
        "h3",
        "",
        room.roomName || "Phòng KS Hotel"
    );

    const scoreValue = Number(room.score);

    const score = homeCreateElement(
        "div",
        "personalized-score",
        Number.isFinite(scoreValue)
            ? `✦ Độ phù hợp: ${scoreValue.toFixed(2)}%`
            : "✦ Gợi ý dành cho bạn"
    );

    const price = homeCreateElement(
        "p",
        "personalized-price"
    );

    price.textContent = homeFormatMoney(
        room.pricePerNight
    );

    const priceUnit = homeCreateElement(
        "small",
        "",
        " / đêm"
    );

    price.appendChild(priceUnit);

    const details = [];

    const area = Number(room.area);

    if (Number.isFinite(area) && area > 0) {
        details.push(`${area} m²`);
    }

    if (room.adultsCapacity != null) {
        details.push(
            `Tối đa ${room.adultsCapacity} người lớn`
        );
    }

    if (room.availableRoomCount != null) {
        details.push(
            `${room.availableRoomCount} phòng còn trống`
        );
    }

    const meta = homeCreateElement(
        "p",
        "personalized-meta",
        details.join(" · ")
    );

    const reasons = homeCreateElement(
        "ul",
        "personalized-reasons"
    );

    if (Array.isArray(room.reasons)) {
        room.reasons
            .filter(reason =>
                typeof reason === "string" &&
                reason.trim().length > 0
            )
            .slice(0, 3)
            .forEach(reason => {
                const item = homeCreateElement(
                    "li",
                    "",
                    reason
                );

                reasons.appendChild(item);
            });
    }

    const link = homeCreateElement(
        "a",
        "personalized-card-link",
        "Xem gợi ý chi tiết ↗"
    );

    link.href = "/recommendations.html";

    body.append(
        title,
        score,
        price
    );

    if (details.length > 0) {
        body.appendChild(meta);
    }

    if (reasons.childElementCount > 0) {
        body.appendChild(reasons);
    }

    body.appendChild(link);

    card.append(
        image,
        body
    );

    return card;
}

/* ============================================
   7. KIEM TRA TAI KHOAN DANG NHAP
   ============================================ */

async function homeGetCustomerSession() {
    try {
        const response = await fetch(
            "/api/account/profile",
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            return null;
        }

        if (!response.ok) {
            return null;
        }

        const result = await response.json();

        if (result.isAuthenticated !== true) {
            return null;
        }

        if (
            String(result.role || "").toLowerCase() !==
            "customer"
        ) {
            return null;
        }

        return {
            username: result.username || "",
            role: result.role
        };

    } catch (error) {
        console.error(
            "Không kiểm tra được phiên đăng nhập:",
            error
        );

        return null;
    }
}

/* ============================================
   8. TAI GOI Y CA NHAN HOA TU SQL SERVER
   ============================================ */

async function homeLoadPersonalizedRooms() {
    const section = document.getElementById(
        "personalizedRooms"
    );

    const grid = document.getElementById(
        "personalizedGrid"
    );

    const status = document.getElementById(
        "personalizedStatus"
    );

    const dates = document.getElementById(
        "personalizedDates"
    );

    const footer = document.getElementById(
        "personalizedFooter"
    );

    if (!section || !grid) {
        return;
    }

    section.hidden = true;

    if (footer) {
        footer.hidden = true;
    }

    // Xac minh Customer bang Cookie Authentication.
    const customer = await homeGetCustomerSession();

    if (!customer) {
        return;
    }

    section.hidden = false;

    if (status) {
        status.textContent =
            "Đang tìm những phòng phù hợp với bạn...";
    }

    // Mac dinh lay goi y cho ngay mai, luu tru 1 dem.
    // Dong bo voi ngay mac dinh cua Controller.
    const checkIn = homeLocalDate(1);
    const checkOut = homeLocalDate(2);

    if (dates) {
        dates.textContent =
            "Phòng còn trống trong kỳ: " +
            `${homeFormatDate(checkIn)} – ` +
            `${homeFormatDate(checkOut)}`;
    }

    try {
        const params = new URLSearchParams({
            checkIn,
            checkOut,
            top: "5"
        });

        const response = await fetch(
            `/api/recommendations/mine?${params.toString()}`,
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `API gợi ý trả về HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (result.success !== true) {
            throw new Error(
                result.message ||
                "Không lấy được kết quả gợi ý."
            );
        }

        if (status) {
            status.textContent = "";
        }

        // Khach hang chua tao ho so so thich.
        if (result.hasPreferences !== true) {
            homeShowPersonalizedEmpty(
                "Khám phá phòng theo sở thích của bạn",
                "Hãy thiết lập ngân sách, loại phòng yêu thích, " +
                "số người và tiện nghi mong muốn để KS Hotel " +
                "cá nhân hóa những lựa chọn phù hợp."
            );

            return;
        }

        const recommendations = Array.isArray(
            result.recommendations
        )
            ? result.recommendations
            : [];

        // Chi hien thi loai phong co phong trong
        // va duoc Controller xep hang.
        const rooms = recommendations
            .filter(room =>
                room &&
                Number(room.availableRoomCount) > 0
            )
            .slice(0, 5);

        if (rooms.length === 0) {
            homeShowPersonalizedEmpty(
                "Chưa tìm thấy phòng phù hợp",
                "Không có phòng đáp ứng điều kiện trong " +
                "khoảng ngày đang xét. Bạn có thể thay đổi " +
                "ngày lưu trú hoặc điều chỉnh sở thích.",
                "Điều chỉnh gợi ý phòng →"
            );

            return;
        }

        grid.replaceChildren();

        rooms.forEach((room, index) => {
            const card = homeCreateRecommendationCard(
                room,
                index
            );

            grid.appendChild(card);
        });

        if (footer) {
            footer.hidden = false;
        }

    } catch (error) {
        console.error(
            "Lỗi cá nhân hóa trang chủ:",
            error
        );

        grid.replaceChildren();

        if (status) {
            status.textContent =
                "Chưa thể tải gợi ý phòng. " +
                "Vui lòng thử lại sau.";
        }

        if (footer) {
            footer.hidden = true;
        }
    }
}

/* ============================================
   9. KHOI TAO TRANG CHU
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
    homeInitializeSearch();

    homeLoadFeaturedRooms();

    homeLoadPersonalizedRooms();
});

/* ============================================
   KS HOTEL - PERSONALIZED CAROUSEL
   ============================================ */


/* ============================================
   KS HOTEL - AUTO PERSONALIZED CAROUSEL
   ============================================ */

function homeInitializePersonalizedCarousel() {
    const section = document.getElementById("personalizedRooms");
    const grid = document.getElementById("personalizedGrid");

    if (!section || !grid) return;

    if (section.querySelector(".personalized-controls")) {
        return;
    }

    const controls = document.createElement("div");
    controls.className = "personalized-controls";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "personalized-arrow";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", "Phòng trước");

    const next = document.createElement("button");
    next.type = "button";
    next.className = "personalized-arrow";
    next.textContent = "›";
    next.setAttribute("aria-label", "Phòng tiếp theo");

    controls.append(previous, next);

    grid.parentNode.insertBefore(controls, grid);

    let autoTimer = null;
    let isHovered = false;
    let isFocused = false;
    let isInteracting = false;

    const AUTO_DELAY = 3000;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function getStep() {
        const card = grid.querySelector(".personalized-card");

        if (!card) return grid.clientWidth;

        const styles = getComputedStyle(grid);
        const gap = parseFloat(styles.columnGap) || 0;

        return card.getBoundingClientRect().width + gap;
    }

    function getMaxScroll() {
        return Math.max(
            0,
            grid.scrollWidth - grid.clientWidth
        );
    }

    function hasCards() {
        return grid.querySelectorAll(
            ".personalized-card"
        ).length > 0;
    }

    function updateButtons() {
        const maxScroll = getMaxScroll();
        const canScroll = hasCards() && maxScroll > 2;

        controls.hidden = !canScroll;

        previous.disabled =
            !canScroll || grid.scrollLeft <= 2;

        next.disabled =
            !canScroll ||
            grid.scrollLeft >= maxScroll - 2;

        if (!canScroll) {
            stopAuto();
        } else {
            startAuto();
        }
    }

    function moveNext() {
        const maxScroll = getMaxScroll();

        if (maxScroll <= 2) return;

        if (grid.scrollLeft >= maxScroll - 3) {
            grid.scrollTo({
                left: 0,
                behavior: "smooth"
            });
        } else {
            grid.scrollBy({
                left: getStep(),
                behavior: "smooth"
            });
        }
    }

    function movePrevious() {
        if (grid.scrollLeft <= 3) {
            grid.scrollTo({
                left: getMaxScroll(),
                behavior: "smooth"
            });
        } else {
            grid.scrollBy({
                left: -getStep(),
                behavior: "smooth"
            });
        }
    }

    function stopAuto() {
        if (autoTimer !== null) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
    }

    function shouldPause() {
        return (
            isHovered ||
            isFocused ||
            isInteracting ||
            document.hidden ||
            section.hidden ||
            reduceMotion.matches ||
            !hasCards() ||
            getMaxScroll() <= 2
        );
    }

    function startAuto() {
        stopAuto();

        if (shouldPause()) return;

        autoTimer = setInterval(() => {
            if (shouldPause()) {
                stopAuto();
                return;
            }

            moveNext();
        }, AUTO_DELAY);
    }

    previous.addEventListener("click", () => {
        movePrevious();
        startAuto();
    });

    next.addEventListener("click", () => {
        moveNext();
        startAuto();
    });

    section.addEventListener("mouseenter", () => {
        isHovered = true;
        stopAuto();
    });

    section.addEventListener("mouseleave", () => {
        isHovered = false;
        startAuto();
    });

    section.addEventListener("focusin", () => {
        isFocused = true;
        stopAuto();
    });

    section.addEventListener("focusout", event => {
        if (!section.contains(event.relatedTarget)) {
            isFocused = false;
            startAuto();
        }
    });

    grid.addEventListener("pointerdown", () => {
        isInteracting = true;
        stopAuto();
    });

    window.addEventListener("pointerup", () => {
        if (isInteracting) {
            isInteracting = false;
            startAuto();
        }
    });

    window.addEventListener("pointercancel", () => {
        isInteracting = false;
        startAuto();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopAuto();
        } else {
            startAuto();
        }
    });

    reduceMotion.addEventListener("change", () => {
        startAuto();
    });

    grid.addEventListener("scroll", () => {
        updateButtons();
    }, {
        passive: true
    });

    window.addEventListener("resize", () => {
        updateButtons();
        startAuto();
    });

    const observer = new MutationObserver(() => {
        updateButtons();
        startAuto();
    });

    observer.observe(grid, {
        childList: true
    });

    updateButtons();
    startAuto();
}

document.addEventListener("DOMContentLoaded", () => {
    homeInitializePersonalizedCarousel();
});
