"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("servicesGrid");
    const message = document.getElementById("servicesMessage");

    if (!grid) return;

    const money = value => {
        const price = Number(value);

        if (!Number.isFinite(price)) {
            return "Liên hệ";
        }

        if (price === 0) {
            return "Miễn phí";
        }

        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(price);
    };

    function getIcon(name) {
        const value = (name || "").toLocaleLowerCase("vi-VN");

        if (value.includes("ăn") || value.includes("sáng") ||
            value.includes("nhà hàng")) return "☕";

        if (value.includes("spa") || value.includes("massage")) {
            return "✦";
        }

        if (value.includes("giặt")) return "♧";

        if (value.includes("đưa đón") || value.includes("xe")) {
            return "🚘";
        }

        if (value.includes("phòng")) return "♨";

        if (value.includes("hỗ trợ")) return "✉";

        if (value.includes("bể bơi") || value.includes("hồ bơi")) {
            return "🏊";
        }

        if (value.includes("gym") || value.includes("thể thao")) {
            return "🏋";
        }

        return "✦";
    }

    function createCard(service) {
        const article = document.createElement("article");
        article.className = "info-service-card";

        const image = document.createElement("div");
        image.className = "info-service-image";

        if (service.image) {
            const img = document.createElement("img");
            img.src = service.image;
            img.alt = service.name || "Dịch vụ DNK Hotel";
            img.loading = "lazy";
            img.onerror = () => {
                image.textContent = getIcon(service.name);
            };

            image.appendChild(img);
        } else {
            image.textContent = getIcon(service.name);
        }

        const body = document.createElement("div");
        body.className = "info-service-body";

        const tag = document.createElement("span");
        tag.className = "info-service-tag";
        tag.textContent = "DỊCH VỤ DNK HOTEL";

        const title = document.createElement("h3");
        title.textContent = service.name || "Dịch vụ khách sạn";

        const description = document.createElement("p");
        description.textContent =
            service.description || "Dịch vụ hỗ trợ khách hàng tại DNK Hotel.";

        const price = document.createElement("p");
        price.className = "info-service-price";
        price.textContent = service.price === 0
            ? "Miễn phí"
            : money(service.price);

        if (service.unit) {
            price.textContent += ` / ${service.unit}`;
        }

        const link = document.createElement("a");
        link.href = "/contact.html";
        link.className = "info-button info-button-outline";
        link.textContent = "Liên hệ tư vấn →";

        body.append(tag, title, description, price, link);
        article.append(image, body);

        return article;
    }

    async function loadServices() {
        try {
            const response = await fetch("/api/services", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                credentials: "same-origin"
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Không thể tải dịch vụ."
                );
            }

            if (!result.success || !Array.isArray(result.items)) {
                throw new Error("Dữ liệu dịch vụ không hợp lệ.");
            }

            grid.replaceChildren();

            if (result.items.length === 0) {
                message.textContent =
                    "Hiện tại khách sạn chưa có dịch vụ đang hoạt động.";

                grid.appendChild(message);
                return;
            }

            result.items.forEach(service => {
                grid.appendChild(createCard(service));
            });

        } catch (error) {
            grid.replaceChildren();

            message.textContent =
                error.message || "Không thể tải danh sách dịch vụ.";

            grid.appendChild(message);
        }
    }

    loadServices();
});