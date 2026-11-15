
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "bookings") {
        return;
    }

    const app =
        document.getElementById("adminApp") ||
        document.getElementById("staffApp");

    if (!app) return;

    const tabs = [
        {
            title: "Danh sách đặt phòng",
            label: "Đơn đặt phòng"
        },
        {
            title: "Yêu cầu hủy phòng",
            label: "Yêu cầu hủy"
        },
        {
            title: "Giao dịch hoàn cọc",
            label: "Hoàn cọc"
        }
    ];

    let activeTab = 0;
    let scheduled = false;

    function normalize(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase("vi-VN");
    }

    function findHeading(title) {
        const headings = app.querySelectorAll(
            "h1, h2, h3, h4, h5, h6, " +
            ".admin-panel-title, .staff-panel-title"
        );

        return Array.from(headings).find(
            node =>
                normalize(node.textContent) ===
                normalize(title)
        ) || null;
    }

    function commonAncestor(nodes) {
        if (!nodes.length) return null;

        let current = nodes[0];

        while (current && current !== app.parentElement) {
            if (
                nodes.every(node =>
                    current.contains(node)
                )
            ) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    function childUnder(parent, descendant) {
        let current = descendant;

        while (
            current &&
            current.parentElement !== parent
        ) {
            current = current.parentElement;
        }

        return current &&
            current.parentElement === parent
            ? current
            : null;
    }

    function buildStyles() {
        if (
            document.getElementById(
                "ks-booking-tab-styles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");
        style.id = "ks-booking-tab-styles";

        style.textContent = `
            .ks-booking-tabs {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
                margin: 0 0 22px;
                padding: 9px;
                background: #f3ede6;
                border: 1px solid #e5d8c9;
                border-radius: 12px;
            }

            .ks-booking-tab {
                appearance: none;
                border: 1px solid transparent;
                background: transparent;
                color: #6b5544;
                border-radius: 9px;
                padding: 12px 19px;
                font: inherit;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition:
                    background .2s ease,
                    color .2s ease,
                    border-color .2s ease;
            }

            .ks-booking-tab:hover {
                background: #eadccd;
                color: #785324;
            }

            .ks-booking-tab[aria-selected="true"] {
                background: #926024;
                color: #fff;
                border-color: #926024;
            }

            .ks-booking-tab:focus-visible {
                outline: 3px solid #c6a16e;
                outline-offset: 2px;
            }

            .ks-booking-tab-panel {
                min-width: 0;
            }

            .ks-booking-tab-panel[hidden] {
                display: none !important;
            }

            @media (max-width: 700px) {
                .ks-booking-tabs {
                    gap: 6px;
                    padding: 7px;
                }

                .ks-booking-tab {
                    flex: 1 1 auto;
                    padding: 11px 12px;
                    font-size: 13px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function installTabs() {
        const headings = tabs.map(item =>
            findHeading(item.title)
        );

        // Cho JavaScript Admin/Staff tao du 3 bang.
        if (headings.some(node => !node)) {
            return;
        }

        const parent = commonAncestor(headings);

        if (!parent) return;

        const panels = headings.map(heading =>
            childUnder(parent, heading)
        );

        if (
            panels.some(panel => !panel) ||
            new Set(panels).size !== 3
        ) {
            return;
        }

        // Neu da tao tabs cho cac panel hien tai,
        // khong chen lai va khong tao trung.
        const existing = Array.from(parent.children)
            .find(node =>
                node.classList?.contains(
                    "ks-booking-tabs"
                )
            );

        if (existing) {
            const samePanels = panels.every(
                (panel, index) =>
                    panel.id ===
                    `ks-booking-panel-${index}`
            );

            if (samePanels) {
                return;
            }

            existing.remove();
        }

        buildStyles();

        const nav = document.createElement("div");

        nav.className = "ks-booking-tabs";
        nav.setAttribute("role", "tablist");
        nav.setAttribute(
            "aria-label",
            "Quản lý đặt phòng và hoàn cọc"
        );

        const buttons = [];

        function selectTab(index, focus = false) {
            if (index < 0 || index >= tabs.length) {
                return;
            }

            activeTab = index;

            panels.forEach((panel, i) => {
                const selected = i === activeTab;

                panel.hidden = !selected;
                panel.classList.add(
                    "ks-booking-tab-panel"
                );
            });

            buttons.forEach((button, i) => {
                const selected = i === activeTab;

                button.setAttribute(
                    "aria-selected",
                    String(selected)
                );

                button.tabIndex = selected ? 0 : -1;
            });

            if (focus) {
                buttons[index].focus();
            }
        }

        tabs.forEach((item, index) => {
            const tabButton =
                document.createElement("button");

            tabButton.type = "button";
            tabButton.className = "ks-booking-tab";
            tabButton.id = `ks-booking-tab-${index}`;

            tabButton.textContent = item.label;

            tabButton.setAttribute("role", "tab");
            tabButton.setAttribute(
                "aria-controls",
                `ks-booking-panel-${index}`
            );

            tabButton.addEventListener(
                "click",
                () => selectTab(index)
            );

            tabButton.addEventListener(
                "keydown",
                event => {
                    let next = activeTab;

                    if (event.key === "ArrowRight") {
                        next =
                            (activeTab + 1) % tabs.length;
                    } else if (
                        event.key === "ArrowLeft"
                    ) {
                        next =
                            (activeTab - 1 + tabs.length) %
                            tabs.length;
                    } else if (
                        event.key === "Home"
                    ) {
                        next = 0;
                    } else if (
                        event.key === "End"
                    ) {
                        next = tabs.length - 1;
                    } else {
                        return;
                    }

                    event.preventDefault();
                    selectTab(next, true);
                }
            );

            buttons.push(tabButton);
            nav.appendChild(tabButton);

            const panel = panels[index];

            panel.id =
                `ks-booking-panel-${index}`;

            panel.setAttribute(
                "role",
                "tabpanel"
            );

            panel.setAttribute(
                "aria-labelledby",
                tabButton.id
            );
        });

        parent.insertBefore(nav, panels[0]);

        selectTab(activeTab);
    }

    function scheduleInstall() {
        if (scheduled) return;

        scheduled = true;

        queueMicrotask(() => {
            scheduled = false;
            installTabs();
        });
    }

    // Staff tao lai cac bang sau khi duyet/tu choi.
    // Observer giup tao lai tab ma giu tab dang xem.
    const observer = new MutationObserver(() => {
        scheduleInstall();
    });

    observer.observe(app, {
        childList: true,
        subtree: true
    });

    scheduleInstall();
});
