
"use strict";

const unifiedAdminPages = new Set([
    "rooms",
    "bookings",
    "customers",
    "services"
]);

function setupUnifiedAdminStyle() {
    const page = document.body.dataset.page;

    if (!unifiedAdminPages.has(page)) {
        return;
    }

    const oldStyles = [
        "admin-luxury-pages.css",
        "admin-rooms-luxury.css",
        "admin-services-luxury.css",
        "admin-bookings-luxury.css",
        "admin-showcase.css"
    ];

    document.querySelectorAll(
        'link[rel="stylesheet"]'
    ).forEach(link => {
        const filename = link.href.split("/").pop().split("?")[0];

        if (oldStyles.includes(filename)) {
            link.remove();
        }
    });

    if (
        !document.querySelector(
            'link[href="/css/admin-unified.css"]'
        )
    ) {
        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = "/css/admin-unified.css";

        document.head.appendChild(link);
    }
}

async function loadAdminLayout() {
    const container = document.getElementById("adminSidebar");

    if (!container || container.dataset.loaded === "true") {
        return;
    }

    container.dataset.loaded = "true";

    try {
        const response = await fetch(
            "/layouts/admin-layout.html",
            {
                credentials: "same-origin",
                cache: "no-cache"
            }
        );

        if (!response.ok) {
            throw new Error(
                "Không tải được giao diện quản trị."
            );
        }

        container.innerHTML = await response.text();

        const currentPath = location.pathname.toLowerCase();

        container.querySelectorAll(
            ".admin-sidebar a"
        ).forEach(link => {
            if (link.pathname.toLowerCase() === currentPath) {
                link.classList.add("active");

                link.setAttribute(
                    "aria-current",
                    "page"
                );

                const group = link.closest(
                    ".admin-nav-group"
                );

                if (group) {
                    group.open = true;
                }
            }
        });

        document.dispatchEvent(
            new CustomEvent("admin-layout-ready")
        );
    } catch (error) {
        container.dataset.loaded = "false";

        console.error(error);

        container.textContent =
            "Không tải được menu quản trị.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupUnifiedAdminStyle();
    loadAdminLayout();
});

document.addEventListener(
    "admin-shell-ready",
    () => {
        setupUnifiedAdminStyle();
        loadAdminLayout();
    }
);

document.addEventListener("click", async event => {
    const button = event.target.closest(
        "#adminSidebar #logoutButton"
    );

    if (!button || button.disabled) {
        return;
    }

    button.disabled = true;

    try {
        const tokenResponse = await fetch(
            "/api/account/csrf-token",
            {
                credentials: "same-origin"
            }
        );

        if (!tokenResponse.ok) {
            throw new Error(
                "Không lấy được mã bảo vệ."
            );
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.csrfToken) {
            throw new Error(
                "Mã bảo vệ không hợp lệ."
            );
        }

        const response = await fetch(
            "/api/account/logout",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-TOKEN": tokenData.csrfToken
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Không thể đăng xuất."
            );
        }

        window.location.replace("/login.html");
    } catch (error) {
        alert(error.message);
        button.disabled = false;
    }
});
