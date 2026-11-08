
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("myBookingsList");
    const filter = document.getElementById("statusFilter");
    const message = document.getElementById("bookingsMessage");
    const refresh = document.getElementById("refreshBookings");

    if (!list || !filter || !message) return;

    let bookings = [];
    let deposits = new Map();
    let paymentDataAvailable = false;
    let busy = false;
    let loading = false;

    // Lưu đường dẫn VNPay để khách quay lại thanh toán.
    // VNPay đang cấu hình thời hạn 15 phút.
    // Dùng 14 phút để tránh mở đường dẫn sát lúc hết hạn.
    const PAYMENT_LINK_LIFETIME = 14 * 60 * 1000;
    const PAYMENT_PREFIX = "dnk-payment-";

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    function dateOnly(value) {
        return String(value || "").slice(0, 10);
    }

    function formatDate(value) {
        const date = dateOnly(value);

        if (!date) return "Chưa cập nhật";

        const parts = date.split("-");

        return parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : date;
    }

    function today() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function element(tag, className = "", text) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = String(text);
        }

        return node;
    }

    function show(text, error = false) {
        message.textContent = text;
        message.classList.toggle("error", error);
    }

    function valueOrDash(value) {
        return value === undefined ||
               value === null ||
               value === ""
            ? "Chưa cập nhật"
            : String(value);
    }

    // ==========================================
    // LƯU ĐƯỜNG DẪN GIAO DỊCH VNPAY
    // ==========================================

    function paymentStorageKey(bookingId) {
        return PAYMENT_PREFIX + bookingId;
    }

    function validVnPayUrl(value) {
        try {
            const url = new URL(value);

            return (
                url.protocol === "https:" &&
                (
                    url.hostname === "vnpayment.vn" ||
                    url.hostname.endsWith(".vnpayment.vn")
                )
            );
        } catch {
            return false;
        }
    }

    function savePaymentLink(bookingId, url) {
        if (!validVnPayUrl(url)) {
            throw new Error(
                "Đường dẫn thanh toán VNPay không hợp lệ."
            );
        }

        try {
            sessionStorage.setItem(
                paymentStorageKey(bookingId),
                JSON.stringify({
                    url,
                    savedAt: Date.now()
                })
            );
        } catch (error) {
            console.warn(
                "Không lưu được đường dẫn VNPay:",
                error
            );
        }
    }

    function clearPaymentLink(bookingId) {
        try {
            sessionStorage.removeItem(
                paymentStorageKey(bookingId)
            );
        } catch {
            // Trình duyệt có thể chặn sessionStorage.
        }
    }

    function getPaymentLink(bookingId) {
        let raw;

        try {
            raw = sessionStorage.getItem(
                paymentStorageKey(bookingId)
            );
        } catch {
            return null;
        }

        if (!raw) return null;

        try {
            const data = JSON.parse(raw);

            if (
                typeof data.url !== "string" ||
                typeof data.savedAt !== "number" ||
                Date.now() < data.savedAt ||
                Date.now() - data.savedAt >
                    PAYMENT_LINK_LIFETIME ||
                !validVnPayUrl(data.url)
            ) {
                clearPaymentLink(bookingId);
                return null;
            }

            return data.url;

        } catch {
            clearPaymentLink(bookingId);
            return null;
        }
    }

    // ==========================================
    // GỌI API
    // ==========================================

    async function jsonRequest(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        const data = await response
            .json()
            .catch(() => ({}));

        if (response.status === 401) {
            window.location.replace("/login.html");

            throw new Error(
                "Phiên đăng nhập đã hết hạn."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "Tài khoản không có quyền thực hiện thao tác."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.title ||
                `Yêu cầu không thành công (HTTP ${response.status}).`
            );
        }

        return data;
    }

    async function csrfToken() {
        const data = await jsonRequest(
            "/api/account/csrf-token"
        );

        if (!data.csrfToken) {
            throw new Error(
                "Không thể lấy mã bảo vệ yêu cầu."
            );
        }

        return data.csrfToken;
    }

    async function runAction(action) {
        if (busy || loading) return;

        busy = true;

        try {
            await action();
        } catch (error) {
            show(
                error.message ||
                "Không thể xử lý yêu cầu.",
                true
            );
        } finally {
            busy = false;
        }
    }

    // ==========================================
    // CỬA SỔ XEM CHI TIẾT
    // ==========================================

    const modal = element(
        "div",
        "booking-detail-modal"
    );

    modal.id = "bookingDetailModal";
    modal.hidden = true;

    const modalBackdrop = element(
        "div",
        "booking-detail-backdrop"
    );

    const modalPanel = element(
        "section",
        "booking-detail-panel"
    );

    modalPanel.setAttribute("role", "dialog");
    modalPanel.setAttribute("aria-modal", "true");
    modalPanel.setAttribute(
        "aria-labelledby",
        "bookingDetailTitle"
    );

    modalPanel.tabIndex = -1;

    const modalHeader = element(
        "div",
        "booking-detail-header"
    );

    const modalHeading = element("div");

    const modalEyebrow = element(
        "span",
        "booking-detail-eyebrow",
        "DNK HOTEL · CHI TIẾT ĐẶT PHÒNG"
    );

    const modalTitle = element(
        "h2",
        "",
        "Chi tiết đơn đặt phòng"
    );

    modalTitle.id = "bookingDetailTitle";

    modalHeading.append(
        modalEyebrow,
        modalTitle
    );

    const modalClose = element(
        "button",
        "booking-detail-close",
        "×"
    );

    modalClose.type = "button";
    modalClose.setAttribute(
        "aria-label",
        "Đóng chi tiết đơn"
    );

    modalHeader.append(
        modalHeading,
        modalClose
    );

    const modalBody = element(
        "div",
        "booking-detail-body"
    );

    modalPanel.append(
        modalHeader,
        modalBody
    );

    modal.append(
        modalBackdrop,
        modalPanel
    );

    document.body.appendChild(modal);

    let previousFocus = null;

    function closeModal() {
        modal.hidden = true;

        document.body.classList.remove(
            "booking-modal-open"
        );

        if (
            previousFocus &&
            previousFocus.isConnected
        ) {
            previousFocus.focus();
        }
    }

    modalClose.addEventListener(
        "click",
        closeModal
    );

    modalBackdrop.addEventListener(
        "click",
        closeModal
    );

    document.addEventListener("keydown", event => {
        if (modal.hidden) return;

        if (event.key === "Escape") {
            closeModal();
            return;
        }

        if (event.key !== "Tab") return;

        const focusable = Array.from(
            modalPanel.querySelectorAll(
                "button:not([disabled]), " +
                "a[href], " +
                "input:not([disabled]), " +
                "select:not([disabled])"
            )
        );

        if (!focusable.length) {
            event.preventDefault();
            modalPanel.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[
            focusable.length - 1
        ];

        if (
            event.shiftKey &&
            document.activeElement === first
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            document.activeElement === last
        ) {
            event.preventDefault();
            first.focus();
        }
    });

    function detailField(label, value) {
        const field = element(
            "div",
            "booking-detail-field"
        );

        field.append(
            element(
                "span",
                "booking-detail-label",
                label
            ),
            element(
                "strong",
                "",
                valueOrDash(value)
            )
        );

        return field;
    }

    function detailSection(title, fields) {
        const section = element(
            "section",
            "booking-detail-section"
        );

        section.appendChild(
            element("h3", "", title)
        );

        const grid = element(
            "div",
            "booking-detail-grid"
        );

        fields.forEach(([label, value]) => {
            grid.appendChild(
                detailField(label, value)
            );
        });

        section.appendChild(grid);

        return section;
    }

    // ==========================================
    // TRẠNG THÁI THANH TOÁN
    // ==========================================

    function depositStatus(payment) {
        if (!paymentDataAvailable) {
            return "Chưa tải được thông tin thanh toán";
        }

        if (!payment) {
            return "Chưa có giao dịch đặt cọc";
        }

        if (payment.hasPaid === true) {
            return "Đã thanh toán tiền cọc";
        }

        if (payment.pending === true) {
            if (payment.lastStatus === "Hết hạn") {
                return "Giao dịch hết hạn, cần đối soát";
            }

            return "Đang chờ thanh toán hoặc đối soát";
        }

        return payment.lastStatus ||
               "Chưa đặt cọc";
    }

    function showBookingDetails(booking) {
        const payment = deposits.get(
            Number(booking.bookingId)
        );

        previousFocus = document.activeElement;

        modalTitle.textContent =
            `Đơn đặt phòng #${booking.bookingId}`;

        modalBody.replaceChildren();

        modalBody.appendChild(
            detailSection(
                "Thông tin đặt phòng",
                [
                    [
                        "Mã đặt phòng",
                        `#${booking.bookingId}`
                    ],
                    [
                        "Loại phòng",
                        booking.roomName
                    ],
                    [
                        "Số phòng",
                        booking.roomNumber
                    ],
                    [
                        "Trạng thái",
                        booking.status
                    ],
                    [
                        "Ngày đặt",
                        formatDate(booking.bookedAt)
                    ],
                    [
                        "Ngày nhận phòng",
                        formatDate(booking.checkIn)
                    ],
                    [
                        "Ngày trả phòng",
                        formatDate(booking.checkOut)
                    ],
                    [
                        "Số người lớn",
                        booking.adults
                    ],
                    [
                        "Số trẻ em",
                        booking.children
                    ]
                ]
            )
        );

        const paymentFields = [
            [
                "Tổng tiền phòng",
                money(booking.total)
            ],
            [
                "Trạng thái tiền cọc",
                depositStatus(payment)
            ]
        ];

        if (
            paymentDataAvailable &&
            payment?.depositAmount != null
        ) {
            paymentFields.push([
                "Số tiền đặt cọc",
                money(payment.depositAmount)
            ]);
        }

        if (
            paymentDataAvailable &&
            payment?.lastStatus
        ) {
            paymentFields.push([
                "Trạng thái giao dịch gần nhất",
                payment.lastStatus
            ]);
        }

        modalBody.appendChild(
            detailSection(
                "Thông tin thanh toán",
                paymentFields
            )
        );

        const footer = element(
            "div",
            "booking-detail-footer"
        );

        const close = element(
            "button",
            "booking-detail-done",
            "Đóng chi tiết"
        );

        close.type = "button";
        close.addEventListener(
            "click",
            closeModal
        );

        footer.appendChild(close);
        modalBody.appendChild(footer);

        modal.hidden = false;

        document.body.classList.add(
            "booking-modal-open"
        );

        modalClose.focus();
    }

    async function resumePayment(bookingId) {
        if (!window.confirm(
            "Tiếp tục giao dịch VNPay trước đó?"
        )) {
            return;
        }

        await runAction(async () => {
            show("Đang kiểm tra giao dịch VNPay...");

            const token = await csrfToken();

            const result = await jsonRequest(
                "/api/vnpay/resume",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token
                    },
                    body: JSON.stringify({
                        bookingId: bookingId
                    })
                }
            );

            if (!result.paymentUrl) {
                throw new Error(
                    "Không tìm thấy đường dẫn thanh toán cũ."
                );
            }

            if (!validVnPayUrl(result.paymentUrl)) {
                throw new Error(
                    "Đường dẫn VNPay không hợp lệ."
                );
            }

            savePaymentLink(
                bookingId,
                result.paymentUrl
            );

            window.location.assign(
                result.paymentUrl
            );
        });
    }

    async function payDeposit(id) {
        const booking = bookings.find(
            item =>
                Number(item.bookingId) ===
                Number(id)
        );

        if (!booking) return;

        const payment = deposits.get(
            Number(id)
        );

        if (
            !paymentDataAvailable ||
            ![
                "Chờ xác nhận",
                "Đã xác nhận"
            ].includes(booking.status) ||
            dateOnly(booking.checkIn) < today() ||
            payment?.hasPaid === true ||
            payment?.pending === true
        ) {
            show(
                "Chưa thể tạo giao dịch đặt cọc mới. " +
                "Vui lòng kiểm tra trạng thái tiền cọc.",
                true
            );
            return;
        }

        if (!window.confirm(
            "Chuyển đến VNPay để thanh toán tiền cọc?"
        )) {
            return;
        }

        await runAction(async () => {
            show(
                "Đang tạo yêu cầu thanh toán VNPay..."
            );

            const token = await csrfToken();

            const result = await jsonRequest(
                "/api/vnpay/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token
                    },
                    body: JSON.stringify({
                        bookingId: id
                    })
                }
            );

            if (!result.paymentUrl) {
                throw new Error(
                    "VNPay chưa trả về đường dẫn thanh toán."
                );
            }

            if (!validVnPayUrl(result.paymentUrl)) {
                throw new Error(
                    "Đường dẫn VNPay không hợp lệ."
                );
            }

            // Lưu lại chính URL của giao dịch đã tạo.
            // Quay lại sẽ dùng lại URL này,
            // không tạo một DatCoc mới.
            savePaymentLink(
                id,
                result.paymentUrl
            );

            window.location.assign(
                result.paymentUrl
            );
        });
    }

    // ==========================================
    // HỦY ĐẶT PHÒNG
    // ==========================================

    async function cancelBooking(id) {
        const booking = bookings.find(
            item =>
                Number(item.bookingId) ===
                Number(id)
        );

        if (!booking) return;

        const payment = deposits.get(
            Number(id)
        );

        if (
            ![
                "Chờ xác nhận",
                "Đã xác nhận"
            ].includes(booking.status) ||
            dateOnly(booking.checkIn) <= today()
        ) {
            show(
                "Đơn này không đủ điều kiện hủy trực tuyến.",
                true
            );
            return;
        }

        if (!paymentDataAvailable) {
            show(
                "Chưa xác minh được trạng thái tiền cọc. " +
                "Vui lòng cập nhật lại trước khi hủy.",
                true
            );
            return;
        }

        if (
            payment?.hasPaid === true ||
            payment?.pending === true
        ) {
            show(
                "Đơn có giao dịch cọc cần xử lý. " +
                "Vui lòng liên hệ DNK Hotel để được hỗ trợ hủy.",
                true
            );
            return;
        }

        if (!window.confirm(
            "Bạn chắc chắn muốn hủy đơn đặt phòng này?"
        )) {
            return;
        }

        await runAction(async () => {
            show("Đang xử lý hủy đặt phòng...");

            const token = await csrfToken();

            const result = await jsonRequest(
                `/api/bookings/${id}/cancel`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRF-TOKEN": token
                    }
                }
            );

            clearPaymentLink(id);

            await loadBookings();

            show(
                result.message ||
                "Đã gửi yêu cầu hủy đặt phòng."
            );
        });
    }

    // ==========================================
    // TẠO BUTTON
    // ==========================================

    function makeButton(
        text,
        className,
        action
    ) {
        const button = element(
            "button",
            className,
            text
        );

        button.type = "button";

        button.addEventListener(
            "click",
            action
        );

        return button;
    }

    // ==========================================
    // HIỂN THỊ DANH SÁCH ĐƠN
    // ==========================================

    function render() {
        list.replaceChildren();

        const filtered = bookings.filter(
            booking =>
                filter.value === "all" ||
                filter.value === booking.status
        );

        if (!filtered.length) {
            const empty = element(
                "div",
                "booking-empty"
            );

            empty.append(
                element(
                    "h2",
                    "",
                    "Chưa có đơn đặt phòng phù hợp"
                ),
                element(
                    "p",
                    "",
                    "Bạn có thể thay đổi bộ lọc " +
                    "hoặc tìm phòng nghỉ mới."
                )
            );

            list.appendChild(empty);
            return;
        }

        filtered.forEach(booking => {
            const bookingId = Number(
                booking.bookingId
            );

            const payment = deposits.get(
                bookingId
            );

            // Không giữ URL khi giao dịch đã hoàn tất.
            if (
                payment?.hasPaid === true ||
                booking.status === "Đã đặt cọc" ||
                booking.status === "Đã nhận phòng" ||
                booking.status === "Đã trả phòng" ||
                booking.status === "Đã hủy"
            ) {
                clearPaymentLink(bookingId);
            }

            const card = element(
                "article",
                "my-booking-card"
            );

            const top = element(
                "div",
                "my-booking-top"
            );

            const heading = element(
                "div",
                "booking-card-heading"
            );

            heading.append(
                element(
                    "span",
                    "booking-card-code",
                    `MÃ ĐẶT PHÒNG #${bookingId}`
                ),
                element(
                    "h2",
                    "",
                    booking.roomName ||
                    "Phòng DNK Hotel"
                )
            );

            top.append(
                heading,
                element(
                    "span",
                    "my-booking-status",
                    booking.status ||
                    "Chưa cập nhật"
                )
            );

            const info = element(
                "div",
                "my-booking-info"
            );

            const fields = [
                [
                    "Số phòng",
                    booking.roomNumber
                ],
                [
                    "Ngày nhận",
                    formatDate(booking.checkIn)
                ],
                [
                    "Ngày trả",
                    formatDate(booking.checkOut)
                ],
                [
                    "Người lớn",
                    booking.adults
                ],
                [
                    "Trẻ em",
                    booking.children
                ],
                [
                    "Ngày đặt",
                    formatDate(booking.bookedAt)
                ]
            ];

            fields.forEach(([label, value]) => {
                const field = element("div");

                field.append(
                    element(
                        "span",
                        "",
                        label
                    ),
                    element(
                        "strong",
                        "",
                        valueOrDash(value)
                    )
                );

                info.appendChild(field);
            });

            const bottom = element(
                "div",
                "my-booking-bottom"
            );

            const totalBox = element(
                "div",
                "booking-total-box"
            );

            totalBox.append(
                element(
                    "span",
                    "booking-total-label",
                    "TỔNG TIỀN PHÒNG"
                ),
                element(
                    "strong",
                    "booking-total-value",
                    money(booking.total)
                ),
                element(
                    "p",
                    "booking-deposit-status",
                    `Tiền cọc: ${depositStatus(payment)}`
                )
            );

            if (
                paymentDataAvailable &&
                payment?.depositAmount != null
            ) {
                totalBox.appendChild(
                    element(
                        "p",
                        "booking-deposit-amount",
                        "Số tiền cọc: " +
                        money(payment.depositAmount)
                    )
                );
            }

            const actions = element(
                "div",
                "booking-card-actions"
            );

            // Nút xem chi tiết luôn có
            actions.appendChild(
                makeButton(
                    "Xem chi tiết",
                    "booking-detail-button",
                    () => showBookingDetails(booking)
                )
            );

            const active = [
                "Chờ xác nhận",
                "Đã xác nhận"
            ].includes(booking.status);

            const unpaid =
                payment?.hasPaid !== true &&
                payment?.pending !== true;

            const validDate =
                dateOnly(booking.checkIn) >= today();

            // NÚT THANH TOÁN CỌC MỚI
            if (
                paymentDataAvailable &&
                active &&
                unpaid &&
                validDate
            ) {
                actions.appendChild(
                    makeButton(
                        "Thanh toán cọc",
                        "booking-pay-button",
                        () => payDeposit(bookingId)
                    )
                );
            }

            // NÚT TIẾP TỤC THANH TOÁN
            // Chỉ xuất hiện khi còn giao dịch chờ,
            // URL đã lưu và chưa hết hạn.
            if (
                paymentDataAvailable &&
                active &&
                validDate &&
                payment?.pending === true &&
                payment?.lastStatus ===
                    "Chờ thanh toán" &&
                payment?.hasPaid !== true &&
                payment?.canResume === true
            ) {
                actions.appendChild(
                    makeButton(
                        "Tiếp tục thanh toán",
                        "booking-pay-button",
                        () => resumePayment(bookingId)
                    )
                );
            }

            // NÚT HỦY ĐẶT PHÒNG
            // Chỉ khi chưa có giao dịch cần đối soát.
            if (
                paymentDataAvailable &&
                active &&
                unpaid &&
                dateOnly(booking.checkIn) > today()
            ) {
                actions.appendChild(
                    makeButton(
                        "Hủy đặt phòng",
                        "cancel-booking",
                        () => cancelBooking(bookingId)
                    )
                );
            }

            bottom.append(
                totalBox,
                actions
            );

            card.append(
                top,
                info,
                bottom
            );

            list.appendChild(card);
        });
    }

    // ==========================================
    // TẢI ĐƠN VÀ DỮ LIỆU ĐẶT CỌC
    // ==========================================

    async function loadBookings() {
        if (loading) return;

        loading = true;

        show("Đang tải đơn đặt phòng...");

        if (refresh) {
            refresh.disabled = true;
        }

        try {
            const bookingData = await jsonRequest(
                "/api/bookings/mine"
            );

            if (
                !Array.isArray(
                    bookingData.bookings
                )
            ) {
                throw new Error(
                    "Dữ liệu danh sách đặt phòng không hợp lệ."
                );
            }

            bookings = bookingData.bookings;

            try {
                const paymentData =
                    await jsonRequest(
                        "/api/vnpay/bookings"
                    );

                if (
                    !Array.isArray(
                        paymentData.bookings
                    )
                ) {
                    throw new Error(
                        "Dữ liệu tiền cọc không hợp lệ."
                    );
                }

                deposits = new Map(
                    paymentData.bookings.map(
                        item => [
                            Number(item.bookingId),
                            item
                        ]
                    )
                );

                paymentDataAvailable = true;

                show("");

            } catch (error) {
                deposits = new Map();
                paymentDataAvailable = false;

                show(
                    "Đã tải đơn đặt phòng nhưng " +
                    "chưa tải được thông tin tiền cọc. " +
                    "Các thao tác thanh toán và hủy " +
                    "tạm thời bị ẩn. " +
                    "Vui lòng cập nhật lại.",
                    true
                );
            }

            render();

        } catch (error) {
            bookings = [];
            deposits = new Map();
            paymentDataAvailable = false;

            list.replaceChildren();

            show(
                error.message ||
                "Không tải được đơn đặt phòng.",
                true
            );

        } finally {
            loading = false;

            if (refresh) {
                refresh.disabled = false;
            }
        }
    }

    // ==========================================
    // SỰ KIỆN TRANG
    // ==========================================

    filter.addEventListener(
        "change",
        render
    );

    if (refresh) {
        refresh.addEventListener(
            "click",
            loadBookings
        );
    }

    loadBookings();
});
