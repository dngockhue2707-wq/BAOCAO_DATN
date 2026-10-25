
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const api = "/api/admin/room-photos";

    let rooms = [];
    let photos = [];

    const roomSelect = $("photoRoomSelect");
    const photoGrid = $("individualPhotoGrid");
    const form = $("individualPhotoForm");

    function notice(message, error = false) {
        const box = $("roomMessage");
        box.textContent = message;
        box.classList.toggle("error", error);
    }

    async function request(path, options = {}) {
        const response = await fetch(`${api}${path}`, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            location.href = "/login.html";
            throw new Error("Vui lòng đăng nhập.");
        }

        if (response.status === 403) {
            throw new Error("Bạn không có quyền quản trị.");
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message || `Lỗi HTTP ${response.status}`
            );
        }

        return result;
    }

    async function getToken() {
        const response = await fetch(
            "/api/account/csrf-token",
            { credentials: "same-origin" }
        );

        if (!response.ok) {
            throw new Error("Không lấy được mã bảo vệ.");
        }

        const data = await response.json();
        return data.csrfToken;
    }

    function makeButton(text, callback, disabled = false) {
        const element = document.createElement("button");

        element.type = "button";
        element.className = "room-small-button";
        element.textContent = text;
        element.disabled = disabled;

        element.addEventListener("click", callback);
        return element;
    }

    async function loadRooms() {
        rooms = await request("/rooms");

        roomSelect.replaceChildren();

        for (const room of rooms) {
            roomSelect.add(
                new Option(
                    `Phòng ${room.number} - ${room.type} - Tầng ${room.floor ?? "—"}`,
                    String(room.id)
                )
            );
        }

        await loadPhotos();
    }

    async function loadPhotos() {
        const roomId = Number(roomSelect.value);

        if (!roomId) {
            photoGrid.replaceChildren();
            $("selectedRoomTitle").textContent = "Chưa có phòng";
            return;
        }

        const room = rooms.find(
            item => Number(item.id) === roomId
        );

        $("selectedRoomTitle").textContent =
            `Thư viện ảnh phòng ${room?.number || ""}`;

        photos = await request(`/${roomId}`);

        renderPhotos();
    }

    function renderPhotos() {
        photoGrid.replaceChildren();

        if (photos.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "Phòng này chưa có hình ảnh.";
            photoGrid.appendChild(empty);
            return;
        }

        const roomId = Number(roomSelect.value);

        for (const photo of photos) {
            const article = document.createElement("article");
            article.className = "room-image-item";

            const image = document.createElement("img");
            image.src = photo.path;
            image.alt = photo.description || "Hình ảnh phòng";
            image.loading = "lazy";

            const info = document.createElement("div");
            info.className = "room-image-info";

            const title = document.createElement("strong");
            title.textContent = photo.isCover
                ? "Ảnh đại diện"
                : "Ảnh phụ";

            const actions = document.createElement("div");
            actions.className = "room-image-actions";

            const cover = makeButton(
                "Đặt đại diện",
                () => setCover(roomId, photo.id),
                photo.isCover
            );

            const remove = makeButton(
                "Xóa ảnh",
                () => deletePhoto(roomId, photo.id)
            );

            remove.classList.add("danger");

            actions.append(cover, remove);
            info.append(title, actions);
            article.append(image, info);

            photoGrid.appendChild(article);
        }
    }

    async function uploadPhotos(event) {
        event.preventDefault();

        const roomId = Number(roomSelect.value);
        const files = Array.from(
            $("individualPhotoFiles").files
        );

        if (!roomId) {
            notice("Chưa chọn phòng.", true);
            return;
        }

        if (files.length === 0 || files.length > 10) {
            notice("Chọn từ 1 đến 10 ảnh.", true);
            return;
        }

        if (
            files.some(file =>
                !file.size ||
                file.size > 5 * 1024 * 1024
            )
        ) {
            notice("Mỗi ảnh không được vượt quá 5 MB.", true);
            return;
        }

        const data = new FormData();

        for (const file of files) {
            data.append("files", file);
        }

        const submit = $("uploadIndividualPhotos");
        submit.disabled = true;

        try {
            const token = await getToken();

            const result = await request(`/${roomId}`, {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": token
                },
                body: data
            });

            form.reset();

            await loadPhotos();
            notice(result.message);
        } catch (error) {
            notice(error.message, true);
        } finally {
            submit.disabled = false;
        }
    }

    async function setCover(roomId, photoId) {
        try {
            const token = await getToken();

            const result = await request(
                `/${roomId}/${photoId}/cover`,
                {
                    method: "PUT",
                    headers: {
                        "X-CSRF-TOKEN": token
                    }
                }
            );

            await loadPhotos();
            notice(result.message);
        } catch (error) {
            notice(error.message, true);
        }
    }

    async function deletePhoto(roomId, photoId) {
        if (!confirm("Bạn có chắc muốn xóa ảnh này?")) {
            return;
        }

        try {
            const token = await getToken();

            const result = await request(
                `/${roomId}/${photoId}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-TOKEN": token
                    }
                }
            );

            await loadPhotos();
            notice(result.message);
        } catch (error) {
            notice(error.message, true);
        }
    }

    $("showTypeImages").addEventListener("click", () => {
        $("typeImagesPanel").hidden = false;
        $("individualImagesPanel").hidden = true;

        $("showTypeImages").classList.add("active");
        $("showIndividualImages").classList.remove("active");
    });

    $("showIndividualImages").addEventListener(
        "click",
        async () => {
            $("typeImagesPanel").hidden = true;
            $("individualImagesPanel").hidden = false;

            $("showTypeImages").classList.remove("active");
            $("showIndividualImages").classList.add("active");

            try {
                await loadPhotos();
            } catch (error) {
                notice(error.message, true);
            }
        }
    );

    roomSelect.addEventListener("change", () => {
        loadPhotos().catch(error => {
            notice(error.message, true);
        });
    });

    form.addEventListener("submit", uploadPhotos);

    loadRooms().catch(error => {
        notice(error.message, true);
    });
});
