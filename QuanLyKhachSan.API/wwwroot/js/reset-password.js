
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById(
        "resetPasswordForm"
    );

    const password = document.getElementById(
        "newPassword"
    );

    const confirm = document.getElementById(
        "confirmPassword"
    );

    const button = document.getElementById(
        "resetButton"
    );

    const message = document.getElementById(
        "resetMessage"
    );

    if (!form || !password || !confirm ||
        !button || !message) return;

    const params = new URLSearchParams(
        window.location.search
    );

    const token = params.get("token");

    // Khong giu token tren thanh dia chi sau khi doc.
    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );

    if (!token || !/^[a-fA-F0-9]{64}$/.test(token)) {
        message.className = "recovery-message error";
        message.textContent =
            "Liên kết không hợp lệ. " +
            "Vui lòng yêu cầu đặt lại mật khẩu.";

        button.disabled = true;
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (button.disabled) return;

        message.className = "recovery-message";
        message.textContent = "";

        if (password.value !== confirm.value) {
            message.classList.add("error");
            message.textContent =
                "Xác nhận mật khẩu không khớp.";
            return;
        }

        if (
            password.value.length < 12 ||
            password.value.length > 128
        ) {
            message.classList.add("error");
            message.textContent =
                "Mật khẩu phải có từ 12 đến 128 ký tự.";
            return;
        }

        button.disabled = true;
        button.textContent = "Đang cập nhật...";

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
                "/api/password-recovery/reset",
                {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrfToken
                    },
                    body: JSON.stringify({
                        token: token,
                        newPassword: password.value,
                        confirmPassword: confirm.value
                    })
                }
            );

            const result = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Không thể đặt lại mật khẩu."
                );
            }

            message.classList.add("success");
            message.textContent =
                "Đặt lại mật khẩu thành công! " +
                "Bạn có thể quay lại đăng nhập.";

            password.value = "";
            confirm.value = "";

            button.disabled = true;
            button.textContent = "Đã cập nhật mật khẩu";

        } catch (error) {
            message.classList.add("error");
            message.textContent = error.message;

            button.disabled = false;
            button.textContent = "Cập nhật mật khẩu →";
        }
    });
});
