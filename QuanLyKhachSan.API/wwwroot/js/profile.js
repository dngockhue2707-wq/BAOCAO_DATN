
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("profileForm");
    const message = document.getElementById("profileMessage");
    const button = document.getElementById("saveProfile");

    async function loadProfile() {
        try {
            const response = await fetch("/api/profile");

            if (response.status === 401) {
                location.href = "/login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không tải được hồ sơ.");
            }

            document.getElementById("username").value =
                data.username || "";

            document.getElementById("email").value =
                data.email || "";

            document.getElementById("fullName").value =
                data.fullName || "";

            document.getElementById("phone").value =
                data.phone || "";

            document.getElementById("address").value =
                data.address || "";
        } catch (error) {
            message.textContent = error.message;
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        button.disabled = true;
        message.textContent = "Đang lưu...";

        try {
            const tokenResponse =
                await fetch("/api/account/csrf-token");

            const { csrfToken } = await tokenResponse.json();

            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    fullName:
                        document.getElementById("fullName").value,
                    phone:
                        document.getElementById("phone").value,
                    address:
                        document.getElementById("address").value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không thể cập nhật.");
            }

            message.textContent = data.message;
        } catch (error) {
            message.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });

    loadProfile();
});
