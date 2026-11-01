
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const message = document.getElementById("contactMessage");

    if (!form || !message) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const name = document.getElementById("contactName").value.trim();
        const email = document.getElementById("contactEmail").value.trim();
        const subject = document.getElementById("contactSubject").value.trim();
        const content = document.getElementById("contactContent").value.trim();

        message.textContent = "Đang gửi yêu cầu...";
        message.style.color = "#817569";

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const csrfResponse = await fetch("/api/account/csrf-token", {
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!csrfResponse.ok)
                throw new Error("Không lấy được mã bảo vệ.");

            const csrf = await csrfResponse.json();

            const response = await fetch("/api/lien-he", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf.csrfToken
                },
                body: JSON.stringify({
                    hoTen: name,
                    email: email,
                    chuDe: subject,
                    noiDung: content
                })
            });

            const result = await response.json();

            if (!response.ok)
                throw new Error(result.message || "Không thể gửi liên hệ.");

            message.textContent = result.message;
            message.style.color = "#267343";
            form.reset();
        } catch (error) {
            message.textContent = error.message || "Có lỗi xảy ra.";
            message.style.color = "#b42318";
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});
