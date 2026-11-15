
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "reports") return;

    const app = document.getElementById("adminApp");
    if (!app) return;

    const currentYear = new Date().getFullYear();
    let content = null;
    let requestVersion = 0;
    let initialized = false;

    const money = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const number = value =>
        new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

    const shortMoney = value => {
        const amount = Number(value) || 0;

        if (amount >= 1000000000) {
            return `${number(amount / 1000000000)} tỷ`;
        }

        if (amount >= 1000000) {
            return `${(amount / 1000000).toLocaleString("vi-VN", {
                maximumFractionDigits: 1
            })} tr`;
        }

        if (amount >= 1000) {
            return `${(amount / 1000).toLocaleString("vi-VN", {
                maximumFractionDigits: 0
            })} nghìn`;
        }

        return number(amount);
    };

    function element(tag, className = "", text = null) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== null) node.textContent = String(text);

        return node;
    }

    function svgIcon(name) {
        const paths = {
            money: `
                <path d="M7 7h10l3 5v8H4v-8l3-5Z"/>
                <path d="M8 7V4h8v3M4 12h16"/>
                <path d="M12 14v4m-2-3h4"/>
            `,
            receipt: `
                <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/>
                <path d="M9 8h6M9 12h6M9 16h4"/>
            `,
            calendar: `
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <path d="M8 3v4M16 3v4M3 10h18M8 15h4"/>
            `,
            check: `
                <circle cx="12" cy="12" r="9"/>
                <path d="m8 12 3 3 5-6"/>
            `,
            cancel: `
                <circle cx="12" cy="12" r="9"/>
                <path d="m9 9 6 6m0-6-6 6"/>
            `,
            chart: `
                <path d="M4 20V5M4 20h17"/>
                <path d="m7 15 4-5 4 2 5-7"/>
                <path d="M17 5h3v3"/>
            `,
            bed: `
                <path d="M3 19v-8h18v8M3 16h18"/>
                <path d="M5 11V6h14v5M5 19v2M19 19v2"/>
                <path d="M7 9h4m2 0h4"/>
            `,
            door: `
                <rect x="6" y="3" width="12" height="18" rx="1"/>
                <path d="M14 12h.01"/>
            `
        };

        const holder = element("span", "re-icon");
        holder.innerHTML = `
            <svg viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="1.8"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 aria-hidden="true">
                ${paths[name] || paths.chart}
            </svg>
        `;
        holder.setAttribute("aria-hidden", "true");

        return holder;
    }

    function createKpi(title, value, icon, className = "") {
        const card = element("article", `re-kpi ${className}`);

        const top = element("div", "re-kpi-top");
        top.append(
            svgIcon(icon),
            element("span", "re-kpi-title", title)
        );

        card.append(
            top,
            element("strong", "re-kpi-value", value)
        );

        return card;
    }

    function createOverview(data, year) {
        const overview = element("section", "re-overview");

        const main = element("article", "re-main-revenue");

        const mainText = element("div", "re-main-revenue-content");
        const label = element("div", "re-main-label");

        label.append(
            svgIcon("money"),
            element("span", "", "Doanh thu đã thu")
        );

        mainText.append(
            label,
            element(
                "strong",
                "re-main-number",
                money(data.receivedAmount)
            ),
            element(
                "p",
                "re-main-caption",
                `Số tiền đã thu được ghi nhận trong năm ${year}`
            )
        );

        const ornament = element("div", "re-main-ornament");
        ornament.setAttribute("aria-hidden", "true");

        main.append(mainText, ornament);

        overview.append(
            main,
            createKpi(
                "Tổng giá trị hóa đơn",
                money(data.invoicedAmount),
                "receipt",
                "re-kpi-invoice"
            ),
            createKpi(
                "Tổng lượt đặt phòng",
                number(data.totalBookings),
                "calendar"
            ),
            createKpi(
                "Đơn đã trả phòng",
                number(data.completedBookings),
                "check",
                "re-kpi-success"
            ),
            createKpi(
                "Đơn đã hủy",
                number(data.cancelledBookings),
                "cancel",
                "re-kpi-cancel"
            )
        );

        return overview;
    }

    function panel(title, description = "", icon = "chart") {
        const box = element("section", "re-panel");

        const heading = element("div", "re-panel-heading");
        const titleGroup = element("div", "re-panel-title");

        titleGroup.append(
            svgIcon(icon),
            element("h2", "", title)
        );

        heading.appendChild(titleGroup);

        if (description) {
            box.appendChild(heading);
            box.appendChild(element("p", "re-panel-description", description));
        } else {
            box.appendChild(heading);
        }

        return { box, heading };
    }

    function niceMaximum(max) {
        if (max <= 0) return 4;

        const roughStep = max / 4;
        const power = 10 ** Math.floor(Math.log10(roughStep));
        const fraction = roughStep / power;

        const niceFraction = fraction <= 1
            ? 1
            : fraction <= 2
                ? 2
                : fraction <= 2.5
                    ? 2.5
                    : fraction <= 5
                        ? 5
                        : 10;

        const step = niceFraction * power;

        return step * Math.ceil(max / step);
    }

    function makeLinePath(points) {
        if (!points.length) return "";

        if (points.length === 1) {
            return `M ${points[0].x} ${points[0].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];

            const middle = (current.x + next.x) / 2;

            path += ` C ${middle} ${current.y}, ` +
                `${middle} ${next.y}, ${next.x} ${next.y}`;
        }

        return path;
    }

    function svgNode(tag, attributes = {}, textValue = null) {
        const node = document.createElementNS(
            "http://www.w3.org/2000/svg",
            tag
        );

        Object.entries(attributes).forEach(([key, value]) => {
            node.setAttribute(key, String(value));
        });

        if (textValue !== null) {
            node.textContent = String(textValue);
        }

        return node;
    }

    function createLineChart(monthly, year) {
        const { box, heading } = panel(
            `Doanh thu theo tháng - ${year}`,
            "",
            "chart"
        );

        box.classList.add("re-chart-panel");

        const legend = element("div", "re-legend");

        [
            ["re-legend-invoice", "Giá trị hóa đơn"],
            ["re-legend-received", "Tiền đã thu"]
        ].forEach(([colorClass, label]) => {
            const item = element("span");
            item.append(
                element("i", colorClass),
                element("span", "", label)
            );
            legend.appendChild(item);
        });

        heading.appendChild(legend);

        const months = Array.from({ length: 12 }, (_, index) => {
            const monthNumber = index + 1;

            const item = monthly.find(
                x => Number(x.month) === monthNumber
            );

            return {
                month: monthNumber,
                invoice: Number(item?.invoiceAmount) || 0,
                received: Number(item?.receivedAmount) || 0
            };
        });

        const maximum = niceMaximum(Math.max(
            0,
            ...months.map(x => x.invoice),
            ...months.map(x => x.received)
        ));

        const width = 1040;
        const height = 322;
        const left = 89;
        const right = 22;
        const top = 22;
        const bottom = 43;

        const plotWidth = width - left - right;
        const plotHeight = height - top - bottom;
        const baseline = top + plotHeight;

        const x = index => left + index * plotWidth / 11;
        const y = value => top + plotHeight -
            Math.max(0, value) / maximum * plotHeight;

        const invoicePoints = months.map((month, index) => ({
            x: x(index),
            y: y(month.invoice)
        }));

        const receivedPoints = months.map((month, index) => ({
            x: x(index),
            y: y(month.received)
        }));

        const svg = svgNode("svg", {
            viewBox: `0 0 ${width} ${height}`,
            role: "img",
            "aria-label": `Biểu đồ đường doanh thu 12 tháng năm ${year}`,
            preserveAspectRatio: "xMidYMid meet"
        });

        const defs = svgNode("defs");
        const gradient = svgNode("linearGradient", {
            id: "reChartGradient",
            x1: "0",
            y1: "0",
            x2: "0",
            y2: "1"
        });

        gradient.append(
            svgNode("stop", {
                offset: "0%",
                "stop-color": "#719075",
                "stop-opacity": ".3"
            }),
            svgNode("stop", {
                offset: "100%",
                "stop-color": "#719075",
                "stop-opacity": ".02"
            })
        );

        defs.appendChild(gradient);
        svg.appendChild(defs);

        for (let i = 0; i <= 4; i++) {
            const value = maximum / 4 * i;
            const position = y(value);

            svg.appendChild(svgNode("line", {
                x1: left,
                y1: position,
                x2: width - right,
                y2: position,
                class: "re-chart-gridline"
            }));

            svg.appendChild(svgNode("text", {
                x: left - 14,
                y: position + 4,
                "text-anchor": "end",
                class: "re-chart-axis-label"
            }, shortMoney(value)));
        }

        months.forEach((month, index) => {
            const px = x(index);

            svg.appendChild(svgNode("text", {
                x: px,
                y: height - 12,
                "text-anchor": "middle",
                class: "re-chart-axis-label"
            }, String(month.month).padStart(2, "0")));
        });

        const invoicePath = makeLinePath(invoicePoints);
        const receivedPath = makeLinePath(receivedPoints);

        svg.appendChild(svgNode("path", {
            d: `${receivedPath} L ${x(11)} ${baseline} ` +
                `L ${x(0)} ${baseline} Z`,
            fill: "url(#reChartGradient)"
        }));

        svg.appendChild(svgNode("path", {
            d: invoicePath,
            class: "re-chart-line re-chart-invoice"
        }));

        svg.appendChild(svgNode("path", {
            d: receivedPath,
            class: "re-chart-line re-chart-received"
        }));

        [
            {
                points: invoicePoints,
                key: "invoice",
                name: "Giá trị hóa đơn",
                className: "re-chart-point-invoice"
            },
            {
                points: receivedPoints,
                key: "received",
                name: "Tiền đã thu",
                className: "re-chart-point-received"
            }
        ].forEach(series => {
            series.points.forEach((point, index) => {
                const circle = svgNode("circle", {
                    cx: point.x,
                    cy: point.y,
                    r: 4,
                    class: series.className
                });

                circle.appendChild(svgNode(
                    "title",
                    {},
                    `Tháng ${index + 1} - ${series.name}: ` +
                        money(months[index][series.key])
                ));

                svg.appendChild(circle);
            });
        });

        const scroll = element("div", "re-chart-scroll");
        scroll.appendChild(svg);
        box.appendChild(scroll);

        return box;
    }

    function createStatusPanel(title, rows, icon, variant) {
        const { box } = panel(title, "", icon);
        box.classList.add("re-status-panel", variant);

        const items = Array.isArray(rows) ? rows : [];
        const total = items.reduce(
            (sum, item) => sum + (Number(item.count) || 0),
            0
        );

        const table = element("table", "re-status-table");
        const thead = element("thead");
        const header = element("tr");

        ["Trạng thái", "Số lượng", "Tỷ lệ"].forEach(value => {
            header.appendChild(element("th", "", value));
        });

        thead.appendChild(header);

        const tbody = element("tbody");

        if (!items.length) {
            const row = element("tr");
            const cell = element("td", "", "Chưa có dữ liệu");
            cell.colSpan = 3;
            row.appendChild(cell);
            tbody.appendChild(row);
        }

        items.forEach(item => {
            const count = Number(item.count) || 0;
            const percentage = total > 0
                ? count / total * 100
                : 0;

            const row = element("tr");

            const nameCell = element("td", "", item.status || "—");
            const countCell = element("td", "", number(count));

            const percentageCell = element("td");
            const percentageWrap = element("div", "re-percentage");

            const bar = element("div", "re-status-track");
            const fill = element("div", "re-status-fill");

            fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
            bar.appendChild(fill);

            percentageWrap.append(
                bar,
                element(
                    "span",
                    "",
                    `${Math.round(percentage)}%`
                )
            );

            percentageCell.appendChild(percentageWrap);
            row.append(nameCell, countCell, percentageCell);
            tbody.appendChild(row);
        });

        table.append(thead, tbody);

        const wrapper = element("div", "re-status-table-wrapper");
        wrapper.appendChild(table);
        box.appendChild(wrapper);

        return box;
    }

    function createMonthlyTable(monthly) {
        const { box } = panel(
            "Bảng doanh thu chi tiết",
            "Số liệu từng tháng được tổng hợp từ hệ thống",
            "receipt"
        );

        box.classList.add("re-monthly-panel");

        const wrapper = element("div", "re-monthly-scroll");
        const table = element("table", "re-monthly-table");

        const thead = element("thead");
        const header = element("tr");

        ["Tháng", "Giá trị hóa đơn", "Tiền đã thu"]
            .forEach(value => {
                header.appendChild(element("th", "", value));
            });

        thead.appendChild(header);

        const tbody = element("tbody");

        for (let month = 1; month <= 12; month++) {
            const item = monthly.find(
                x => Number(x.month) === month
            );

            const row = element("tr");

            row.append(
                element("td", "", `Tháng ${month}`),
                element("td", "", money(item?.invoiceAmount)),
                element(
                    "td",
                    "re-received-cell",
                    money(item?.receivedAmount)
                )
            );

            tbody.appendChild(row);
        }

        table.append(thead, tbody);
        wrapper.appendChild(table);
        box.appendChild(wrapper);

        return box;
    }

    function buildDashboard(data, year) {
        const dashboard = element("div", "re-dashboard");

        const description = element("p", "re-description",
            "Tổng hợp tình hình đặt phòng và doanh thu khách sạn.");

        const overview = createOverview(data, year);

        const monthly = Array.isArray(data.monthly)
            ? data.monthly
            : [];

        const chart = createLineChart(monthly, year);

        const yearField = element("div", "re-year-field");
        const yearLabel = element("label", "", "Năm thống kê");
        const yearSelect = element("select");

        yearSelect.id = "reYearSelect";
        yearLabel.htmlFor = yearSelect.id;

        for (let i = 0; i < 5; i++) {
            const optionYear = currentYear - i;

            yearSelect.add(
                new Option(String(optionYear), String(optionYear))
            );
        }

        yearSelect.value = String(year);
        yearSelect.addEventListener("change", () => {
            loadReport(Number(yearSelect.value));
        });

        yearField.append(yearLabel, yearSelect);

        chart.querySelector(".re-panel-heading")
            .appendChild(yearField);

        const statuses = element("div", "re-status-grid");

        statuses.append(
            createStatusPanel(
                "Thống kê trạng thái đặt phòng",
                data.bookingStatuses,
                "bed",
                "re-booking-panel"
            ),
            createStatusPanel(
                "Thống kê trạng thái phòng",
                data.roomStatuses,
                "door",
                "re-room-panel"
            )
        );

        dashboard.append(
            description,
            overview,
            chart,
            statuses,
            createMonthlyTable(monthly)
        );

        return dashboard;
    }

    async function requestReport(year) {
        const response = await fetch(
            `/api/admin/reports?year=${encodeURIComponent(year)}`,
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error("Không có quyền xem báo cáo.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || "Không thể tải dữ liệu báo cáo."
            );
        }

        return data;
    }

    async function loadReport(year) {
        if (!content) return;

        const version = ++requestVersion;
        const existingSelect = content.querySelector("#reYearSelect");

        if (existingSelect) existingSelect.disabled = true;

        let message = content.querySelector(".re-report-message");

        if (!message) {
            message = element("p", "re-report-message");
            content.prepend(message);
        }

        message.textContent = "Đang tải số liệu doanh thu...";

        try {
            const data = await requestReport(year);

            if (version !== requestVersion) return;

            content.replaceChildren(buildDashboard(data, year));
        } catch (error) {
            if (version !== requestVersion) return;

            message.classList.add("error");
            message.textContent = error.message;

            if (existingSelect?.isConnected) {
                existingSelect.disabled = false;
            }
        }
    }

    function initialize() {
        if (initialized) return true;

        const main = app.querySelector(".admin-main");
        if (!main) return false;

        const originalStats = main.querySelector(".admin-stats");
        if (!originalStats) return false;

        content = originalStats.parentElement;
        initialized = true;

        const heading = main.querySelector(".admin-topbar h1");
        if (heading) heading.textContent = "Doanh thu";

        loadReport(currentYear);
        return true;
    }

    if (!initialize()) {
        const observer = new MutationObserver(() => {
            if (initialize()) {
                observer.disconnect();
            }
        });

        observer.observe(app, {
            childList: true,
            subtree: true
        });
    }
});
