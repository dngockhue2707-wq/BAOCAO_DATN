
"use strict";

async function loadComponent(selector, path) {
    const container = document.querySelector(selector);

    if (!container) {
        return;
    }

    try {
        const response = await fetch(path, {
            credentials: "same-origin",
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${path}`);
        }

        container.innerHTML = await response.text();

        if (selector === "#site-header") {
            highlightActiveMenu();
            initializeRoomDropdown();

            document.dispatchEvent(
                new CustomEvent("dnk:header-loaded")
            );
        }
    } catch (error) {
        console.error("Không thể tải giao diện:", error);

        container.textContent =
            "Không thể tải thành phần giao diện.";
    }
}

function highlightActiveMenu() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll(
        "#site-header .site-nav a"
    );

    links.forEach(link => {
        const linkPath = new URL(
            link.href,
            window.location.origin
        ).pathname;

        const isHome =
            (currentPath === "/" || currentPath === "/index.html") &&
            linkPath === "/";

        const isActive = isHome || currentPath === linkPath;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    const roomDropdown = document.querySelector(
        "#site-header .site-dropdown"
    );

    if (roomDropdown) {
        const roomPages = [
            "/rooms.html",
            "/room-detail.html",
            "/booking.html"
        ];

        const active = roomPages.includes(currentPath);

        roomDropdown.classList.toggle("active", active);

        const mainLink = roomDropdown.querySelector(
            ".site-dropdown-link"
        );

        if (mainLink) {
            mainLink.classList.toggle("active", active);
        }
    }
}

function initializeRoomDropdown() {
    const dropdown = document.querySelector(
        "#site-header .site-dropdown"
    );

    if (!dropdown) {
        return;
    }

    const toggle = dropdown.querySelector(
        ".site-dropdown-toggle"
    );

    const menu = dropdown.querySelector(
        ".site-dropdown-menu"
    );

    if (!toggle || !menu) {
        return;
    }

    function setOpen(open) {
        dropdown.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", event => {
        event.stopPropagation();

        const isOpen = dropdown.classList.contains("open");

        setOpen(!isOpen);
    });

    document.addEventListener("click", event => {
        if (!dropdown.contains(event.target)) {
            setOpen(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            setOpen(false);
            toggle.focus();
        }
    });

    dropdown.addEventListener("focusout", event => {
        if (!dropdown.contains(event.relatedTarget)) {
            setOpen(false);
        }
    });

    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            setOpen(false);
        });
    });
}

function initializeLayout() {
    Promise.all([
        loadComponent(
            "#site-header",
            "/components/header.html"
        ),
        loadComponent(
            "#site-footer",
            "/components/footer.html"
        )
    ]).catch(error => {
        console.error("Không thể khởi tạo giao diện:", error);
    });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeLayout
    );
} else {
    initializeLayout();
}
