
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = window.Staff;

    let requests = [];
    let keyword = "";
    let selectedStatus = "Tất cả";
    let isSending = false;
    let activeRequest = null;
    let previousFocus = null;

    const el = (tag, className = "", value = "") => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = String(value ?? "");
        return node;
    };

    const stat = (label, value, symbol, type) => {
        const card = el("article", "rq-stat");
        card.appendChild(
            el("span", "rq-stat-icon " + type, symbol)
        );

        const info = el("div");
        info.append(
            el("strong", "", value),
            el("small", "", label)
        );

        card.appendChild(info);
        return card;
    };

    const statusBadge = value => {
        const styles = {
            "Đã phản hồi": "answered",
            "Chờ phản hồi": "waiting",
            "Chưa phản hồi": "waiting",
            "Đã đóng": "closed"
        };

        return el(
            "span",
            "rq-status " + (styles[value] || "neutral"),
            value || "—"
        );
    };

    async function sendReply(id, content) {
        const csrfResponse = await fetch(
            "/api/account/csrf-token",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!csrfResponse.ok) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        const csrf = await csrfResponse.json();

        if (!csrf.csrfToken) {
            throw new Error("Mã bảo vệ không hợp lệ.");
        }

        const response = await fetch(
            `/api/staff/contact-replies/${id}`,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf.csrfToken
                },
                body: JSON.stringify({ content })
            }
        );

        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.location.href = "/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error(
                "Tài khoản không có quyền nhân viên."
            );
        }

        if (!response.ok) {
            throw new Error(
                result.message ||
                `Không thể gửi phản hồi (${response.status}).`
            );
        }

        return result;
    }

    function closeModal(force = false) {
        if (isSending && !force) return;

        const modal = document.getElementById("rqReplyOverlay");

        if (modal) {
            modal.remove();
        }

        document.body.classList.remove("rq-modal-open");
        activeRequest = null;

        if (previousFocus && previousFocus.isConnected) {
            previousFocus.focus();
        }

        previousFocus = null;
    }

    function openReplyModal(item) {
        if (isSending) return;

        closeModal();

        activeRequest = item;
        previousFocus = document.activeElement;

        const overlay = el("div", "rq-modal-overlay");
        overlay.id = "rqReplyOverlay";

        const dialog = el("section", "rq-modal");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute(
            "aria-labelledby",
            "rqReplyModalTitle"
        );

        const heading = el("div", "rq-modal-heading");
        const headingInfo = el("div", "rq-modal-heading-info");

        headingInfo.append(
            el(
                "span",
                "rq-modal-eyebrow",
                "KS HOTEL · CHĂM SÓC KHÁCH HÀNG"
            ),
            el(
                "h2",
                "",
                item.reply
                    ? "Sửa phản hồi khách hàng"
                    : "Phản hồi khách hàng"
            )
        );

        headingInfo.querySelector("h2").id =
            "rqReplyModalTitle";

        const closeButton = el(
            "button",
            "rq-modal-close",
            "×"
        );

        closeButton.type = "button";
        closeButton.setAttribute(
            "aria-label",
            "Đóng cửa sổ"
        );
        closeButton.addEventListener(
            "click",
            () => closeModal()
        );

        heading.append(headingInfo, closeButton);

        const form = document.createElement("form");
        form.className = "rq-modal-form";

        const recipient = el("div", "rq-modal-recipient");

        const recipientIcon = el(
            "span",
            "rq-modal-recipient-icon",
            "✉"
        );

        const recipientInfo = el(
            "div",
            "rq-modal-recipient-info"
        );

        recipientInfo.append(
            el("span", "", "NGƯỜI NHẬN"),
            el(
                "strong",
                "",
                item.customer || "Khách hàng"
            ),
            el(
                "small",
                "",
                item.email || "Chưa có email"
            )
        );

        recipient.append(recipientIcon, recipientInfo);

        const subject = el("div", "rq-modal-subject");
        subject.append(
            el("span", "", "Chủ đề"),
            el(
                "strong",
                "",
                item.subject || "Yêu cầu hỗ trợ"
            )
        );

        const customerContent = el(
            "div",
            "rq-modal-customer-content"
        );

        customerContent.append(
            el("span", "", "NỘI DUNG KHÁCH GỬI"),
            el("p", "", item.content || "—")
        );

        const inputGroup = el(
            "div",
            "rq-modal-input-group"
        );

        const inputHeading = el(
            "div",
            "rq-modal-input-heading"
        );

        const label = el(
            "label",
            "",
            "Nội dung phản hồi"
        );
        label.htmlFor = "rqReplyContent";

        const counter = el(
            "span",
            "rq-modal-counter",
            "0/2000"
        );

        inputHeading.append(label, counter);

        const textarea = document.createElement("textarea");
        textarea.id = "rqReplyContent";
        textarea.className = "rq-modal-textarea";
        textarea.rows = 7;
        textarea.maxLength = 2000;
        textarea.minLength = 2;
        textarea.required = true;
        textarea.placeholder =
            "Nhập nội dung phản hồi gửi đến khách hàng...";
        textarea.value = item.reply || "";

        const updateCounter = () => {
            counter.textContent =
                `${textarea.value.length}/2000`;
        };

        textarea.addEventListener("input", updateCounter);
        updateCounter();

        inputGroup.append(inputHeading, textarea);

        const feedback = el("p", "rq-modal-feedback");
        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");
        feedback.hidden = true;

        const footer = el("div", "rq-modal-footer");

        const cancelButton = el(
            "button",
            "rq-modal-cancel",
            "Hủy"
        );
        cancelButton.type = "button";
        cancelButton.addEventListener(
            "click",
            () => closeModal()
        );

        const submitButton = el(
            "button",
            "rq-modal-submit",
            "Gửi phản hồi"
        );
        submitButton.type = "submit";

        footer.append(cancelButton, submitButton);

        form.append(
            recipient,
            subject,
            customerContent,
            inputGroup,
            feedback,
            footer
        );

        dialog.append(heading, form);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        document.body.classList.add("rq-modal-open");

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        dialog.addEventListener("keydown", event => {
            if (event.key !== "Tab") return;

            const focusable = [...dialog.querySelectorAll(
                "button:not([disabled]), textarea:not([disabled])"
            )];

            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey &&
                document.activeElement === first) {
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

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (isSending || activeRequest !== item) return;

            const content = textarea.value.trim();

            feedback.hidden = true;
            feedback.textContent = "";
            feedback.classList.remove("error");

            if (content.length < 2 || content.length > 2000) {
                feedback.textContent =
                    "Nội dung phản hồi phải từ 2 đến 2000 ký tự.";
                feedback.classList.add("error");
                feedback.hidden = false;
                textarea.focus();
                return;
            }

            const alreadyReplied =
                item.status === "Đã phản hồi" &&
                item.reply === content &&
                !!item.repliedAt;

            if (alreadyReplied) {
                feedback.textContent =
                    "Nội dung này đã được phản hồi trước đó.";
                feedback.classList.add("error");
                feedback.hidden = false;
                return;
            }

            if (!item.email) {
                feedback.textContent =
                    "Khách hàng chưa có địa chỉ email.";
                feedback.classList.add("error");
                feedback.hidden = false;
                return;
            }

            const confirmed = confirm(
                "GỬI PHẢN HỒI QUA GMAIL\n\n" +
                `Khách hàng: ${item.customer}\n` +
                `Gmail: ${item.email}\n\n` +
                `Nội dung phản hồi:\n${content}\n\n` +
                "Bạn có chắc chắn muốn gửi?"
            );

            if (!confirmed) return;

            isSending = true;
            submitButton.disabled = true;
            cancelButton.disabled = true;
            closeButton.disabled = true;
            textarea.disabled = true;
            submitButton.textContent = "Đang gửi...";

            feedback.hidden = false;
            feedback.textContent =
                "Đang gửi phản hồi đến khách hàng...";

            try {
                const result = await sendReply(
                    item.id,
                    content
                );

                isSending = false;
                closeModal(true);

                await load();

                s.notify(
                    result.message ||
                    "Đã gửi Gmail cho khách hàng."
                );
            } catch (error) {
                isSending = false;

                submitButton.disabled = false;
                cancelButton.disabled = false;
                closeButton.disabled = false;
                textarea.disabled = false;
                submitButton.textContent = "Gửi phản hồi";

                feedback.textContent =
                    error.message || "Không thể gửi Gmail.";
                feedback.classList.add("error");
                feedback.hidden = false;
            }
        });

        textarea.focus();
        textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
        );
    }

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            document.getElementById("rqReplyOverlay") &&
            !isSending
        ) {
            closeModal();
        }
    });

    function showDetail(item) {
        alert(
            `Khách: ${item.customer}\n` +
            `Email: ${item.email}\n` +
            `Điện thoại: ${item.phone || "—"}\n` +
            `Chủ đề: ${item.subject}\n\n` +
            `Nội dung:\n${item.content}\n\n` +
            `Trạng thái: ${item.status}\n\n` +
            `Phản hồi:\n${item.reply || "Chưa phản hồi"}`
        );
    }

    function render() {
        const page = el("div", "rq-page");
        const stats = el("div", "rq-stats");

        const waiting = requests.filter(x =>
            ["Chờ phản hồi", "Chưa phản hồi"].includes(x.status)
        ).length;

        const answered = requests.filter(x =>
            x.status === "Đã phản hồi"
        ).length;

        const closed = requests.filter(x =>
            x.status === "Đã đóng"
        ).length;

        stats.append(
            stat("Tổng yêu cầu", requests.length, "✉", "all"),
            stat("Chờ phản hồi", waiting, "◷", "waiting"),
            stat("Đã phản hồi", answered, "✓", "answered"),
            stat("Đã đóng", closed, "▣", "closed")
        );

        const panel = el("section", "rq-panel");
        const heading = el("div", "rq-panel-head");

        heading.append(
            el("h2", "", "Danh sách yêu cầu hỗ trợ"),
            el("span", "rq-count", `${requests.length} yêu cầu`)
        );

        const filters = el("div", "rq-filters");

        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Tên khách, email, chủ đề...";
        search.value = keyword;

        const filter = document.createElement("select");

        [
            "Tất cả",
            "Chờ phản hồi",
            "Chưa phản hồi",
            "Đã phản hồi",
            "Đã đóng"
        ].forEach(value => {
            filter.add(new Option(value, value));
        });

        filter.value = selectedStatus;
        filters.append(search, filter);

        const counter = el("p", "rq-result");
        const results = el("div");

        function update() {
            keyword = search.value
                .trim()
                .toLocaleLowerCase("vi-VN");

            selectedStatus = filter.value;

            const filtered = requests.filter(item => {
                const text = [
                    item.id,
                    item.customer,
                    item.email,
                    item.subject
                ].join(" ").toLocaleLowerCase("vi-VN");

                return text.includes(keyword) &&
                    (
                        selectedStatus === "Tất cả" ||
                        item.status === selectedStatus
                    );
            });

            counter.textContent =
                `Hiển thị ${filtered.length}/${requests.length} yêu cầu`;

            const rows = filtered.map(item => {
                const actions = el("div", "rq-actions");

                const view = el(
                    "button",
                    "rq-button secondary",
                    "Xem"
                );
                view.type = "button";

                view.addEventListener(
                    "click",
                    () => showDetail(item)
                );

                const replyButton = el(
                    "button",
                    "rq-button",
                    item.reply ? "Sửa phản hồi" : "Phản hồi"
                );

                replyButton.type = "button";

                replyButton.addEventListener(
                    "click",
                    () => openReplyModal(item)
                );

                actions.append(view, replyButton);

                return [
                    el("strong", "rq-id", `#${item.id}`),
                    el("strong", "rq-customer", item.customer),
                    item.subject,
                    s.date(item.date),
                    statusBadge(item.status),
                    actions
                ];
            });

            results.replaceChildren(
                s.table(
                    [
                        "Mã",
                        "Khách hàng",
                        "Chủ đề",
                        "Ngày gửi",
                        "Trạng thái",
                        "Thao tác"
                    ],
                    rows
                )
            );
        }

        search.addEventListener("input", update);
        filter.addEventListener("change", update);

        panel.append(heading, filters, counter, results);
        page.append(stats, panel);

        s.content.replaceChildren(page);
        update();
    }

    async function load() {
        try {
            const data = await s.api("operations/requests");

            requests = Array.isArray(data.items)
                ? data.items
                : [];

            render();
        } catch (error) {
            s.notify(
                error.message || "Không tải được yêu cầu.",
                true
            );
        }
    }

    load();
});
