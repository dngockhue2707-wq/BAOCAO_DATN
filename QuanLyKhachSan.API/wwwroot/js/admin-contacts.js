
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const elements = {
        form: $("contactsFilterForm"),
        keyword: $("contactsKeyword"),
        status: $("contactsStatus"),
        time: $("contactsTime"),
        clear: $("contactsClear"),
        table: $("contactsTableBody"),
        message: $("contactsMessage"),

        total: $("contactsTotal"),
        pending: $("contactsPending"),
        processing: $("contactsProcessing"),
        replied: $("contactsReplied"),

        prev: $("contactsPrev"),
        next: $("contactsNext"),
        pageNumber: $("contactsCurrentPage"),
        pageInfo: $("contactsPageInfo"),

        dialog: $("contactDialog"),
        close: $("contactDialogClose"),
        cancel: $("contactReplyCancel"),

        replyForm: $("contactReplyForm"),
        replyStatus: $("contactReplyStatus"),
        replyContent: $("contactReplyContent"),
        replyMessage: $("contactReplyMessage"),
        replySubmit: $("contactReplySubmit"),
        emailNotice: $("contactEmailNotice")
    };

    if (!elements.form || !elements.table) return;

    let allContacts = [];
    let filteredContacts = [];

    let page = 1;
    const pageSize = 8;

    let currentContactId = null;
    let currentContact = null;
    let isSubmitting = false;
    let lastFocusedElement = null;

    const icons = {
        person: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4.5 21c.5-4.2 3-6.5 7.5-6.5s7 2.3 7.5 6.5"/>
            </svg>
        `,
        eye: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
                <circle cx="12" cy="12" r="2.5"/>
            </svg>
        `,
        check: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="m8 12 3 3 5-6"/>
            </svg>
        `,
        processing: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
                <path d="M20 7v5h-5M4 17v-5h5"/>
                <path d="M5.5 9A7 7 0 0 1 18 7"/>
                <path d="M18.5 15A7 7 0 0 1 6 17"/>
            </svg>
        `,
        clock: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round"
                 aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
            </svg>
        `,
        closed: `
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round"
                 aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="m9 9 6 6m0-6-6 6"/>
            </svg>
        `
    };

    function setMessage(text, isError = false, isSuccess = false) {
        elements.message.textContent = text;

        elements.message.style.color = isError
            ? "#B42318"
            : isSuccess
                ? "#267343"
                : "#817569";
    }

    function setReplyMessage(text, isError = false, isSuccess = false) {
        elements.replyMessage.textContent = text;

        elements.replyMessage.style.color = isError
            ? "#B42318"
            : isSuccess
                ? "#267343"
                : "#817569";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function validDate(value) {
        if (!value) return null;

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    function startOfDay(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }

    function matchesTime(item) {
        const filter = elements.time.value;

        if (filter === "all") return true;

        const date = validDate(item.createdAt);

        if (!date) return false;

        const today = startOfDay(new Date());
        const created = startOfDay(date);

        if (filter === "today") {
            return created.getTime() === today.getTime();
        }

        if (filter === "month") {
            return created.getFullYear() === today.getFullYear() &&
                created.getMonth() === today.getMonth();
        }

        const days = Number(filter);

        if (days === 7 || days === 30) {
            const earliest = new Date(today);
            earliest.setDate(earliest.getDate() - days + 1);

            return created >= earliest && created <= today;
        }

        return true;
    }

    async function fetchJson(url, options = {}) {
        let response;

        try {
            response = await fetch(url, {
                credentials: "same-origin",
                cache: "no-store",
                ...options
            });
        } catch {
            throw new Error(
                "Không thể kết nối đến máy chủ. " +
                "Vui lòng kiểm tra kết nối và thử lại."
            );
        }

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            window.location.href = "/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error("Tài khoản không có quyền quản trị.");
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    async function getToken() {
        const result = await fetchJson(
            "/api/account/csrf-token"
        );

        if (!result.csrfToken) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        return result.csrfToken;
    }

    function createCell(row, value, className = "") {
        const cell = document.createElement("td");

        cell.textContent = String(value ?? "");

        if (className) {
            cell.className = className;
        }

        row.appendChild(cell);
        return cell;
    }

    function updateStats(items) {
        elements.total.textContent = items.length;

        elements.pending.textContent = items.filter(
            item => item.status === "Chờ xử lý"
        ).length;

        elements.processing.textContent = items.filter(
            item => item.status === "Đang xử lý"
        ).length;

        elements.replied.textContent = items.filter(
            item => item.status === "Đã phản hồi"
        ).length;
    }

    function createCustomerCell(item) {
        const cell = document.createElement("td");

        const container = document.createElement("div");
        container.className = "contacts-customer";

        const avatar = document.createElement("div");
        avatar.className = "contacts-customer-avatar";
        avatar.innerHTML = icons.person;

        const info = document.createElement("div");
        info.className = "contacts-customer-details";

        const name = document.createElement("strong");
        name.textContent = item.name || "—";

        const email = document.createElement("span");
        email.textContent = item.email || "—";

        info.append(name, email);
        container.append(avatar, info);
        cell.appendChild(container);

        return cell;
    }

    function createStatusCell(item) {
        const cell = document.createElement("td");
        const status = document.createElement("span");

        status.className = "contacts-status";

        let icon = icons.clock;

        if (item.status === "Đang xử lý") {
            status.classList.add("processing");
            icon = icons.processing;
        } else if (item.status === "Đã phản hồi") {
            status.classList.add("replied");
            icon = icons.check;
        } else if (item.status === "Đã đóng") {
            status.classList.add("closed");
            icon = icons.closed;
        }

        const iconHolder = document.createElement("span");
        iconHolder.className = "contacts-status-icon";
        iconHolder.innerHTML = icon;

        const text = document.createElement("span");
        text.textContent = item.status || "—";

        status.append(iconHolder, text);
        cell.appendChild(status);

        return cell;
    }

    function renderContacts(items) {
        elements.table.replaceChildren();

        if (items.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "contacts-empty";
            cell.textContent = "Không tìm thấy yêu cầu liên hệ.";

            row.appendChild(cell);
            elements.table.appendChild(row);
            return;
        }

        items.forEach(item => {
            const row = document.createElement("tr");

            if (item.status === "Đang xử lý") {
                row.classList.add("contacts-row-processing");
            }

            createCell(row, `#${item.id}`, "contacts-code");

            row.appendChild(createCustomerCell(item));

            createCell(row, item.subject || "—");

            createCell(
                row,
                formatDate(item.createdAt),
                "contacts-date"
            );

            row.appendChild(createStatusCell(item));

            const actionCell = document.createElement("td");
            const button = document.createElement("button");

            button.type = "button";
            button.className = "contacts-view";

            const eye = document.createElement("span");
            eye.innerHTML = icons.eye;

            const text = document.createElement("span");
            text.textContent = "Xem chi tiết";

            button.append(eye, text);

            button.addEventListener("click", () => {
                lastFocusedElement = button;
                openContact(item.id);
            });

            actionCell.appendChild(button);
            row.appendChild(actionCell);

            elements.table.appendChild(row);
        });
    }

    function applyFilters(resetPage = true) {
        const keyword = elements.keyword.value
            .trim()
            .toLocaleLowerCase("vi-VN");

        const status = elements.status.value;

        filteredContacts = allContacts.filter(item => {
            const text = [
                item.name,
                item.email,
                item.subject
            ].join(" ").toLocaleLowerCase("vi-VN");

            const matchesKeyword =
                !keyword || text.includes(keyword);

            const matchesStatus =
                !status || item.status === status;

            return matchesKeyword &&
                matchesStatus &&
                matchesTime(item);
        });

        filteredContacts.sort((a, b) => {
            const dateA = validDate(a.createdAt)?.getTime() || 0;
            const dateB = validDate(b.createdAt)?.getTime() || 0;

            return dateB - dateA || Number(b.id) - Number(a.id);
        });

        if (resetPage) {
            page = 1;
        }

        renderPage();
    }

    function renderPage() {
        const total = filteredContacts.length;
        const pages = Math.max(1, Math.ceil(total / pageSize));

        page = Math.max(1, Math.min(page, pages));

        const start = (page - 1) * pageSize;
        const items = filteredContacts.slice(
            start,
            start + pageSize
        );

        renderContacts(items);

        elements.pageNumber.textContent = page;
        elements.prev.disabled = page <= 1;
        elements.next.disabled = page >= pages;

        if (total === 0) {
            elements.pageInfo.textContent =
                "Không có yêu cầu phù hợp.";
        } else {
            elements.pageInfo.textContent =
                `Hiển thị ${start + 1}–${Math.min(start + pageSize, total)} ` +
                `trên ${total} yêu cầu liên hệ.`;
        }

        setMessage(
            `Tìm thấy ${total} yêu cầu liên hệ.`
        );
    }

    async function loadContacts(resetPage = true) {
        setMessage("Đang tải danh sách liên hệ...");

        try {
            const result = await fetchJson("/api/lien-he");

            allContacts = Array.isArray(result.items)
                ? result.items
                : [];

            updateStats(allContacts);
            applyFilters(resetPage);

        } catch (error) {
            allContacts = [];
            filteredContacts = [];

            updateStats([]);
            renderContacts([]);

            elements.pageInfo.textContent =
                "Không tải được danh sách.";

            elements.pageNumber.textContent = "1";
            elements.prev.disabled = true;
            elements.next.disabled = true;

            setMessage(error.message, true);
        }
    }

    function setDetail(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value || "—";
        }
    }

    function isAlreadyReplied() {
        if (!currentContact) return false;

        return (
            currentContact.trangThai === "Đã phản hồi" &&
            currentContact.noiDungPhanHoi ===
                elements.replyContent.value.trim() &&
            !!currentContact.ngayPhanHoi
        );
    }

    function shouldSendEmail() {
        return (
            elements.replyStatus.value === "Đã phản hồi" &&
            !isAlreadyReplied()
        );
    }

    function updateReplyButton() {
        if (!currentContact) return;

        const status = elements.replyStatus.value;

        if (status === "Đã phản hồi") {
            if (isAlreadyReplied()) {
                elements.replySubmit.textContent =
                    "Lưu thay đổi";

                elements.emailNotice.textContent =
                    "Nội dung này đã được ghi nhận phản hồi. " +
                    "Lưu lại sẽ không gửi Gmail trùng.";
            } else {
                elements.replySubmit.textContent =
                    "Gửi phản hồi qua Gmail";

                elements.emailNotice.textContent =
                    "Khi bấm gửi, nội dung phản hồi sẽ được " +
                    "gửi tới Gmail của khách hàng.";
            }
        } else {
            elements.replySubmit.textContent =
                "Lưu thay đổi";

            elements.emailNotice.textContent =
                "Thay đổi trạng thái sẽ được lưu vào " +
                "hệ thống và không gửi Gmail.";
        }
    }

    async function openContact(id) {
        if (isSubmitting) return;

        setReplyMessage("");

        try {
            const contact = await fetchJson(
                `/api/lien-he/${encodeURIComponent(id)}`
            );

            currentContactId = id;
            currentContact = contact;

            setDetail("contactDetailName", contact.hoTen);
            setDetail("contactDetailEmail", contact.email);
            setDetail("contactDetailPhone", contact.soDienThoai);
            setDetail(
                "contactDetailDate",
                formatDate(contact.ngayGui)
            );
            setDetail("contactDetailSubject", contact.chuDe);
            setDetail("contactDetailContent", contact.noiDung);

            elements.replyStatus.value =
                contact.trangThai || "Chờ xử lý";

            elements.replyContent.value =
                contact.noiDungPhanHoi || "";

            updateReplyButton();
            elements.dialog.showModal();

        } catch (error) {
            setMessage(error.message, true);
        }
    }

    async function saveReply(event) {
        event.preventDefault();

        if (currentContactId === null || isSubmitting) {
            return;
        }

        const status = elements.replyStatus.value;
        const content = elements.replyContent.value.trim();

        if (status === "Đã phản hồi" && content.length < 2) {
            setReplyMessage(
                "Vui lòng nhập ít nhất 2 ký tự phản hồi.",
                true
            );
            return;
        }

        if (content.length > 3000) {
            setReplyMessage(
                "Nội dung không được vượt quá 3000 ký tự.",
                true
            );
            return;
        }

        const sendEmail = shouldSendEmail();

        if (sendEmail) {
            const recipient = currentContact?.email || "";

            const confirmed = window.confirm(
                "GỬI PHẢN HỒI QUA GMAIL\n\n" +
                `Người nhận: ${recipient}\n\n` +
                "Bạn có chắc chắn muốn gửi nội dung " +
                "phản hồi đến email khách hàng không?"
            );

            if (!confirmed) return;
        }

        isSubmitting = true;

        elements.replySubmit.disabled = true;
        elements.replyStatus.disabled = true;
        elements.replyContent.readOnly = true;

        elements.replySubmit.textContent = sendEmail
            ? "Đang gửi Gmail..."
            : "Đang lưu...";

        setReplyMessage(
            sendEmail
                ? "Đang gửi email cho khách hàng..."
                : "Đang cập nhật yêu cầu..."
        );

        let completed = false;

        try {
            const token = await getToken();

            const result = await fetchJson(
                `/api/lien-he/${currentContactId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": token
                    },
                    body: JSON.stringify({
                        trangThai: status,
                        noiDungPhanHoi: content
                    })
                }
            );

            completed = true;

            elements.dialog.close();

            currentContactId = null;
            currentContact = null;

            await loadContacts(false);

            if (result.emailSent === true) {
                setMessage(
                    "Đã gửi phản hồi qua Gmail cho khách hàng.",
                    false,
                    true
                );
            } else {
                setMessage(
                    result.message ||
                    "Đã cập nhật yêu cầu hỗ trợ.",
                    false,
                    true
                );
            }
        } catch (error) {
            if (!completed) {
                setReplyMessage(
                    error.message || "Không thể xử lý yêu cầu.",
                    true
                );
            }
        } finally {
            isSubmitting = false;

            elements.replySubmit.disabled = false;
            elements.replyStatus.disabled = false;
            elements.replyContent.readOnly = false;

            if (currentContact) {
                updateReplyButton();
            }
        }
    }

    function closeDialog() {
        if (!isSubmitting) {
            elements.dialog.close();
        }
    }

    elements.form.addEventListener("submit", event => {
        event.preventDefault();
        applyFilters(true);
    });

    elements.clear.addEventListener("click", () => {
        elements.keyword.value = "";
        elements.status.value = "";
        elements.time.value = "all";

        page = 1;
        loadContacts(true);
    });

    elements.prev.addEventListener("click", () => {
        if (page > 1) {
            page--;
            renderPage();
        }
    });

    elements.next.addEventListener("click", () => {
        const totalPages = Math.ceil(
            filteredContacts.length / pageSize
        );

        if (page < totalPages) {
            page++;
            renderPage();
        }
    });

    elements.replyStatus.addEventListener(
        "change",
        updateReplyButton
    );

    elements.replyContent.addEventListener(
        "input",
        updateReplyButton
    );

    elements.replyForm.addEventListener(
        "submit",
        saveReply
    );

    elements.close.addEventListener(
        "click",
        closeDialog
    );

    elements.cancel.addEventListener(
        "click",
        closeDialog
    );

    elements.dialog.addEventListener("cancel", event => {
        if (isSubmitting) {
            event.preventDefault();
        }
    });

    elements.dialog.addEventListener("close", () => {
        if (!isSubmitting) {
            currentContactId = null;
            currentContact = null;

            if (lastFocusedElement?.isConnected) {
                lastFocusedElement.focus();
            }
        }
    });

    loadContacts();
});
