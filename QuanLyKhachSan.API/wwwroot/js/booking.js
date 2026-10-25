
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);

    const roomTypeId = Number(
        params.get("roomId") || params.get("roomTypeId")
    );

    const form = document.getElementById("bookingForm");
    const checkIn = document.getElementById("checkIn");
    const checkOut = document.getElementById("checkOut");
    const adults = document.getElementById("adults");
    const children = document.getElementById("children");
    const note = document.getElementById("note");
    const message = document.getElementById("bookingMessage");
    const button = document.getElementById("bookingButton");
    const selectedRoom = document.getElementById("selectedRoom");
    const nightlyPrice = document.getElementById("nightlyPrice");
    const numberOfNights = document.getElementById("numberOfNights");
    const bookingTotal = document.getElementById("bookingTotal");

    if (!form || !checkIn || !checkOut || !adults ||
        !children || !message || !button) {
        return;
    }

    let room = null;
    let price = 0;
    let submitting = false;

    const money = value => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    };

    function dateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function addDays(dateValue, days) {
        const parts = dateValue.split("-").map(Number);

        const date = new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

        date.setDate(date.getDate() + days);

        return dateString(date);
    }

    function countNights() {
        if (!checkIn.value || !checkOut.value) {
            return 0;
        }

        const start = Date.parse(`${checkIn.value}T00:00:00Z`);
        const end = Date.parse(`${checkOut.value}T00:00:00Z`);

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            return 0;
        }

        return Math.round((end - start) / 86400000);
    }

    function showMessage(text, isError = true) {
        message.textContent = text;
        message.style.color = isError ? "#A1372D" : "#926024";
    }

    function updateTotal() {
        if (!checkIn.value) {
            return;
        }

        const today = dateString(new Date());

        checkIn.min = today;

        if (checkIn.value < today) {
            checkIn.value = today;
        }

        const earliestCheckout = addDays(checkIn.value, 1);

        checkOut.min = earliestCheckout;

        if (!checkOut.value || checkOut.value < earliestCheckout) {
            checkOut.value = earliestCheckout;
        }

        const nights = countNights();

        if (numberOfNights) {
            numberOfNights.textContent = `${nights} đêm`;
        }

        if (bookingTotal) {
            bookingTotal.textContent = money(price * nights);
        }

        if (nights > 30) {
            showMessage("Thời gian lưu trú tối đa 30 đêm.");
        } else {
            showMessage("", false);
        }
    }

    function validDate(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    function initializeDates() {
        const today = dateString(new Date());

        const initialCheckIn = params.get("checkIn");
        const initialCheckOut = params.get("checkOut");

        checkIn.value =
            validDate(initialCheckIn || "") && initialCheckIn >= today
                ? initialCheckIn
                : today;

        const earliestCheckout = addDays(checkIn.value, 1);

        checkOut.value =
            validDate(initialCheckOut || "") &&
            initialCheckOut >= earliestCheckout
                ? initialCheckOut
                : earliestCheckout;

        const initialAdults = Number(params.get("adults"));
        const initialChildren = Number(params.get("children"));

        adults.value =
            Number.isInteger(initialAdults) && initialAdults > 0
                ? String(initialAdults)
                : "2";

        children.value =
            Number.isInteger(initialChildren) && initialChildren >= 0
                ? String(initialChildren)
                : "0";

        updateTotal();
    }

    async function loadRoom() {
        if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
            showMessage("Chưa chọn loại phòng.");
            button.disabled = true;
            return;
        }

        button.disabled = true;

        try {
            const response = await fetch(`/api/rooms/${roomTypeId}`, {
                credentials: "same-origin"
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "Không tìm thấy loại phòng."
                );
            }

            room = data.room;

            if (!room) {
                throw new Error("Không nhận được thông tin loại phòng.");
            }

            price = Number(room.giaCoBan);

            if (!Number.isFinite(price) || price <= 0) {
                throw new Error("Giá loại phòng chưa được thiết lập.");
            }

            if (selectedRoom) {
                selectedRoom.textContent = room.tenLoaiPhong;
            }

            if (nightlyPrice) {
                nightlyPrice.textContent = money(price);
            }

            updateTotal();
            button.disabled = false;
        } catch (error) {
            showMessage(error.message || "Không thể tải thông tin phòng.");
            button.disabled = true;
        }
    }

    async function verifyCustomer() {
        const response = await fetch("/api/account/profile", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.status === 401) {
            const returnUrl = encodeURIComponent(
                `${window.location.pathname}${window.location.search}`
            );

            window.location.href = `/login.html?returnUrl=${returnUrl}`;

            return false;
        }

        if (!response.ok) {
            throw new Error("Không thể xác minh tài khoản.");
        }

        const user = await response.json();

        if (user.role !== "Customer") {
            throw new Error(
                "Chức năng đặt phòng chỉ dành cho tài khoản khách hàng."
            );
        }

        return true;
    }

    async function getCsrfToken() {
        const response = await fetch("/api/account/csrf-token", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Không thể lấy mã bảo vệ.");
        }

        const data = await response.json();

        if (!data.csrfToken) {
            throw new Error("Mã bảo vệ không hợp lệ.");
        }

        return data.csrfToken;
    }

    async function createBooking(event) {
        event.preventDefault();

        if (submitting || !room) {
            return;
        }

        updateTotal();

        const nights = countNights();
        const adultCount = Number(adults.value);
        const childCount = Number(children.value);
        const today = dateString(new Date());

        if (checkIn.value < today) {
            showMessage("Ngày nhận phòng không được trong quá khứ.");
            return;
        }

        if (nights < 1 || nights > 30) {
            showMessage("Thời gian lưu trú phải từ 1 đến 30 đêm.");
            return;
        }

        if (!Number.isInteger(adultCount) ||
            adultCount < 1 ||
            adultCount > 20 ||
            !Number.isInteger(childCount) ||
            childCount < 0 ||
            childCount > 20) {
            showMessage("Số lượng khách không hợp lệ.");
            return;
        }

        if (note && note.value.trim().length > 500) {
            showMessage("Ghi chú không được quá 500 ký tự.");
            return;
        }

        submitting = true;
        button.disabled = true;
        button.textContent = "Đang đặt phòng...";
        showMessage("", false);

        try {
            const isCustomer = await verifyCustomer();

            if (!isCustomer) {
                return;
            }

            const csrfToken = await getCsrfToken();

            const response = await fetch("/api/bookings", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({
                    roomTypeId,
                    checkIn: checkIn.value,
                    checkOut: checkOut.value,
                    adults: adultCount,
                    children: childCount,
                    note: note ? note.value.trim() : ""
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "Không thể tạo đơn đặt phòng."
                );
            }

            if (!data.success) {
                throw new Error("Đặt phòng chưa hoàn tất.");
            }

            window.location.href = "/my-bookings.html";
        } catch (error) {
            showMessage(
                error.message || "Có lỗi xảy ra khi đặt phòng."
            );
        } finally {
            submitting = false;
            button.disabled = false;
            button.textContent = "Xác nhận đặt phòng →";
        }
    }

    initializeDates();

    checkIn.addEventListener("change", updateTotal);
    checkOut.addEventListener("change", updateTotal);

    form.addEventListener("submit", createBooking);

    await loadRoom();
});
