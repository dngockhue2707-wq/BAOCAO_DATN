
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById(
        "forgotPasswordForm"
    );

    const email = document.getElementById(
        "recoveryEmail"
    );

    const button = document.getElementById(
        "recoveryButton"
    );

    const message = document.getElementById(
        "recoveryMessage"
    );

    if (!form || !email || !button || !message) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (button.disabled) return;

        button.disabled = true;
        button.textContent = "Đang xử lý...";
        message.textContent = "";
        message.className = "recovery-message";

        try {
            const csrfResponse = await fetch(
                "/api/account/csrf-token",
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            if (!csrfResponse.ok) {
                throw new Error(
                    "Không khởi tạo được phiên bảo mật."
                );
            }

            const { csrfToken } =
                await csrfResponse.json();

            const response = await fetch(
                "/api/password-recovery/forgot",
                {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrfToken
                    },
                    body: JSON.stringify({
                        email: email.value.trim()
                    })
                }
            );

            const result = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message || "Không gửi được yêu cầu."
                );
            }

            message.classList.add("success");

            message.textContent =
                result.message ||
                "Nếu email đã đăng ký, bạn sẽ nhận được " +
                "liên kết đặt lại mật khẩu.";

            form.reset();

        } catch (error) {
            message.classList.add("error");
            message.textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = "Gửi liên kết đặt lại →";
        }
    });
});
