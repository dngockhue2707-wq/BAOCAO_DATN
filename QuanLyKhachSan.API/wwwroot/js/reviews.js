
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("reviewsList");
    const message = document.getElementById("reviewsMessage");

    const modal = document.getElementById("reviewModal");
    const closeButton = document.getElementById("closeReviewModal");
    const overlay = document.querySelector(".review-modal-overlay");

    const form = document.getElementById("reviewForm");
    const roomName = document.getElementById("reviewRoomName");
    const modalTitle = document.getElementById("reviewModalTitle");
    const content = document.getElementById("reviewContent");
    const length = document.getElementById("reviewLength");
    const ratingText = document.getElementById("reviewRatingText");
    const formMessage = document.getElementById("reviewFormMessage");
    const submitButton = document.getElementById("submitReview");
    const stars = [...document.querySelectorAll(
        "#reviewStars button"
    )];

    if (!list || !form) return;

    let selectedRating = 0;
    let selectedRoom = null;
    let saving = false;

    const ratingLabels = [
        "",
        "Rất không hài lòng",
        "Không hài lòng",
        "Bình thường",
        "Hài lòng",
        "Rất hài lòng"
    ];

    function create(tag, text = "", className = "") {
        const element = document.createElement(tag);
        element.textContent = String(text ?? "");
        if (className) element.className = className;
        return element;
    }

    function formatDate(value) {
        if (!value) return "";

        const date = String(value).slice(0, 10).split("-");

        if (date.length !== 3) return String(value);

        return `${date[2]}/${date[1]}/${date[0]}`;
    }

    function setMessage(text, error = false) {
        message.textContent = text;
        message.classList.toggle("error", error);
    }

    function setFormMessage(text, error = false) {
        formMessage.textContent = text;
        formMessage.classList.toggle("error", error);
    }

    function setRating(value) {
        selectedRating = Number(value);

        stars.forEach(button => {
            const current = Number(button.dataset.rating);

            button.classList.toggle(
                "active",
                current <= selectedRating
            );

            button.setAttribute(
                "aria-pressed",
                String(current === selectedRating)
            );
        });

        ratingText.textContent =
            ratingLabels[selectedRating] ||
            "Vui lòng chọn số sao";
    }

    function closeModal() {
        if (saving) return;

        modal.hidden = true;
        document.body.classList.remove("review-modal-open");

        selectedRoom = null;
        selectedRating = 0;

        form.reset();
        setRating(0);
        setFormMessage("");
    }

    function openModal(room) {
        selectedRoom = room;
        saving = false;

        form.reset();
        setFormMessage("");

        modalTitle.textContent = room.daDanhGia
            ? "Chỉnh sửa đánh giá"
            : "Đánh giá trải nghiệm lưu trú";

        roomName.textContent =
            `${room.tenLoaiPhong} · Phòng ${room.soPhong}`;

        content.value = room.noiDung || "";
        length.textContent = content.value.length;

        setRating(room.soSao || 0);

        submitButton.textContent = room.daDanhGia
            ? "Lưu đánh giá"
            : "Gửi đánh giá";

        modal.hidden = false;
        document.body.classList.add("review-modal-open");
    }

    function render(rooms) {
        list.replaceChildren();

        if (!rooms.length) {
            const empty = create(
                "div",
                "",
                "reviews-empty"
            );

            empty.appendChild(create(
                "h3",
                "Chưa có phòng đủ điều kiện đánh giá"
            ));

            empty.appendChild(create(
                "p",
                "Sau khi hoàn tất lưu trú và trả phòng, bạn có thể chia sẻ đánh giá tại đây."
            ));

            list.appendChild(empty);
            return;
        }

        rooms.forEach(room => {
            const card = create(
                "article",
                "",
                "review-card"
            );

            const header = create(
                "div",
                "",
                "review-card-header"
            );

            const heading = create("div");

            heading.appendChild(create(
                "span",
                `Đơn #${room.maDatPhong}`,
                "review-booking-code"
            ));

            heading.appendChild(create(
                "h3",
                room.tenLoaiPhong
            ));

            heading.appendChild(create(
                "p",
                `Phòng ${room.soPhong}`,
                "review-room-number"
            ));

            header.appendChild(heading);

            const badge = create(
                "span",
                room.daDanhGia
                    ? room.trangThai
                        ? "Đã đánh giá"
                        : "Đánh giá đang ẩn"
                    : "Chưa đánh giá",
                room.daDanhGia
                    ? "review-badge completed"
                    : "review-badge pending"
            );

            header.appendChild(badge);
            card.appendChild(header);

            card.appendChild(create(
                "p",
                `Nhận phòng: ${formatDate(room.ngayNhanPhong)}`,
                "review-date"
            ));

            card.appendChild(create(
                "p",
                `Trả phòng: ${formatDate(room.ngayTraPhong)}`,
                "review-date"
            ));

            if (room.daDanhGia) {
                card.appendChild(create(
                    "div",
                    "★".repeat(room.soSao || 0) +
                    "☆".repeat(5 - (room.soSao || 0)),
                    "review-existing-stars"
                ));

                if (room.noiDung) {
                    card.appendChild(create(
                        "p",
                        room.noiDung,
                        "review-existing-content"
                    ));
                }
            }

            const button = create(
                "button",
                room.daDanhGia
                    ? "Chỉnh sửa đánh giá"
                    : "Viết đánh giá",
                "review-action"
            );

            button.type = "button";

            button.addEventListener("click", () => {
                openModal(room);
            });

            card.appendChild(button);
            list.appendChild(card);
        });
    }

    async function readResponse(response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Yêu cầu thất bại (HTTP ${response.status}).`
            );
        }

        return data;
    }

    async function loadReviews() {
        setMessage("Đang tải danh sách phòng...");
        list.replaceChildren();

        try {
            const response = await fetch(
                "/api/reviews/eligible",
                {
                    credentials: "same-origin"
                }
            );

            if (response.status === 401) {
                setMessage(
                    "Vui lòng đăng nhập tài khoản khách hàng để đánh giá phòng.",
                    true
                );
                return;
            }

            if (response.status === 403) {
                setMessage(
                    "Chức năng này chỉ dành cho khách hàng.",
                    true
                );
                return;
            }

            const data = await readResponse(response);
            const rooms = data.danhSach || [];

            setMessage("");
            render(rooms);

        } catch (error) {
            setMessage(error.message, true);
        }
    }

    async function getCsrfToken() {
        const response = await fetch(
            "/api/account/csrf-token",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const data = await readResponse(response);

        if (!data.csrfToken) {
            throw new Error(
                "Không lấy được mã xác thực bảo mật."
            );
        }

        return data.csrfToken;
    }

    stars.forEach(button => {
        button.addEventListener("click", () => {
            setRating(button.dataset.rating);
        });
    });

    content.addEventListener("input", () => {
        length.textContent = content.value.length;
    });

    closeButton.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (saving || !selectedRoom) return;

        if (selectedRating < 1 || selectedRating > 5) {
            setFormMessage(
                "Vui lòng chọn từ 1 đến 5 sao.",
                true
            );
            return;
        }

        const text = content.value.trim();

        if (text.length > 1000) {
            setFormMessage(
                "Nội dung tối đa 1000 ký tự.",
                true
            );
            return;
        }

        saving = true;
        submitButton.disabled = true;
        submitButton.textContent = "Đang lưu...";
        setFormMessage("");

        try {
            const csrfToken = await getCsrfToken();

            const isUpdate = Boolean(
                selectedRoom.daDanhGia
            );

            const url = isUpdate
                ? `/api/reviews/${selectedRoom.maDanhGia}`
                : "/api/reviews";

            const payload = isUpdate
                ? {
                    soSao: selectedRating,
                    noiDung: text
                }
                : {
                    maDatPhong: selectedRoom.maDatPhong,
                    maLoaiPhong: selectedRoom.maLoaiPhong,
                    soSao: selectedRating,
                    noiDung: text
                };

            const response = await fetch(url, {
                method: isUpdate ? "PUT" : "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken
                },
                body: JSON.stringify(payload)
            });

            const data = await readResponse(response);

            saving = false;
            closeModal();

            await loadReviews();
            setMessage(data.message || "Đã lưu đánh giá.");

        } catch (error) {
            setFormMessage(error.message, true);
        } finally {
            saving = false;
            submitButton.disabled = false;

            if (selectedRoom) {
                submitButton.textContent =
                    selectedRoom.daDanhGia
                        ? "Lưu đánh giá"
                        : "Gửi đánh giá";
            }
        }
    });

    loadReviews();
});
