"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    const guests = document.getElementById("guests");
    const message = document.getElementById("searchMessage");

    if (!searchForm || !checkin || !checkout || !guests) return;

    function getLocalDate(daysToAdd = 0) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    const today = getLocalDate();

    checkin.min = today;
    checkout.min = getLocalDate(1);

    checkin.addEventListener("change", () => {
        if (!checkin.value) return;

        const nextDay = new Date(checkin.value + "T00:00:00");
        nextDay.setDate(nextDay.getDate() + 1);

        const year = nextDay.getFullYear();
        const month = String(nextDay.getMonth() + 1).padStart(2, "0");
        const day = String(nextDay.getDate()).padStart(2, "0");

        const minCheckout = `${year}-${month}-${day}`;

        checkout.min = minCheckout;

        if (checkout.value && checkout.value < minCheckout) {
            checkout.value = "";
        }

        message.textContent = "";
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        message.textContent = "";

        const from = checkin.value;
        const to = checkout.value;

        if (!from || !to) {
            message.textContent =
                "Vui lòng chọn ngày nhận và trả phòng.";
            return;
        }

        if (from < getLocalDate()) {
            message.textContent =
                "Ngày nhận phòng không được ở trong quá khứ.";
            return;
        }

        if (to <= from) {
            message.textContent =
                "Ngày trả phòng phải sau ngày nhận phòng.";
            return;
        }

        const params = new URLSearchParams({
            checkin: from,
            checkout: to,
            guests: guests.value
        });

        window.location.href = `/rooms.html?${params.toString()}`;
    });
});
