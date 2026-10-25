
"use strict";

const authNavigation = {
    initializedHeader: null
};

function setNavigationVisibility(header, role) {
    const elements = header.querySelectorAll("[data-auth]");

    elements.forEach(element => {
        const permission = element.dataset.auth;

        let visible = false;

        switch (permission) {
            case "guest":
                visible = role === "Guest";
                break;

            case "customer":
                visible = role === "Customer";
                break;

            case "admin":
                visible = role === "Admin";
                break;

            case "staff":
                visible = role === "Staff";
                break;

            case "logged-in":
                visible = role !== "Guest";
                break;

            default:
                visible = false;
                break;
        }

        element.hidden = !visible;
    });
}

async function getCurrentAccount() {
    try {
        const response = await fetch("/api/account/profile", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            return {
                role: "Guest",
                username: ""
            };
        }

        const data = await response.json();

        const allowedRoles = ["Admin", "Staff", "Customer"];

        return {
            role: allowedRoles.includes(data.role)
                ? data.role
                : "Guest",
            username: data.username || ""
        };
    } catch (error) {
        console.error("Không thể kiểm tra tài khoản:", error);

        return {
            role: "Guest",
            username: ""
        };
    }
}

async function logoutAccount() {
    try {
        const tokenResponse = await fetch("/api/account/csrf-token", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!tokenResponse.ok) {
            throw new Error("Không thể lấy mã bảo vệ.");
        }

        const tokenData = await tokenResponse.json();

        const response = await fetch("/api/account/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRF-TOKEN": tokenData.csrfToken
            }
        });

        if (!response.ok) {
            throw new Error("Không thể đăng xuất.");
        }

        window.location.replace("/");
    } catch (error) {
        alert(error.message || "Đăng xuất thất bại.");
    }
}

async function initializeAccountNavigation() {
    const header = document.getElementById("site-header");

    if (!header || !header.querySelector(".site-nav")) {
        return;
    }

    if (authNavigation.initializedHeader === header.querySelector(".site-header")) {
        return;
    }

    authNavigation.initializedHeader = header.querySelector(".site-header");

    const protectedItems = header.querySelectorAll("[data-auth]");

    protectedItems.forEach(element => {
        element.hidden = true;
    });

    const logoutButton = header.querySelector(
        '[data-auth="logged-in"]'
    );

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutAccount);
    }

    const account = await getCurrentAccount();

    if (authNavigation.initializedHeader !== header.querySelector(".site-header")) {
        return;
    }

    setNavigationVisibility(header, account.role);
}

document.addEventListener(
    "dnk:header-loaded",
    initializeAccountNavigation
);

function initializeAccountNavigationOnReady() {
    const header = document.getElementById("site-header");

    if (header && header.querySelector(".site-header")) {
        initializeAccountNavigation();
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeAccountNavigationOnReady
    );
} else {
    initializeAccountNavigationOnReady();
}
