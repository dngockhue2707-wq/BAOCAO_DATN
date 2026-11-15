
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("myBookingsList");
    const requestsBox = document.getElementById(
        "cancellationRequests"
    );
    const message = document.getElementById(
        "cancellationMessage"
    );
    const refresh = document.getElementById(
        "refreshBookings"
    );

    const dialog = document.getElementById(
        "cancelRequestDialog"
    );
    const form = document.getElementById(
        "cancelRequestForm"
    );
    const reasonInput = document.getElementById(
        "cancelRequestReason"
    );
    const bookingLabel = document.getElementById(
        "cancelRequestBooking"
    );
    const feedback = document.getElementById(
        "cancelRequestFeedback"
    );
    const closeButton = document.getElementById(
        "cancelRequestClose"
    );
    const submitButton = document.getElementById(
        "cancelRequestSubmit"
    );

    if (
        !list ||
        !requestsBox ||
        !message ||
        !dialog ||
        !form ||
        !reasonInput ||
        !bookingLabel ||
        !feedback ||
        !closeButton ||
        !submitButton
    ) {
        return;
    }

    let bookings = new Map();
    let payments = new Map();
    let requests = new Map();

    let selectedBookingId = null;
    let submitting = false;
    let loaded = false;
    let loadingPromise = null;
    let syncScheduled = false;

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);

    function formatDate(value) {
        if (!value) return "Chưa cập nhật";

        const date = String(value).slice(0, 10);
        const parts = date.split("-");

        if (parts.length !== 3) {
            return date;
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatDateTime(value) {
        if (!value) return "Chưa cập nhật";

        const raw = String(value);
        const date = formatDate(raw);
        const time = raw.match(/T(\d{2}:\d{2})/);

        return time
            ? `${date} · ${time[1]}`
            : date;
    }

    function createElement(tag, className = "", text) {
        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = String(text);
        }

        return node;
    }

    function appendText(parent, tag, text, className = "") {
        const node = createElement(
            tag,
            className,
            text
        );

        parent.appendChild(node);

        return node;
    }

    function show(text, isError = false) {
        message.textContent = text;
        message.classList.toggle("error", isError);
    }

    function showFeedback(text, isError = false) {
        feedback.textContent = text;
        feedback.classList.toggle("error", isError);
    }

    async function requestJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        const data = await response.json()
            .catch(() => ({}));

        if (response.status === 401) {
            window.location.assign("/login.html");

            throw new Error(
                "Phiên đăng nhập đã hết hạn."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.title ||
                `Không xử lý được yêu cầu (HTTP ${response.status}).`
            );
        }

        return data;
    }

    async function getCsrfToken() {
        const result = await requestJson(
            "/api/account/csrf-token"
        );

        if (!result.csrfToken) {
            throw new Error(
                "Không lấy được mã bảo mật. " +
                "Vui lòng tải lại trang."
            );
        }

        return result.csrfToken;
    }

    function latestRequestFor(bookingId) {
        return requests.get(
            Number(bookingId)
        ) || null;
    }

    function isRefunded(request) {
        if (!request) return false;

        const expected = Number(
            request.estimatedRefund || 0
        );

        const actual = Number(
            request.refundedAmount || 0
        );

        return (
            request.status === "Đã duyệt" &&
            expected > 0 &&
            actual >= expected &&
            Array.isArray(request.refundStatus) &&
            request.refundStatus.includes("Đã hoàn")
        );
    }

    function refundState(request) {
        if (!request) {
            return {
                label: "",
                className: "",
                description: ""
            };
        }

        const expected = Number(
            request.estimatedRefund || 0
        );

        const actual = Number(
            request.refundedAmount || 0
        );

        if (request.status === "Chờ xử lý") {
            return {
                label: "Chờ xét duyệt",
                className: "waiting",
                description:
                    "Khách sạn đang xem xét yêu cầu. " +
                    "Đơn đặt phòng vẫn còn hiệu lực."
            };
        }

        if (request.status === "Từ chối") {
            return {
                label: "Yêu cầu bị từ chối",
                className: "rejected",
                description:
                    "Đơn đặt phòng vẫn giữ nguyên trạng thái. " +
                    "Bạn có thể xem lý do phản hồi của khách sạn."
            };
        }

        if (request.status === "Đã duyệt") {
            if (expected <= 0) {
                return {
                    label: "Không hoàn cọc",
                    className: "no-refund",
                    description:
                        "Yêu cầu hủy đã được duyệt. " +
                        "Theo chính sách và thời điểm gửi yêu cầu, " +
                        "không phát sinh khoản tiền được hoàn."
                };
            }

            if (isRefunded(request)) {
                return {
                    label: "Đã ghi nhận hoàn cọc",
                    className: "refunded",
                    description:
                        "Khách sạn đã ghi nhận hoàn cọc " +
                        "trong hệ thống quản lý."
                };
            }

            if (actual > 0 && actual < expected) {
                return {
                    label: "Đã hoàn một phần",
                    className: "waiting",
                    description:
                        "Một phần số tiền hoàn đã được ghi nhận. " +
                        "Phần còn lại đang chờ xử lý."
                };
            }

            return {
                label: "Đang chờ hoàn cọc",
                className: "waiting",
                description:
                    "Yêu cầu hủy đã được duyệt. " +
                    "Khoản tiền hoàn đang chờ được xử lý."
            };
        }

        return {
            label: request.status || "Chưa cập nhật",
            className: "waiting",
            description: ""
        };
    }

    function canRequestCancellation(booking, payment) {
        if (!booking || !payment) {
            return false;
        }

        if (payment.hasPaid !== true) {
            return false;
        }

        if (payment.pending === true) {
            return false;
        }

        if (![
            "Chờ xác nhận",
            "Đã xác nhận",
            "Đã đặt cọc"
        ].includes(booking.status)) {
            return false;
        }

        const checkIn = String(
            booking.checkIn || ""
        ).slice(0, 10);

        const now = new Date();

        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");

        if (!checkIn || checkIn < today) {
            return false;
        }

        const existing = latestRequestFor(
            booking.bookingId
        );

        if (
            existing &&
            [
                "Chờ xử lý",
                "Đã duyệt"
            ].includes(existing.status)
        ) {
            return false;
        }

        return true;
    }

    function openRequestDialog(bookingId) {
        const booking = bookings.get(
            Number(bookingId)
        );

        const payment = payments.get(
            Number(bookingId)
        );

        if (!canRequestCancellation(booking, payment)) {
            show(
                "Đơn này chưa đủ điều kiện gửi yêu cầu hủy. " +
                "Vui lòng cập nhật trạng thái.",
                true
            );

            return;
        }

        selectedBookingId = Number(bookingId);

        bookingLabel.textContent =
            `Đơn đặt phòng #${bookingId} · ` +
            `${booking.roomName || "KS Hotel"}`;

        reasonInput.value = "";
        showFeedback("");

        dialog.showModal();
        reasonInput.focus();
    }

    function closeDialog() {
        if (submitting) return;

        dialog.close();

        selectedBookingId = null;
        reasonInput.value = "";
        showFeedback("");
    }

    function makeCancellationButton(bookingId) {
        const button = createElement(
            "button",
            "booking-cancellation-button",
            "Yêu cầu hủy"
        );

        button.type = "button";

        button.addEventListener("click", () => {
            openRequestDialog(bookingId);
        });

        return button;
    }

    // ==========================================
    // THONG TIN HOAN COC TRONG THE DAT PHONG
    // ==========================================

    function createSummaryRow(label, value, emphasis = false) {
        const row = createElement(
            "div",
            "booking-refund-row"
        );

        appendText(
            row,
            "span",
            label
        );

        appendText(
            row,
            "strong",
            value,
            emphasis ? "booking-refund-emphasis" : ""
        );

        return row;
    }

    function buildRefundSummary(request) {
        const state = refundState(request);

        const summary = createElement(
            "section",
            "booking-refund-summary " + state.className
        );

        summary.dataset.cancellationRequestId =
            String(request.requestId);

        const heading = createElement(
            "div",
            "booking-refund-heading"
        );

        appendText(
            heading,
            "strong",
            "Thông tin hủy và hoàn cọc"
        );

        appendText(
            heading,
            "span",
            state.label,
            "booking-refund-badge " + state.className
        );

        summary.appendChild(heading);

        if (request.status === "Chờ xử lý") {
            summary.appendChild(
                createSummaryRow(
                    "Tiền cọc đã thanh toán",
                    money(request.depositAmount)
                )
            );

            summary.appendChild(
                createSummaryRow(
                    "Số tiền dự kiến được hoàn",
                    money(request.estimatedRefund),
                    true
                )
            );
        } else if (request.status === "Từ chối") {
            summary.appendChild(
                createSummaryRow(
                    "Tiền cọc ban đầu",
                    money(request.depositAmount)
                )
            );
        } else {
            summary.appendChild(
                createSummaryRow(
                    "Tỷ lệ hoàn cọc",
                    `${Number(request.refundRate || 0)}%`
                )
            );

            summary.appendChild(
                createSummaryRow(
                    "Số tiền được duyệt hoàn",
                    money(request.estimatedRefund),
                    true
                )
            );

            if (
                Number(request.refundedAmount || 0) > 0 ||
                isRefunded(request)
            ) {
                summary.appendChild(
                    createSummaryRow(
                        "Đã ghi nhận hoàn",
                        money(request.refundedAmount),
                        true
                    )
                );
            }
        }

        if (state.description) {
            appendText(
                summary,
                "p",
                state.description,
                "booking-refund-description"
            );
        }

        return summary;
    }

    function getCardBookingId(card) {
        const code = card.querySelector(
            ".booking-card-code"
        );

        const match = code?.textContent?.match(
            /#(\d+)/
        );

        return match
            ? Number(match[1])
            : null;
    }

    function renderBookingActions() {
        if (!loaded) return;

        const cards = list.querySelectorAll(
            ".my-booking-card"
        );

        cards.forEach(card => {
            const bookingId = getCardBookingId(card);

            if (!bookingId) return;

            const booking = bookings.get(bookingId);
            const payment = payments.get(bookingId);
            const cancellation = latestRequestFor(bookingId);

            const actions = card.querySelector(
                ".booking-card-actions"
            );

            if (!actions) return;

            // Xoa kieu hien thi cu chi co mot dong.
            const oldInfo = card.querySelector(
                ".booking-cancellation-info"
            );

            if (oldInfo) {
                oldInfo.remove();
            }

            const oldButton = actions.querySelector(
                ".booking-cancellation-button"
            );

            const canRequest =
                canRequestCancellation(booking, payment);

            if (canRequest && !oldButton) {
                actions.appendChild(
                    makeCancellationButton(bookingId)
                );
            }

            if (!canRequest && oldButton) {
                oldButton.remove();
            }

            const existingSummary = card.querySelector(
                ".booking-refund-summary"
            );

            if (!cancellation) {
                if (existingSummary) {
                    existingSummary.remove();
                }

                return;
            }

            const signature = [
                cancellation.requestId,
                cancellation.status,
                cancellation.refundRate,
                cancellation.estimatedRefund,
                cancellation.refundedAmount,
                (cancellation.refundStatus || []).join(",")
            ].join("|");

            if (
                existingSummary &&
                existingSummary.dataset.signature === signature
            ) {
                return;
            }

            const summary = buildRefundSummary(
                cancellation
            );

            summary.dataset.signature = signature;

            if (existingSummary) {
                existingSummary.replaceWith(summary);
            } else {
                const bottom = card.querySelector(
                    ".my-booking-bottom"
                );

                if (bottom) {
                    bottom.before(summary);
                } else {
                    card.appendChild(summary);
                }
            }
        });
    }

    // ==========================================
    // BO SUNG THONG TIN VAO CUA SO XEM CHI TIET
    // ==========================================

    function makeDetailField(label, value) {
        const field = createElement(
            "div",
            "booking-detail-field"
        );

        appendText(
            field,
            "span",
            label,
            "booking-detail-label"
        );

        appendText(
            field,
            "strong",
            value
        );

        return field;
    }

    function appendDetailRow(grid, label, value) {
        grid.appendChild(
            makeDetailField(label, value)
        );
    }

    function decorateBookingModal() {
        if (!loaded) return;

        const modal = document.getElementById(
            "bookingDetailModal"
        );

        if (!modal || modal.hidden) {
            return;
        }

        const title = document.getElementById(
            "bookingDetailTitle"
        );

        const modalBody = modal.querySelector(
            ".booking-detail-body"
        );

        if (!title || !modalBody) {
            return;
        }

        const match = title.textContent.match(/#(\d+)/);

        if (!match) return;

        const bookingId = Number(match[1]);
        const request = latestRequestFor(bookingId);

        const oldSection = modalBody.querySelector(
            "[data-cancellation-detail]"
        );

        if (!request) {
            if (oldSection) {
                oldSection.remove();
            }

            return;
        }

        const signature = [
            bookingId,
            request.requestId,
            request.status,
            request.estimatedRefund,
            request.refundedAmount,
            (request.refundStatus || []).join(","),
            request.processingNote || ""
        ].join("|");

        if (
            oldSection &&
            oldSection.dataset.signature === signature
        ) {
            return;
        }

        const state = refundState(request);

        const section = createElement(
            "section",
            "booking-detail-section booking-cancellation-detail"
        );

        section.dataset.cancellationDetail = "true";
        section.dataset.signature = signature;

        appendText(
            section,
            "h3",
            "Thông tin hủy phòng và hoàn cọc"
        );

        const status = createElement(
            "div",
            "booking-detail-refund-state " + state.className
        );

        appendText(
            status,
            "strong",
            state.label
        );

        if (state.description) {
            appendText(
                status,
                "p",
                state.description
            );
        }

        section.appendChild(status);

        const grid = createElement(
            "div",
            "booking-detail-grid"
        );

        appendDetailRow(
            grid,
            "Mã yêu cầu hủy",
            `#${request.requestId}`
        );

        appendDetailRow(
            grid,
            "Trạng thái yêu cầu",
            request.status
        );

        appendDetailRow(
            grid,
            "Thời điểm gửi yêu cầu",
            formatDateTime(request.requestedAt)
        );

        appendDetailRow(
            grid,
            "Lý do hủy phòng",
            request.reason || "Chưa cập nhật"
        );

        appendDetailRow(
            grid,
            "Tiền cọc đã thanh toán",
            money(request.depositAmount)
        );

        appendDetailRow(
            grid,
            "Tỷ lệ hoàn cọc",
            `${Number(request.refundRate || 0)}%`
        );

        appendDetailRow(
            grid,
            "Số tiền dự kiến hoàn",
            money(request.estimatedRefund)
        );

        if (request.status === "Đã duyệt") {
            appendDetailRow(
                grid,
                "Số tiền đã ghi nhận hoàn",
                money(request.refundedAmount)
            );

            appendDetailRow(
                grid,
                "Trạng thái hoàn cọc",
                state.label
            );
        }

        if (request.processedAt) {
            appendDetailRow(
                grid,
                "Thời điểm xử lý",
                formatDateTime(request.processedAt)
            );
        }

        if (request.processingNote) {
            appendDetailRow(
                grid,
                "Phản hồi khách sạn",
                request.processingNote
            );
        }

        section.appendChild(grid);

        const footer = modalBody.querySelector(
            ".booking-detail-footer"
        );

        if (oldSection) {
            oldSection.replaceWith(section);
        } else if (footer) {
            footer.before(section);
        } else {
            modalBody.appendChild(section);
        }
    }

    // ==========================================
    // DANH SACH CAC YEU CAU HUY PHONG
    // ==========================================

    function renderRequests(items) {
        requestsBox.replaceChildren();

        if (!items.length) {
            const empty = createElement(
                "div",
                "cancellation-card cancellation-empty"
            );

            appendText(
                empty,
                "h3",
                "Chưa có yêu cầu hủy phòng"
            );

            appendText(
                empty,
                "p",
                "Các yêu cầu hủy và thông tin hoàn cọc " +
                "sẽ được hiển thị tại đây."
            );

            requestsBox.appendChild(empty);
            return;
        }

        items.forEach(item => {
            const state = refundState(item);

            const card = createElement(
                "article",
                "cancellation-card cancellation-card-new"
            );

            const top = createElement(
                "div",
                "cancellation-card-top"
            );

            const heading = createElement("div");

            appendText(
                heading,
                "span",
                `YÊU CẦU #${item.requestId}`,
                "cancellation-request-code"
            );

            appendText(
                heading,
                "h3",
                `Đơn đặt phòng #${item.bookingId}`
            );

            top.appendChild(heading);

            appendText(
                top,
                "span",
                state.label,
                "cancellation-status " + state.className
            );

            card.appendChild(top);

            const info = createElement(
                "div",
                "cancellation-info-grid"
            );

            const fields = [
                [
                    "Ngày gửi yêu cầu",
                    formatDateTime(item.requestedAt)
                ],
                [
                    "Trạng thái xét duyệt",
                    item.status
                ],
                [
                    "Tiền cọc đã thanh toán",
                    money(item.depositAmount)
                ],
                [
                    "Tỷ lệ hoàn",
                    `${Number(item.refundRate || 0)}%`
                ],
                [
                    "Số tiền được duyệt hoàn",
                    money(item.estimatedRefund)
                ]
            ];

            if (item.status === "Đã duyệt") {
                fields.push([
                    "Số tiền đã ghi nhận hoàn",
                    money(item.refundedAmount)
                ]);
            }

            fields.forEach(([label, value]) => {
                const field = createElement(
                    "div",
                    "cancellation-info-field"
                );

                appendText(
                    field,
                    "span",
                    label
                );

                appendText(
                    field,
                    "strong",
                    value
                );

                info.appendChild(field);
            });

            card.appendChild(info);

            const noteBox = createElement(
                "div",
                "cancellation-note-box"
            );

            appendText(
                noteBox,
                "strong",
                "Lý do hủy"
            );

            appendText(
                noteBox,
                "p",
                item.reason || "Chưa cập nhật"
            );

            card.appendChild(noteBox);

            if (state.description) {
                appendText(
                    card,
                    "p",
                    state.description,
                    "cancellation-state-description"
                );
            }

            if (item.processingNote) {
                const processingNote = createElement(
                    "div",
                    "cancellation-processing-note"
                );

                appendText(
                    processingNote,
                    "strong",
                    "Phản hồi từ KS Hotel"
                );

                appendText(
                    processingNote,
                    "p",
                    item.processingNote
                );

                card.appendChild(processingNote);
            }

            requestsBox.appendChild(card);
        });
    }

    // ==========================================
    // TAI DU LIEU KHACH HANG
    // ==========================================

    async function loadAll() {
        if (loadingPromise) {
            return loadingPromise;
        }

        loadingPromise = (async () => {
            try {
                const [
                    bookingData,
                    paymentData,
                    cancellationData
                ] = await Promise.all([
                    requestJson("/api/bookings/mine"),
                    requestJson("/api/vnpay/bookings"),
                    requestJson("/api/cancellations/mine")
                ]);

                if (
                    !Array.isArray(bookingData.bookings) ||
                    !Array.isArray(paymentData.bookings) ||
                    !Array.isArray(cancellationData.requests)
                ) {
                    throw new Error(
                        "Dữ liệu yêu cầu hủy không hợp lệ."
                    );
                }

                bookings = new Map(
                    bookingData.bookings.map(item => [
                        Number(item.bookingId),
                        item
                    ])
                );

                payments = new Map(
                    paymentData.bookings.map(item => [
                        Number(item.bookingId),
                        item
                    ])
                );

                requests = new Map();

                const requestItems =
                    cancellationData.requests;

                // API tra ve yeu cau moi nhat truoc.
                requestItems.forEach(item => {
                    const bookingId = Number(
                        item.bookingId
                    );

                    if (!requests.has(bookingId)) {
                        requests.set(bookingId, item);
                    }
                });

                loaded = true;

                renderRequests(requestItems);
                renderBookingActions();
                decorateBookingModal();

                show("");
            } catch (error) {
                loaded = false;

                show(
                    error.message ||
                    "Không tải được thông tin hủy phòng.",
                    true
                );
            }
        })();

        try {
            await loadingPromise;
        } finally {
            loadingPromise = null;
        }
    }

    // ==========================================
    // GUI YEU CAU HUY
    // ==========================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (
            submitting ||
            selectedBookingId === null
        ) {
            return;
        }

        const reason = reasonInput.value.trim();

        if (reason.length < 5 || reason.length > 500) {
            showFeedback(
                "Lý do hủy phải có từ 5 đến 500 ký tự.",
                true
            );

            return;
        }

        if (!window.confirm(
            "Bạn xác nhận gửi yêu cầu hủy phòng?\n" +
            "Yêu cầu sẽ được xét duyệt theo " +
            "chính sách hoàn cọc của KS Hotel."
        )) {
            return;
        }

        const bookingId = selectedBookingId;

        submitting = true;
        submitButton.disabled = true;

        showFeedback(
            "Đang gửi yêu cầu hủy phòng..."
        );

        try {
            const csrf = await getCsrfToken();

            const result = await requestJson(
                "/api/cancellations/request",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrf
                    },
                    body: JSON.stringify({
                        bookingId,
                        reason
                    })
                }
            );

            dialog.close();
            selectedBookingId = null;

            await loadAll();

            show(
                (result.message || "Đã gửi yêu cầu.") +
                " Số tiền dự kiến hoàn: " +
                money(result.estimatedRefund) +
                "."
            );

            if (refresh) {
                refresh.click();
            }
        } catch (error) {
            showFeedback(
                error.message ||
                "Không gửi được yêu cầu hủy phòng.",
                true
            );
        } finally {
            submitting = false;
            submitButton.disabled = false;
        }
    });

    closeButton.addEventListener(
        "click",
        closeDialog
    );

    dialog.addEventListener("cancel", event => {
        if (submitting) {
            event.preventDefault();
        } else {
            selectedBookingId = null;
        }
    });

    // ==========================================
    // DONG BO GIAO DIEN
    // ==========================================

    function scheduleSync() {
        if (syncScheduled) return;

        syncScheduled = true;

        requestAnimationFrame(() => {
            syncScheduled = false;

            renderBookingActions();
            decorateBookingModal();
        });
    }

    // my-bookings.js tao lai card khi tai du lieu.
    const bookingObserver = new MutationObserver(
        scheduleSync
    );

    bookingObserver.observe(list, {
        childList: true,
        subtree: true
    });

    // my-bookings.js tao noi dung modal khi nhan Xem chi tiet.
    const detailModal = document.getElementById(
        "bookingDetailModal"
    );

    if (detailModal) {
        const detailObserver = new MutationObserver(
            scheduleSync
        );

        detailObserver.observe(detailModal, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["hidden"]
        });
    }

    if (refresh) {
        refresh.addEventListener("click", () => {
            loadAll();
        });
    }

    loadAll();
});
