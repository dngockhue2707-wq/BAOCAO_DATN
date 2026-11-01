
"use strict";

document.addEventListener("staff-shell-ready", async () => {
    const container = document.getElementById("staffSidebar");
    if (!container) return;

    try {
        const response = await fetch("/layouts/staff-layout.html", {
            credentials: "same-origin",
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error("Không tải được menu nhân viên.");
        }

        container.innerHTML = await response.text();

        const path = location.pathname.toLowerCase();

        container.querySelectorAll("nav a").forEach(link => {
            if (link.pathname.toLowerCase() === path) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });

        const logout = container.querySelector("#staffLogout");

        logout?.addEventListener("click", async () => {
            if (!confirm("Bạn muốn đăng xuất?")) return;

            try {
                const token = await Staff.csrf();

                const result = await fetch("/api/account/logout", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "X-CSRF-TOKEN": token }
                });

                if (!result.ok) throw new Error("Đăng xuất thất bại.");

                location.href = "/login.html";
            } catch (error) {
                Staff.notify(error.message, true);
            }
        });
    } catch (error) {
        Staff.notify(error.message, true);
    }
});
