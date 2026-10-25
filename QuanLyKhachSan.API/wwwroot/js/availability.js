"use strict";

const availabilityForm = document.getElementById("availabilityForm");
const checkInInput = document.getElementById("checkIn");
const checkOutInput = document.getElementById("checkOut");
const searchButton = document.getElementById("searchAvailability");
const messageElement = document.getElementById("availabilityMessage");
const resultElement = document.getElementById("availabilityResults");
const countElement = document.getElementById("availabilityCount");

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + days);

    return formatLocalDate(date);
}

function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value);
}

function setMessage(text, isError = false) {
    messageElement.textContent = text;
    messageElement.classList.toggle("error", isError);
}

function createTextElement(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;

    if (className) {
        element.className = className;
    }

    return element;
}

function renderAvailableRooms(data) {
    resultElement.replaceChildren();

    countElement.textContent = `${data.availableCount} phòng còn trống`;

    if (!data.rooms.length) {
        resultElement.appendChild(
            createTextElement(
                "p",
                "Không có phòng phù hợp trong khoảng ngày đã chọn."
            )
        );
        return;
    }

    for (const room of data.rooms) {
        const card = document.createElement("article");
        card.className = "availability-card";

        const title = createTextElement(
            "h3",
            `${room.roomTypeName} – ${room.roomNumber}`
        );

        const floor = createTextElement(
            "p",
            `Tầng: ${room.floor ?? "Chưa cập nhật"}`
        );

        const capacity = createTextElement(
            "p",
            `Sức chứa: ${room.adultCapacity} người lớn, ${room.childCapacity} trẻ em`
        );

        const description = createTextElement(
            "p",
            room.description || "Không gian nghỉ dưỡng tại DNK Hotel."
        );

        const priceArea = document.createElement("div");
        priceArea.className = "availability-price";

        const price = createTextElement(
            "strong",
            formatMoney(room.estimatedTotal)
        );

        const priceDetail = createTextElement(
            "small",
            `${room.nights} đêm × ${formatMoney(room.pricePerNight)}`
        );

        priceArea.append(price, priceDetail);

        const link = document.createElement("a");

        link.href = `/room-detail.html?id=${encodeURIComponent(room.roomTypeId)}`;
        link.textContent = "Xem chi tiết phòng";

        card.append(
            title,
            floor,
            capacity,
            description,
            priceArea,
            link
        );

        resultElement.appendChild(card);
    }
}

async function searchAvailability(event) {
    event.preventDefault();

    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;

    if (!checkIn || !checkOut) {
        setMessage("Vui lòng chọn đủ ngày nhận và ngày trả phòng.", true);
        return;
    }

    if (checkOut <= checkIn) {
        setMessage("Ngày trả phòng phải sau ngày nhận phòng.", true);
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Đang tìm phòng...";
    setMessage("");

    try {
        const params = new URLSearchParams({
            checkIn,
            checkOut
        });

        const response = await fetch(
            `/api/room-availability?${params.toString()}`,
            {
                credentials: "same-origin"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Không thể kiểm tra phòng trống."
            );
        }

        renderAvailableRooms(data);

        setMessage(
            `Có ${data.availableCount} phòng khả dụng từ ${checkIn} đến ${checkOut}.`
        );
    } catch (error) {
        resultElement.replaceChildren();
        countElement.textContent = "";
        setMessage(error.message, true);
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Tìm phòng trống";
    }
}

function initializeAvailability() {
    const today = formatLocalDate(new Date());

    checkInInput.min = today;
    checkOutInput.min = addDays(today, 1);

    checkInInput.value = today;
    checkOutInput.value = addDays(today, 1);

    checkInInput.addEventListener("change", () => {
        const minimumCheckout = addDays(checkInInput.value, 1);

        checkOutInput.min = minimumCheckout;

        if (checkOutInput.value < minimumCheckout) {
            checkOutInput.value = minimumCheckout;
        }
    });

    availabilityForm.addEventListener("submit", searchAvailability);
}

initializeAvailability();
