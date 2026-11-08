
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        form: document.getElementById("contactsFilterForm"),
        keyword: document.getElementById("contactsKeyword"),
        status: document.getElementById("contactsStatus"),
        clear: document.getElementById("contactsClear"),
        table: document.getElementById("contactsTableBody"),
        message: document.getElementById("contactsMessage"),
        total: document.getElementById("contactsTotal"),
        pending: document.getElementById("contactsPending"),
        processing: document.getElementById("contactsProcessing"),
        replied: document.getElementById("contactsReplied"),
        dialog: document.getElementById("contactDialog"),
        close: document.getElementById("contactDialogClose"),
        cancel: document.getElementById("contactReplyCancel"),
        replyForm: document.getElementById("contactReplyForm"),
        replyStatus: document.getElementById("contactReplyStatus"),
        replyContent: document.getElementById("contactReplyContent"),
        replyMessage: document.getElementById("contactReplyMessage"),
        replySubmit: document.getElementById("contactReplySubmit"),
        logout: document.getElementById("adminContactsLogout")
    };

    let currentContactId = null;

    function setMessage(text, isError = false) {
        elements.message.textContent = text;
        elements.message.style.color = isError ? "#B42318" : "#817569";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            if (!response.ok) {
                throw new Error(`Máy chủ trả về lỗi ${response.status}.`);
            }
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
                data.message || `Yêu cầu thất bại (${response.status}).`
            );
        }

        return data;
    }

    async function getToken() {
        const result = await fetchJson("/api/account/csrf-token");

        if (!result.csrfToken) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        return result.csrfToken;
    }

    function createCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = String(value ?? "");
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

            createCell(row, `#${item.id}`);

            const customerCell = document.createElement("td");
            const customer = document.createElement("div");
            const name = document.createElement("strong");
            const email = document.createElement("span");

            customer.className = "contacts-customer";
            name.textContent = item.name || "—";
            email.textContent = item.email || "—";

            customer.append(name, email);
            customerCell.appendChild(customer);
            row.appendChild(customerCell);

            createCell(row, item.subject || "—");
            createCell(row, formatDate(item.createdAt));

            const statusCell = document.createElement("td");
            const status = document.createElement("span");

            status.className = "contacts-status";

            if (item.status === "Đang xử lý") {
                status.classList.add("processing");
            } else if (item.status === "Đã phản hồi") {
                status.classList.add("replied");
            } else if (item.status === "Đã đóng") {
                status.classList.add("closed");
            }

            status.textContent = item.status || "—";
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            const button = document.createElement("button");

            button.type = "button";
            button.className = "contacts-view";
            button.textContent = "Xem chi tiết";
            button.addEventListener("click", () => openContact(item.id));

            actionCell.appendChild(button);
            row.appendChild(actionCell);

            elements.table.appendChild(row);
        });
    }

    async function loadContacts() {
        setMessage("Đang tải danh sách liên hệ...");

        const params = new URLSearchParams();

        const keyword = elements.keyword.value.trim();
        const status = elements.status.value;

        if (keyword) params.set("keyword", keyword);
        if (status) params.set("status", status);

        const query = params.toString();
        const url = `/api/lien-he${query ? `?${query}` : ""}`;

        try {
            const result = await fetchJson(url);
            const items = Array.isArray(result.items) ? result.items : [];

            renderContacts(items);
            updateStats(items);

            setMessage(`Hiển thị ${items.length} yêu cầu liên hệ.`);
        } catch (error) {
            renderContacts([]);
            updateStats([]);
            setMessage(error.message, true);
        }
    }

    function setDetail(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value || "—";
        }
    }

    async function openContact(id) {
        elements.replyMessage.textContent = "";

        try {
            const contact = await fetchJson(`/api/lien-he/${id}`);

            currentContactId = id;

            setDetail("contactDetailName", contact.hoTen);
            setDetail("contactDetailEmail", contact.email);
            setDetail("contactDetailPhone", contact.soDienThoai);
            setDetail("contactDetailDate", formatDate(contact.ngayGui));
            setDetail("contactDetailSubject", contact.chuDe);
            setDetail("contactDetailContent", contact.noiDung);

            elements.replyStatus.value = contact.trangThai;
            elements.replyContent.value = contact.noiDungPhanHoi || "";

            elements.dialog.showModal();
        } catch (error) {
            setMessage(error.message, true);
        }
    }

    async function saveReply(event) {
        event.preventDefault();

        if (currentContactId === null) return;

        const status = elements.replyStatus.value;
        const content = elements.replyContent.value.trim();

        if (status === "Đã phản hồi" && !content) {
            elements.replyMessage.textContent =
                "Vui lòng nhập nội dung phản hồi.";
            return;
        }

        elements.replySubmit.disabled = true;
        elements.replyMessage.textContent = "Đang lưu...";

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

            elements.dialog.close();
            currentContactId = null;

            await loadContacts();
            setMessage(result.message || "Cập nhật thành công.");
        } catch (error) {
            elements.replyMessage.textContent = error.message;
        } finally {
            elements.replySubmit.disabled = false;
        }
    }

    async function logout() {
        elements.logout.disabled = true;

        try {
            const token = await getToken();

            await fetchJson("/api/account/logout", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": token
                }
            });

            window.location.replace("/login.html");
        } catch (error) {
            alert(error.message);
            elements.logout.disabled = false;
        }
    }

    elements.form.addEventListener("submit", event => {
        event.preventDefault();
        loadContacts();
    });

    elements.clear.addEventListener("click", () => {
        elements.keyword.value = "";
        elements.status.value = "";
        loadContacts();
    });

    elements.replyForm.addEventListener("submit", saveReply);

    elements.close.addEventListener("click", () => {
        elements.dialog.close();
    });

    elements.cancel.addEventListener("click", () => {
        elements.dialog.close();
    });

    elements.dialog.addEventListener("close", () => {
        currentContactId = null;
    });

    loadContacts();
});
