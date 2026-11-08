
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("customerSidebar");

    if (!sidebar) return;

    const path = window.location.pathname.toLowerCase();
    const isProfile = path === "/profile.html";

    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");

    const tab = ["personal", "security", "preferences"].includes(requestedTab)
        ? requestedTab
        : "personal";

    const header = document.createElement("div");
    header.className = "profile-user-card";

    header.innerHTML = `
        <div class="profile-avatar" aria-hidden="true">
            <span id="profileInitial">D</span>
        </div>

        <h2 id="profileDisplayName">
            Tài khoản của tôi
        </h2>

        <p id="profileDisplayEmail">
            DNK Hotel
        </p>

        <span class="profile-member-label">
            KHÁCH HÀNG
        </span>
    `;

    const nav = document.createElement("nav");
    nav.className = "profile-navigation";
    nav.setAttribute("aria-label", "Menu tài khoản");

    const items = [
        {
            label: "Thông tin cá nhân",
            icon: "♙",
            tab: "personal"
        },
        {
            label: "Đổi mật khẩu",
            icon: "◇",
            tab: "security"
        },
        {
            label: "Sở thích lưu trú",
            icon: "♡",
            tab: "preferences"
        },
        {
            label: "Đơn đặt phòng",
            icon: "▤",
            href: "/my-bookings.html"
        },
        {
            label: "Đánh giá phòng",
            icon: "☆",
            href: "/reviews.html"
        },
        {
            label: "Phòng gợi ý cho bạn",
            icon: "✦",
            href: "/recommendations.html"
        }
    ];

    items.forEach(item => {
        const active = item.tab
            ? isProfile && tab === item.tab
            : path === item.href;

        const control = item.tab && isProfile
            ? document.createElement("button")
            : document.createElement("a");

        control.className = "profile-nav-item";

        if (active) {
            control.classList.add("active");
        }

        if (control.tagName === "BUTTON") {
            control.type = "button";
            control.dataset.profileTab = item.tab;

            const panelIds = {
                personal: "profilePersonalPanel",
                security: "profileSecurityPanel",
                preferences: "profilePreferencesPanel"
            };

            control.setAttribute(
                "aria-controls",
                panelIds[item.tab]
            );

            control.setAttribute(
                "aria-expanded",
                String(active)
            );

            control.addEventListener("click", () => {
                const url = new URL(window.location.href);

                url.searchParams.set("tab", item.tab);

                history.replaceState(null, "", url);
            });

        } else {
            control.href = item.tab
                ? `/profile.html?tab=${encodeURIComponent(item.tab)}`
                : item.href;

            if (active) {
                control.setAttribute("aria-current", "page");
            }
        }

        const icon = document.createElement("span");
        icon.textContent = item.icon;
        icon.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.textContent = item.label;

        control.append(icon, label);

        nav.appendChild(control);
    });

    const bottom = document.createElement("div");
    bottom.className = "profile-sidebar-bottom";

    bottom.innerHTML = `
        <span>DNK HOTEL</span>

        <p>
            Tận hưởng hành trình lưu trú
            theo phong cách riêng của bạn.
        </p>
    `;

    sidebar.replaceChildren(header, nav, bottom);

    async function loadCustomerInfo() {
        try {
            const response = await fetch("/api/profile", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (response.status === 401) {
                window.location.replace("/login.html");
                return;
            }

            if (!response.ok) {
                throw new Error(
                    "Không tải được thông tin khách hàng."
                );
            }

            const data = await response.json();

            const displayName =
                document.getElementById("profileDisplayName");

            const displayEmail =
                document.getElementById("profileDisplayEmail");

            const initial =
                document.getElementById("profileInitial");

            const name = String(
                data.fullName ||
                data.username ||
                "Khách hàng DNK Hotel"
            ).trim();

            const email = String(
                data.email ||
                "Thành viên DNK Hotel"
            ).trim();

            if (displayName) {
                displayName.textContent = name;
            }

            if (displayEmail) {
                displayEmail.textContent = email;
            }

            if (initial) {
                initial.textContent = name
                    .charAt(0)
                    .toLocaleUpperCase("vi-VN");
            }

        } catch (error) {
            console.error(
                "Không thể tải thông tin khách hàng:",
                error
            );
        }
    }

    loadCustomerInfo();
});
