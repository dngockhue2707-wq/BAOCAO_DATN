
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    const message = document.getElementById("registerMessage");
    const button = document.getElementById("registerButton");

    if (!form || !message || !button) return;

    function showMessage(text, type = "") {
        message.textContent = text;
        message.className = "register-message";

        if (type) {
            message.classList.add(type);
        }
    }

    async function readJson(response) {
        return await response.json().catch(() => ({}));
    }

    function getErrorMessage(data, fallback) {
        return data?.message ||
               data?.thongBao ||
               data?.title ||
               fallback;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (button.disabled) return;

        showMessage("");

        const hoTen =
            document.getElementById("hoTen").value.trim();

        const tenDangNhap =
            document.getElementById("tenDangNhap").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const soDienThoai =
            document.getElementById("soDienThoai").value.trim();

        const matKhau =
            document.getElementById("matKhau").value;

        const xacNhan =
            document.getElementById("xacNhanMatKhau").value;

        if (hoTen.length < 2 || hoTen.length > 100) {
            showMessage(
                "Họ và tên phải có từ 2 đến 100 ký tự.",
                "error"
            );
            return;
        }

        if (
            tenDangNhap.length < 4 ||
            tenDangNhap.length > 100 ||
            !/^[a-zA-Z0-9_]+$/.test(tenDangNhap)
        ) {
            showMessage(
                "Tên đăng nhập phải có từ 4 đến 100 ký tự, chỉ gồm chữ cái không dấu, số và dấu gạch dưới.",
                "error"
            );
            return;
        }

        if (
            email.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            showMessage(
                "Vui lòng nhập địa chỉ email hợp lệ.",
                "error"
            );
            return;
        }

        if (!/^0[35789][0-9]{8}$/.test(soDienThoai)) {
            showMessage(
                "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
                "error"
            );
            return;
        }

        if (matKhau.length < 12 || matKhau.length > 128) {
            showMessage(
                "Mật khẩu phải có từ 12 đến 128 ký tự.",
                "error"
            );
            return;
        }

        if (matKhau !== xacNhan) {
            showMessage(
                "Hai mật khẩu không trùng nhau.",
                "error"
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Đang đăng ký...";

        try {
            const tokenResponse = await fetch(
                "/api/account/csrf-token",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const tokenData = await readJson(tokenResponse);

            if (!tokenResponse.ok || !tokenData.csrfToken) {
                throw new Error(
                    "Không thể khởi tạo phiên bảo mật. Hãy tải lại trang."
                );
            }

            const response = await fetch(
                "/api/account/register",
                {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": tokenData.csrfToken
                    },
                    body: JSON.stringify({
                        hoTen,
                        tenDangNhap,
                        email,
                        soDienThoai,
                        matKhau
                    })
                }
            );

            const data = await readJson(response);

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            "Tên đăng nhập, email hoặc số điện thoại đã được sử dụng."
                        )
                    );
                }

                if (response.status === 400) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            "Thông tin đăng ký không hợp lệ."
                        )
                    );
                }

                throw new Error(
                    getErrorMessage(
                        data,
                        "Không thể đăng ký tài khoản."
                    )
                );
            }

            showMessage(
                data.message ||
                data.thongBao ||
                "Đăng ký thành công! Bạn có thể đăng nhập.",
                "success"
            );

            form.reset();

            const link = document.createElement("a");
            link.href = "/login.html";
            link.textContent = " Đi tới đăng nhập";

            message.appendChild(link);

        } catch (error) {
            showMessage(
                error.message || "Có lỗi xảy ra khi đăng ký.",
                "error"
            );

        } finally {
            button.disabled = false;
            button.textContent = "Đăng ký tài khoản →";
        }
    });
});
