
"use strict";

document.addEventListener("staff-auth-ready", async () => {
    const s = Staff;

    try {
        const data = await s.api("operations/invoices");
        const panel = s.panel("Danh sách hóa đơn");

        const rows = data.items.map(item => [
            "#" + item.id,
            "#" + item.bookingId,
            item.customer,
            s.date(item.date),
            s.money(item.roomAmount),
            s.money(item.serviceAmount),
            s.money(item.deposit),
            s.money(item.discount),
            s.money(item.total),
            s.money(item.paid),
            s.money(item.remaining),
            item.status
        ]);

        panel.appendChild(s.table(
            ["Mã HĐ", "Mã đơn", "Khách", "Ngày lập",
             "Tiền phòng", "Dịch vụ", "Đặt cọc",
             "Giảm giá", "Tổng tiền", "Đã thanh toán",
             "Còn lại", "Trạng thái"],
            rows
        ));

        s.content.replaceChildren(panel);
    } catch (error) {
        s.notify(error.message, true);
    }
});
