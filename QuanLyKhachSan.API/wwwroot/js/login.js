
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const button = document.getElementById("loginButton");
    const message = document.getElementById("loginMessage");

    if (!form || !username || !password || !button || !message) {
        return;
    }

    if (toggle) {
        toggle.addEventListener("click", () => {
            const isHidden = password.type === "password";

            password.type = isHidden ? "text" : "password";
            toggle.textContent = isHidden ? "Ẩn" : "Hiện";
        });
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (button.disabled) {
            return;
        }

        button.disabled = true;
        button.textContent = "Đang đăng nhập...";

        message.textContent = "";
        message.className = "message";

        try {
            const tokenResponse = await fetch(
                "/api/account/csrf-token",
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            );

            if (!tokenResponse.ok) {
                throw new Error("Không thể khởi tạo phiên đăng nhập.");
            }

            const { csrfToken } = await tokenResponse.json();

            const response = await fetch("/api/account/login", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({
                    tenDangNhap: username.value.trim(),
                    matKhau: password.value
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.thongBao ||
                    "Đăng nhập thất bại."
                );
            }

            const destinations = {
                Admin: "/admin/dashboard.html",
                Staff: "/staff/dashboard.html",
                Customer: "/"
            };

            const destination =
                destinations[data.role] || "/";

            window.location.replace(destination);
        } catch (error) {
            message.classList.add("error");

            message.textContent =
                error.message || "Có lỗi xảy ra.";
        } finally {
            button.disabled = false;
            button.textContent = "Đăng nhập →";
        }
    });
});
