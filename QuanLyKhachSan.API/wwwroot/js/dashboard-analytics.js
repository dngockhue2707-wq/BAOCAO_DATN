
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    if (!$("luxRevenueChart")) return;

    const money = value =>
        new Intl.NumberFormat("vi-VN").format(
            Math.round(Number(value) || 0)
        ) + " ₫";

    const number = value =>
        new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

    const today = new Date();
    const currentYear = today.getFullYear();

    let mode = "day";
    let requestVersion = 0;

    const dayInput = $("luxSelectedDay");
    const weekInput = $("luxSelectedWeek");
    const monthInput = $("luxSelectedMonth");
    const yearInput = $("luxSelectedYear");

    function dateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function fullDate(value) {
        if (!value) return "—";
        const [year, month, day] = value.split("-");
        return `${day}/${month}/${year}`;
    }

    function shortDate(value) {
        if (!value) return "—";
        const [, month, day] = value.split("-");
        return `${day}/${month}`;
    }

    function weekRange(value) {
        const selected = parseDate(value);
        const weekday = selected.getDay();
        const offset = weekday === 0 ? -6 : 1 - weekday;

        const monday = addDays(selected, offset);
        const sunday = addDays(monday, 6);

        return {
            from: dateString(monday),
            to: dateString(sunday)
        };
    }

    function monthRange(value) {
        const [year, month] = value.split("-").map(Number);

        return {
            from: `${year}-${String(month).padStart(2, "0")}-01`,
            to: dateString(new Date(year, month, 0))
        };
    }

    async function api(url) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.replace("/login.html");
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (response.status === 403) {
            throw new Error("Không có quyền xem báo cáo.");
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Không tải được dữ liệu (${response.status}).`
            );
        }

        return data;
    }

    function getDaily(from, to) {
        const params = new URLSearchParams({ from, to });

        return api(
            `/api/admin/dashboard-analytics?${params.toString()}`
        );
    }

    function getHourly(date) {
        return api(
            `/api/admin/dashboard-analytics/hourly?date=${encodeURIComponent(date)}`
        );
    }

    function getReport(year) {
        return api(
            `/api/admin/reports?year=${encodeURIComponent(year)}`
        );
    }

    function initializeFilters() {
        dayInput.value = dateString(today);
        weekInput.value = dateString(today);

        monthInput.value =
            `${currentYear}-${String(today.getMonth() + 1).padStart(2, "0")}`;

        for (let year = currentYear; year >= 2000; year--) {
            yearInput.add(
                new Option(`Năm ${year}`, String(year))
            );
        }
    }

    function showError(message) {
        $("luxReportError").textContent = message || "";
        $("luxReportError").hidden = !message;
    }

    function showLoading() {
        $("luxRevenueTotal").textContent = "—";
        $("luxSecondValue").textContent = "—";
        $("luxThirdValue").textContent = "—";

        $("luxRevenueChart").textContent =
            "Đang tải biểu đồ doanh thu...";
    }

    function setSummary(summary) {
        $("luxTotalLabel").textContent = summary.totalLabel;
        $("luxRevenueTotal").textContent = money(summary.total);
        $("luxPeriodLabel").textContent = summary.periodLabel;

        $("luxSecondLabel").textContent = summary.secondLabel;
        $("luxSecondValue").textContent = summary.secondValue;

        $("luxThirdLabel").textContent = summary.thirdLabel;
        $("luxThirdValue").textContent = summary.thirdValue;

        $("luxChartNote").textContent = summary.note;
    }

    function axisValue(value) {
        if (value === 0) return "0";

        if (value >= 1000000000) {
            return `${(value / 1000000000).toFixed(1)} tỷ`;
        }

        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)} tr`;
        }

        if (value >= 1000) {
            return `${Math.round(value / 1000)} nghìn`;
        }

        return number(Math.round(value));
    }

    function renderEmpty(message) {
        const container = $("luxRevenueChart");
        container.replaceChildren();

        const empty = document.createElement("div");
        empty.className = "lux-chart-empty";
        empty.textContent = message;

        container.appendChild(empty);
    }

    function renderChart(items) {
        const container = $("luxRevenueChart");
        container.replaceChildren();

        if (!items || items.length === 0) {
            renderEmpty("Không có dữ liệu doanh thu.");
            return;
        }

        const values = items.map(item =>
            Math.max(0, Number(item.amount) || 0)
        );

        if (values.every(value => value === 0)) {
            renderEmpty(
                "Không có giao dịch thanh toán trong thời gian đã chọn."
            );
            return;
        }

        const NS = "http://www.w3.org/2000/svg";

        const width = 1080;
        const height = 410;
        const left = 100;
        const right = 28;
        const top = 35;
        const bottom = 65;

        const plotWidth = width - left - right;
        const plotHeight = height - top - bottom;
        const maxValue = Math.max(1, ...values);

        const svg = document.createElementNS(NS, "svg");

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("role", "img");
        svg.setAttribute(
            "aria-label",
            "Biểu đồ doanh thu theo " + mode
        );

        function add(tag, attributes = {}, content) {
            const element = document.createElementNS(NS, tag);

            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, String(value));
            });

            if (content !== undefined) {
                element.textContent = String(content);
            }

            svg.appendChild(element);
            return element;
        }

        for (let i = 0; i <= 5; i++) {
            const y = top + i * plotHeight / 5;
            const amount = maxValue * (5 - i) / 5;

            add("line", {
                x1: left,
                x2: width - right,
                y1: y,
                y2: y,
                stroke: "#EAE3DA",
                "stroke-dasharray": "4 5"
            });

            add("text", {
                x: left - 12,
                y: y + 5,
                "text-anchor": "end",
                "font-size": 15,
                fill: "#897B6D"
            }, axisValue(amount));
        }

        const step = plotWidth / items.length;
        const barWidth = Math.min(72, step * 0.7);

        const labelEvery =
            mode === "day" || (mode === "month" && items.length > 20)
                ? 2
                : 1;

        items.forEach((item, index) => {
            const amount = values[index];
            const x = left + (index + 0.5) * step;

            const barHeight = amount > 0
                ? Math.max(3, amount / maxValue * plotHeight)
                : 0;

            if (barHeight > 0) {
                const rect = add("rect", {
                    x: x - barWidth / 2,
                    y: top + plotHeight - barHeight,
                    width: barWidth,
                    height: barHeight,
                    rx: Math.min(5, barWidth / 2),
                    fill: "#B18A59",
                    class: "lux-chart-bar"
                });

                const tooltip = document.createElementNS(NS, "title");

                tooltip.textContent =
                    `${item.fullLabel}: ${money(amount)}`;

                if (item.transactions !== undefined) {
                    tooltip.textContent +=
                        ` — ${number(item.transactions)} giao dịch`;
                }

                rect.appendChild(tooltip);
            }

            if (
                index % labelEvery === 0 ||
                index === items.length - 1
            ) {
                add("text", {
                    x,
                    y: height - 20,
                    "text-anchor": "middle",
                    "font-size": 15,
                    fill: "#897969"
                }, item.label);
            }
        });

        container.appendChild(svg);
    }

    async function loadDay() {
        const date = dayInput.value;

        if (!date) {
            throw new Error("Vui lòng chọn ngày.");
        }

        const data = await getHourly(date);
        const hourly = Array.isArray(data.hourly) ? data.hourly : [];

        const total = Number(data.totalReceived) || 0;
        const transactions = Number(data.successfulTransactions) || 0;

        const items = hourly.map(item => {
            const hour = String(item.hour).padStart(2, "0");

            return {
                label: `${hour}:00`,
                fullLabel: `${hour}:00–${hour}:59, ${fullDate(date)}`,
                amount: Number(item.amount) || 0,
                transactions: Number(item.transactions) || 0
            };
        });

        return {
            summary: {
                totalLabel: "Doanh thu trong ngày",
                total,
                periodLabel: fullDate(date),
                secondLabel: "Giao dịch thành công",
                secondValue: number(transactions),
                thirdLabel: "Trung bình mỗi giao dịch",
                thirdValue: money(
                    transactions ? total / transactions : 0
                ),
                note: "Doanh thu theo từng giờ, 00:00–23:00"
            },
            items
        };
    }

    async function loadWeek() {
        const value = weekInput.value;

        if (!value) {
            throw new Error("Vui lòng chọn ngày trong tuần.");
        }

        const range = weekRange(value);

        $("luxWeekDescription").textContent =
            `${fullDate(range.from)} – ${fullDate(range.to)}`;

        const data = await getDaily(range.from, range.to);
        const daily = Array.isArray(data.daily) ? data.daily : [];

        const total = Number(data.totalReceived) || 0;
        const transactions = Number(data.successfulTransactions) || 0;

        return {
            summary: {
                totalLabel: "Doanh thu trong tuần",
                total,
                periodLabel:
                    `${fullDate(range.from)} – ${fullDate(range.to)}`,
                secondLabel: "Giao dịch thành công",
                secondValue: number(transactions),
                thirdLabel: "Trung bình mỗi ngày",
                thirdValue: money(total / 7),
                note: "Doanh thu từng ngày từ thứ Hai đến Chủ nhật"
            },
            items: daily.map(item => ({
                label: shortDate(item.date),
                fullLabel: fullDate(item.date),
                amount: Number(item.amount) || 0,
                transactions: Number(item.transactions) || 0
            }))
        };
    }

    async function loadMonth() {
        const value = monthInput.value;

        if (!value) {
            throw new Error("Vui lòng chọn tháng.");
        }

        const range = monthRange(value);
        const data = await getDaily(range.from, range.to);
        const daily = Array.isArray(data.daily) ? data.daily : [];

        const total = Number(data.totalReceived) || 0;
        const transactions = Number(data.successfulTransactions) || 0;

        const [year, month] = value.split("-").map(Number);

        return {
            summary: {
                totalLabel: "Doanh thu trong tháng",
                total,
                periodLabel: `Tháng ${month}/${year}`,
                secondLabel: "Giao dịch thành công",
                secondValue: number(transactions),
                thirdLabel: "Trung bình mỗi ngày",
                thirdValue: money(
                    total / Math.max(1, daily.length)
                ),
                note: "Doanh thu theo từng ngày trong tháng"
            },
            items: daily.map(item => ({
                label: shortDate(item.date),
                fullLabel: fullDate(item.date),
                amount: Number(item.amount) || 0,
                transactions: Number(item.transactions) || 0
            }))
        };
    }

    async function loadYear() {
        const year = Number(yearInput.value);

        if (!year) {
            throw new Error("Vui lòng chọn năm.");
        }

        const data = await getReport(year);
        const monthly = Array.isArray(data.monthly) ? data.monthly : [];

        const items = Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const found = monthly.find(
                item => Number(item.month) === month
            );

            return {
                label: `T${month}`,
                fullLabel: `Tháng ${month}/${year}`,
                amount: Number(found?.receivedAmount) || 0
            };
        });

        const total = items.reduce(
            (sum, item) => sum + item.amount, 0
        );

        const activeMonths = items.filter(
            item => item.amount > 0
        ).length;

        return {
            summary: {
                totalLabel: "Doanh thu trong năm",
                total,
                periodLabel: `Năm ${year}`,
                secondLabel: "Giá trị hóa đơn",
                secondValue: money(data.invoicedAmount),
                thirdLabel: "Tháng có doanh thu",
                thirdValue: `${activeMonths}/12`,
                note: "Doanh thu đã thu theo 12 tháng"
            },
            items
        };
    }

    async function refresh() {
        const version = ++requestVersion;

        showError("");
        showLoading();

        try {
            let result;

            if (mode === "day") {
                result = await loadDay();
            } else if (mode === "week") {
                result = await loadWeek();
            } else if (mode === "month") {
                result = await loadMonth();
            } else {
                result = await loadYear();
            }

            if (version !== requestVersion) return;

            setSummary(result.summary);
            renderChart(result.items);

        } catch (error) {
            if (version !== requestVersion) return;

            $("luxRevenueChart").textContent =
                "Không tải được biểu đồ doanh thu.";

            showError(error.message);
        }
    }

    function switchMode(nextMode) {
        if (!["day", "week", "month", "year"].includes(nextMode)) {
            return;
        }

        mode = nextMode;

        document.querySelectorAll(".lux-mode").forEach(button => {
            const active = button.dataset.mode === mode;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        $("luxDayFilter").hidden = mode !== "day";
        $("luxWeekFilter").hidden = mode !== "week";
        $("luxMonthFilter").hidden = mode !== "month";
        $("luxYearFilter").hidden = mode !== "year";

        refresh();
    }

    function initializeEvents() {
        document.querySelectorAll(".lux-mode").forEach(button => {
            button.addEventListener("click", () => {
                switchMode(button.dataset.mode);
            });
        });

        dayInput.addEventListener("change", () => {
            if (mode === "day") refresh();
        });

        weekInput.addEventListener("change", () => {
            if (mode === "week") refresh();
        });

        monthInput.addEventListener("change", () => {
            if (mode === "month") refresh();
        });

        yearInput.addEventListener("change", () => {
            if (mode === "year") refresh();
        });
    }

    const roomColors = {
        "Trống": "#D7B47D",
        "Đang sử dụng": "#60442F",
        "Đang dọn": "#9CB6AF",
        "Bảo trì": "#C18E76",
        "Ngừng hoạt động": "#99918A"
    };

    async function loadRoomDetails() {
        const list = $("luxRoomStatusList");
        if (!list) return;

        try {
            const date = dateString(new Date());
            const data = await getDaily(date, date);

            const statuses = Array.isArray(data.roomStatuses)
                ? data.roomStatuses
                : [];

            list.replaceChildren();

            if (!statuses.length) {
                list.textContent = "Chưa có dữ liệu trạng thái phòng.";
                return;
            }

            const total = statuses.reduce(
                (sum, item) => sum + Number(item.count || 0),
                0
            );

            statuses.forEach(item => {
                const row = document.createElement("div");
                row.className = "lux-room-detail-row";

                const left = document.createElement("div");
                const dot = document.createElement("i");
                const name = document.createElement("span");
                const value = document.createElement("strong");

                dot.style.background =
                    roomColors[item.status] || "#B4AAA0";

                name.textContent = item.status || "Chưa xác định";

                const percentage = total
                    ? Number(item.count) / total * 100
                    : 0;

                value.textContent =
                    `${number(item.count)} ` +
                    `(${percentage.toFixed(1).replace(".", ",")}%)`;

                left.append(dot, name);
                row.append(left, value);
                list.appendChild(row);
            });
        } catch (error) {
            list.textContent = "Không tải được chi tiết trạng thái phòng.";
            console.warn(error.message);
        }
    }

    function initialize() {
        initializeFilters();
        initializeEvents();
        loadRoomDetails();
        switchMode("day");
    }

    initialize();
});
