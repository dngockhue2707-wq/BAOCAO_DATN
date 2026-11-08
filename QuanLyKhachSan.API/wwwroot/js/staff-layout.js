
"use strict";

async function loadStaffLayout() {
    const container = document.getElementById("staffSidebar");

    if (!container || container.dataset.loaded === "true") return;

    container.dataset.loaded = "true";

    try {
        const response = await fetch("/layouts/staff-layout.html", {
            credentials: "same-origin",
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error("Không tải được giao diện nhân viên.");
        }

        container.innerHTML = await response.text();

        const currentPath = window.location.pathname.toLowerCase();

        container.querySelectorAll("nav a").forEach(link => {
            if (link.pathname.toLowerCase() === currentPath) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });

        const logout = container.querySelector("#staffLogout");

        if (logout) {
            logout.addEventListener("click", async () => {
                if (logout.disabled) return;

                logout.disabled = true;

                try {
                    const tokenResponse = await fetch(
                        "/api/account/csrf-token",
                        { credentials: "same-origin" }
                    );

                    if (!tokenResponse.ok) {
                        throw new Error("Không lấy được mã bảo vệ.");
                    }

                    const tokenData = await tokenResponse.json();

                    const result = await fetch("/api/account/logout", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "X-CSRF-TOKEN": tokenData.csrfToken
                        }
                    });

                    if (!result.ok) {
                        const error = await result.json().catch(() => ({}));
                        throw new Error(
                            error.message || "Đăng xuất thất bại."
                        );
                    }

                    window.location.replace("/login.html");
                } catch (error) {
                    logout.disabled = false;
                    alert(error.message || "Không thể đăng xuất.");
                }
            });
        }

        document.dispatchEvent(new CustomEvent("staff-layout-ready"));
    } catch (error) {
        container.dataset.loaded = "false";
        console.error(error);
    }
}

document.addEventListener("staff-shell-ready", loadStaffLayout);

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("staffSidebar")) {
        loadStaffLayout();
    }
});
