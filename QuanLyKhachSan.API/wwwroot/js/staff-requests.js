
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

    async function load() {
        try {
            const data = await s.api("operations/requests");
            const panel = s.panel("Yêu cầu hỗ trợ khách hàng");

            const rows = data.items.map(item => {
                const actions = s.el("div", "", "staff-actions");

                actions.appendChild(s.button("Xem", () => {
                    alert(
                        `Khách: ${item.customer}\n` +
                        `Email: ${item.email}\n` +
                        `Điện thoại: ${item.phone}\n` +
                        `Chủ đề: ${item.subject}\n\n` +
                        `Nội dung:\n${item.content}\n\n` +
                        `Phản hồi:\n${item.reply || "Chưa phản hồi"}`
                    );
                }));

                actions.appendChild(s.button(
                    item.reply ? "Sửa phản hồi" : "Phản hồi",
                    async () => {
                        const answer = prompt(
                            "Nhập nội dung phản hồi:", item.reply || ""
                        );

                        if (answer === null) return;

                        const content = answer.trim();
                        if (content.length < 2 || content.length > 2000) {
                            s.notify("Phản hồi phải từ 2 đến 2000 ký tự.", true);
                            return;
                        }

                        try {
                            const result = await s.api(
                                `operations/requests/${item.id}/reply`,
                                "POST",
                                { content }
                            );
                            await load();
                            s.notify(result.message);
                        } catch (error) {
                            s.notify(error.message, true);
                        }
                    }
                ));

                return [
                    "#" + item.id,
                    item.customer,
                    item.subject,
                    s.date(item.date),
                    item.status,
                    actions
                ];
            });

            panel.appendChild(s.table(
                ["Mã", "Khách hàng", "Chủ đề",
                 "Ngày gửi", "Trạng thái", "Thao tác"],
                rows
            ));

            s.content.replaceChildren(panel);
        } catch (error) {
            s.notify(error.message, true);
        }
    }

    load();
});
