"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    const message = document.getElementById("registerMessage");
    const button = document.getElementById("registerButton");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        message.textContent = "";
        message.className = "register-message";

        const hoTen = document.getElementById("hoTen").value.trim();
        const tenDangNhap =
            document.getElementById("tenDangNhap").value.trim();
        const email = document.getElementById("email").value.trim();
        const soDienThoai =
            document.getElementById("soDienThoai").value.trim();
        const matKhau = document.getElementById("matKhau").value;
        const xacNhan =
            document.getElementById("xacNhanMatKhau").value;

        if (matKhau !== xacNhan) {
            message.classList.add("error");
            message.textContent = "Hai mật khẩu không trùng nhau.";
            return;
        }

        button.disabled = true;
        button.textContent = "Đang đăng ký...";

        try {
            const tokenResponse =
                await fetch("/api/account/csrf-token")

            if (!tokenResponse.ok) {
                throw new Error("Không thể khởi tạo biểu mẫu.");
            }

            const { csrfToken } = await tokenResponse.json();

            const response = await fetch("/api/account/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    hoTen,
                    tenDangNhap,
                    email,
                    soDienThoai,
                    matKhau
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.thongBao || "Không thể đăng ký tài khoản."
                );
            }

            message.classList.add("success");
            message.textContent = data.thongBao;

            form.reset();

            const link = document.createElement("a");
            link.href = "/login.html";
            link.textContent = " Đi tới đăng nhập";
            message.appendChild(link);

        } catch (error) {
            message.classList.add("error");
            message.textContent =
                error.message || "Có lỗi xảy ra.";
        } finally {
            button.disabled = false;
            button.textContent = "Đăng ký tài khoản →";
        }
    });
});
