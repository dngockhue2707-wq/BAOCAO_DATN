
"use strict";

document.addEventListener("staff-auth-ready", async () => {
    const s = Staff;

    try {
        const data = await s.api("dashboard");
        const cards = s.el("section", "", "staff-cards");

        [
            ["Đơn chờ xác nhận", data.pending],
            ["Khách dự kiến đến hôm nay", data.arrivalsToday],
            ["Đang lưu trú", data.checkedIn],
            ["Phòng cần dọn", data.cleaning]
        ].forEach(([title, value]) => {
            const card = s.el("article", "", "staff-card");
            card.append(s.el("span", title), s.el("strong", value));
            cards.appendChild(card);
        });

        const panel = s.panel("Công việc của nhân viên");

        [
            ["Quản lý đặt phòng", "/staff/bookings.html"],
            ["Nhận và trả phòng", "/staff/check-in-out.html"],
            ["Tình trạng phòng", "/staff/rooms.html"],
            ["Dịch vụ khách sử dụng", "/staff/services.html"],
            ["Hóa đơn", "/staff/invoices.html"],
            ["Yêu cầu khách hàng", "/staff/requests.html"]
        ].forEach(([label, url]) => {
            const a = s.el("a", label, "staff-action");
            a.href = url;
            a.style.margin = "6px";
            panel.appendChild(a);
        });

        s.content.replaceChildren(cards, panel);
    } catch (error) {
        s.notify(error.message, true);
    }
});
