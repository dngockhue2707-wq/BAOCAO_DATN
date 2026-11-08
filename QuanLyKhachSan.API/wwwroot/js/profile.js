
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const profileForm = document.getElementById("profileForm");
    const profileMessage = document.getElementById("profileMessage");
    const saveProfileButton = document.getElementById("saveProfile");

    const passwordForm = document.getElementById("changePasswordForm");
    const passwordMessage = document.getElementById("passwordMessage");
    const passwordButton = document.getElementById("changePasswordButton");

    const fields = {
        username: document.getElementById("username"),
        email: document.getElementById("email"),
        fullName: document.getElementById("fullName"),
        phone: document.getElementById("phone"),
        address: document.getElementById("address")
    };

    const navButtons = document.querySelectorAll(
        "[data-profile-tab]"
    );

    const panels = {
        personal: document.getElementById("profilePersonalPanel"),
        security: document.getElementById("profileSecurityPanel"),
        preferences: document.getElementById("profilePreferencesPanel")
    };

    function showMessage(element, message, type = "") {
        if (!element) return;

        element.textContent = message;
        element.className = "profile-message";

        if (type) {
            element.classList.add(type);
        }
    }

    function getErrorMessage(data, fallback) {
        return data?.message || data?.thongBao || fallback;
    }

    async function readJson(response) {
        return await response.json().catch(() => ({}));
    }

    async function getCsrfToken() {
        const response = await fetch(
            "/api/account/csrf-token",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const data = await readJson(response);

        if (!response.ok || !data.csrfToken) {
            throw new Error(
                "Không thể khởi tạo phiên bảo mật. Hãy tải lại trang."
            );
        }

        return data.csrfToken;
    }

    function redirectIfUnauthorized(response) {
        if (response.status === 401) {
            window.location.replace("/login.html");
            return true;
        }

        return false;
    }

    function showTab(tabName) {
        if (!panels[tabName]) return;

        Object.entries(panels).forEach(([name, panel]) => {
            if (panel) {
                panel.hidden = name !== tabName;
            }
        });

        navButtons.forEach(button => {
            const active = button.dataset.profileTab === tabName;

            button.classList.toggle("active", active);

            button.setAttribute(
                "aria-expanded",
                String(active)
            );
        });
    }

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabName = button.dataset.profileTab;

            showTab(tabName);

            if (tabName === "preferences" && !preferencesLoaded) {
                loadPreferences();
            }
        });
    });
    
    const requestedTab = new URLSearchParams(
        window.location.search
    ).get("tab");

    const initialTab = panels[requestedTab]
        ? requestedTab
        : "personal";

    showTab(initialTab);

    function updateProfileHeader(data) {
        const displayName = document.getElementById(
            "profileDisplayName"
        );

        const displayEmail = document.getElementById(
            "profileDisplayEmail"
        );

        const initial = document.getElementById(
            "profileInitial"
        );

        const name = (data.fullName || "").trim();
        const email = (data.email || "").trim();

        if (displayName) {
            displayName.textContent =
                name || data.username || "Khách hàng DNK Hotel";
        }

        if (displayEmail) {
            displayEmail.textContent =
                email || "Thông tin tài khoản";
        }

        if (initial) {
            initial.textContent = (
                name || data.username || "K"
            ).charAt(0).toLocaleUpperCase("vi-VN");
        }
    }

    async function loadProfile() {
        if (!profileForm) return;

        saveProfileButton.disabled = true;

        showMessage(
            profileMessage,
            "Đang tải thông tin cá nhân..."
        );

        try {
            const response = await fetch("/api/profile", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (redirectIfUnauthorized(response)) return;

            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        response.status === 403
                            ? "Tài khoản không có quyền truy cập hồ sơ khách hàng."
                            : "Không tải được thông tin cá nhân."
                    )
                );
            }

            fields.username.value = data.username || "";
            fields.email.value = data.email || "";
            fields.fullName.value = data.fullName || "";
            fields.phone.value = data.phone || "";
            fields.address.value = data.address || "";

            updateProfileHeader(data);

            showMessage(profileMessage, "");

        } catch (error) {
            showMessage(
                profileMessage,
                error.message || "Có lỗi khi tải hồ sơ.",
                "error"
            );
        } finally {
            saveProfileButton.disabled = false;
        }
    }

    if (profileForm) {
        profileForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (saveProfileButton.disabled) return;

            const fullName = fields.fullName.value.trim();
            const phone = fields.phone.value.trim();
            const address = fields.address.value.trim();

            if (fullName.length < 2 || fullName.length > 100) {
                showMessage(
                    profileMessage,
                    "Họ tên cần có từ 2 đến 100 ký tự.",
                    "error"
                );
                return;
            }

            if (phone.length > 20 || address.length > 255) {
                showMessage(
                    profileMessage,
                    "Số điện thoại hoặc địa chỉ vượt quá độ dài cho phép.",
                    "error"
                );
                return;
            }

            saveProfileButton.disabled = true;

            showMessage(
                profileMessage,
                "Đang lưu thông tin..."
            );

            try {
                const csrfToken = await getCsrfToken();

                const response = await fetch("/api/profile", {
                    method: "PUT",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrfToken
                    },
                    body: JSON.stringify({
                        fullName,
                        phone,
                        address
                    })
                });

                if (redirectIfUnauthorized(response)) return;

                const data = await readJson(response);

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            "Không thể cập nhật thông tin."
                        )
                    );
                }

                updateProfileHeader({
                    username: fields.username.value,
                    email: fields.email.value,
                    fullName
                });

                showMessage(
                    profileMessage,
                    data.message || "Cập nhật thông tin thành công!",
                    "success"
                );

            } catch (error) {
                showMessage(
                    profileMessage,
                    error.message || "Không thể lưu thông tin.",
                    "error"
                );
            } finally {
                saveProfileButton.disabled = false;
            }
        });
    }

    const showPasswords = document.getElementById(
        "showChangePasswords"
    );

    const passwordInputs = [
        document.getElementById("currentPassword"),
        document.getElementById("newPassword"),
        document.getElementById("confirmNewPassword")
    ];

    if (showPasswords) {
        showPasswords.addEventListener("change", () => {
            passwordInputs.forEach(input => {
                if (input) {
                    input.type = showPasswords.checked
                        ? "text"
                        : "password";
                }
            });
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (passwordButton.disabled) return;

            const currentPassword =
                document.getElementById("currentPassword").value;

            const newPassword =
                document.getElementById("newPassword").value;

            const confirmPassword =
                document.getElementById("confirmNewPassword").value;

            if (!currentPassword) {
                showMessage(
                    passwordMessage,
                    "Vui lòng nhập mật khẩu hiện tại.",
                    "error"
                );
                return;
            }

            if (newPassword.length < 12 ||
                newPassword.length > 128) {
                showMessage(
                    passwordMessage,
                    "Mật khẩu mới phải có từ 12 đến 128 ký tự.",
                    "error"
                );
                return;
            }

            if (newPassword === currentPassword) {
                showMessage(
                    passwordMessage,
                    "Mật khẩu mới phải khác mật khẩu hiện tại.",
                    "error"
                );
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage(
                    passwordMessage,
                    "Xác nhận mật khẩu mới không trùng khớp.",
                    "error"
                );
                return;
            }

            passwordButton.disabled = true;

            showMessage(
                passwordMessage,
                "Đang cập nhật mật khẩu..."
            );

            try {
                const csrfToken = await getCsrfToken();

                const response = await fetch(
                    "/api/account/change-password",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": csrfToken
                        },
                        body: JSON.stringify({
                            currentPassword,
                            newPassword
                        })
                    }
                );

                if (redirectIfUnauthorized(response)) return;

                const data = await readJson(response);

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            "Không thể đổi mật khẩu."
                        )
                    );
                }

                passwordForm.reset();

                passwordInputs.forEach(input => {
                    if (input) input.type = "password";
                });

                showMessage(
                    passwordMessage,
                    data.message || "Đổi mật khẩu thành công!",
                    "success"
                );

            } catch (error) {
                showMessage(
                    passwordMessage,
                    error.message || "Đổi mật khẩu thất bại.",
                    "error"
                );
            } finally {
                passwordButton.disabled = false;
            }
        });
    }

    const preferencesForm =
        document.getElementById("preferencesForm");

    const preferencesMessage =
        document.getElementById("preferencesMessage");

    const savePreferencesButton =
        document.getElementById("savePreferences");

    const favoriteRoomType =
        document.getElementById("favoriteRoomType");

    const minimumBudget =
        document.getElementById("minimumBudget");

    const preferredBudget =
        document.getElementById("preferredBudget");

    const usualGuests =
        document.getElementById("usualGuests");

    const minimumArea =
        document.getElementById("minimumArea");

    const budgetPreview =
        document.getElementById("budgetPreview");

    const amenitiesList =
        document.getElementById("amenitiesList");

    let preferencesLoaded = false;
    let preferencesLoading = false;

    function numberOrNull(input) {
        if (!input) return null;

        const value = input.value.trim();

        return value === "" ? null : Number(value);
    }

    function money(value) {
        return Number(value).toLocaleString("vi-VN") + " VNĐ";
    }

    function updateBudgetPreview() {
        if (!budgetPreview) return;

        const min = numberOrNull(minimumBudget);
        const max = numberOrNull(preferredBudget);

        if (min === null && max === null) {
            budgetPreview.textContent =
                "Chưa thiết lập ngân sách";
            return;
        }

        if (min !== null && max !== null) {
            budgetPreview.textContent =
                "Ngân sách dự kiến: " +
                money(min) + " – " + money(max) +
                " / đêm";
            return;
        }

        if (min !== null) {
            budgetPreview.textContent =
                "Từ " + money(min) + " / đêm";
            return;
        }

        budgetPreview.textContent =
            "Tối đa " + money(max) + " / đêm";
    }

    minimumBudget?.addEventListener(
        "input",
        updateBudgetPreview
    );

    preferredBudget?.addEventListener(
        "input",
        updateBudgetPreview
    );

    function renderRoomTypes(roomTypes) {
        if (!favoriteRoomType) return;

        favoriteRoomType.replaceChildren();

        favoriteRoomType.add(
            new Option("Chưa có lựa chọn", "")
        );

        roomTypes.forEach(room => {
            favoriteRoomType.add(
                new Option(
                    room.tenLoaiPhong,
                    String(room.maLoaiPhong)
                )
            );
        });
    }

    function renderAmenities(amenities) {
        if (!amenitiesList) return;

        amenitiesList.replaceChildren();

        if (!amenities.length) {
            const empty = document.createElement("p");
            empty.className = "preference-hint";
            empty.textContent =
                "Hiện chưa có tiện nghi để lựa chọn.";

            amenitiesList.appendChild(empty);
            return;
        }

        const levels = [
            { value: 1, text: "1 - Ít quan trọng" },
            { value: 2, text: "2 - Bình thường" },
            { value: 3, text: "3 - Quan trọng" },
            { value: 4, text: "4 - Rất quan trọng" },
            { value: 5, text: "5 - Ưu tiên cao nhất" }
        ];

        amenities.forEach(amenity => {

            const item = document.createElement("div");
            item.className = "preference-amenity";

            const label = document.createElement("label");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "amenity-checkbox";
            checkbox.value = String(amenity.maTienNghi);

            const name = document.createElement("span");
            name.textContent = amenity.tenTienNghi;

            label.append(checkbox, name);

            const priority = document.createElement("select");
            priority.className = "amenity-priority";
            priority.disabled = true;

            priority.setAttribute(
                "aria-label",
                "Mức độ ưu tiên: " + amenity.tenTienNghi
            );

            levels.forEach(level => {
                priority.add(
                    new Option(
                        level.text,
                        String(level.value)
                    )
                );
            });

            priority.value = "3";

            checkbox.addEventListener("change", () => {
                priority.disabled = !checkbox.checked;

                item.classList.toggle(
                    "selected",
                    checkbox.checked
                );
            });

            item.append(label, priority);

            if (amenity.moTa) {
                const description =
                    document.createElement("small");

                description.textContent = amenity.moTa;
                item.appendChild(description);
            }

            amenitiesList.appendChild(item);
        });
    }

    function collectAmenities() {
        const selected = [];

        if (!amenitiesList) return selected;

        amenitiesList.querySelectorAll(
            ".preference-amenity"
        ).forEach(item => {

            const checkbox = item.querySelector(
                ".amenity-checkbox"
            );

            const priority = item.querySelector(
                ".amenity-priority"
            );

            if (!checkbox || !priority || !checkbox.checked) {
                return;
            }

            selected.push({
                maTienNghi: Number(checkbox.value),
                mucDoUuTien: Number(priority.value)
            });
        });

        return selected;
    }

    function applySavedAmenities(savedAmenities) {
        if (!amenitiesList) return;

        const selectedMap = new Map(
            savedAmenities.map(item => [
                Number(item.maTienNghi),
                Number(item.mucDoUuTien)
            ])
        );

        amenitiesList.querySelectorAll(
            ".preference-amenity"
        ).forEach(item => {

            const checkbox = item.querySelector(
                ".amenity-checkbox"
            );

            const priority = item.querySelector(
                ".amenity-priority"
            );

            if (!checkbox || !priority) return;

            const id = Number(checkbox.value);
            const isSelected = selectedMap.has(id);

            checkbox.checked = isSelected;
            priority.disabled = !isSelected;

            priority.value = isSelected
                ? String(selectedMap.get(id))
                : "3";

            item.classList.toggle(
                "selected",
                isSelected
            );
        });
    }

    async function loadPreferences() {
        if (!preferencesForm || preferencesLoading) return;

        preferencesLoading = true;
        savePreferencesButton.disabled = true;

        showMessage(
            preferencesMessage,
            "Đang tải sở thích lưu trú..."
        );

        try {
            // TẢI DANH SÁCH LOẠI PHÒNG VÀ TIỆN NGHI

            const optionsResponse = await fetch(
                "/api/so-thich-luu-tru/options",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            if (redirectIfUnauthorized(optionsResponse)) {
                return;
            }

            const options = await readJson(optionsResponse);

            if (!optionsResponse.ok) {
                throw new Error(
                    getErrorMessage(
                        options,
                        "Không tải được danh sách phòng và tiện nghi."
                    )
                );
            }

            renderRoomTypes(options.roomTypes || []);
            renderAmenities(options.amenities || []);

            // TẢI SỞ THÍCH CỦA KHÁCH HÀNG

            const response = await fetch(
                "/api/so-thich-luu-tru",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            if (redirectIfUnauthorized(response)) return;

            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Không tải được sở thích lưu trú."
                    )
                );
            }

            const p = data.preferences || {};

            favoriteRoomType.value =
                p.maLoaiPhongUuTien == null
                    ? ""
                    : String(p.maLoaiPhongUuTien);

            minimumBudget.value =
                p.nganSachToiThieu ?? "";

            preferredBudget.value =
                p.nganSachToiDa ?? "";

            usualGuests.value =
                p.soNguoiMongMuon ?? "";

            minimumArea.value =
                p.dienTichToiThieu ?? "";

            applySavedAmenities(
                data.amenities || []
            );

            updateBudgetPreview();

            preferencesLoaded = true;

            showMessage(
                preferencesMessage,
                data.hasPreferences
                    ? "Đã tải sở thích đã lưu."
                    : "Bạn chưa thiết lập sở thích lưu trú."
            );

        } catch (error) {
            showMessage(
                preferencesMessage,
                error.message || "Không thể tải sở thích.",
                "error"
            );
        } finally {
            preferencesLoading = false;
            savePreferencesButton.disabled = false;
        }
    }

    function validBudget(value) {
        return value === null || (
            Number.isInteger(value) &&
            value >= 0 &&
            value <= 100000000
        );
    }

    function validArea(value) {
        return value === null || (
            Number.isFinite(value) &&
            value >= 0 &&
            value <= 10000 &&
            Math.round(value * 100) === value * 100
        );
    }

    if (preferencesForm) {
        preferencesForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                if (savePreferencesButton.disabled) return;

                if (!preferencesLoaded) {
                    showMessage(
                        preferencesMessage,
                        "Vui lòng tải dữ liệu sở thích trước khi lưu.",
                        "error"
                    );
                    return;
                }

                const minBudget =
                    numberOrNull(minimumBudget);

                const maxBudget =
                    numberOrNull(preferredBudget);

                const guests =
                    numberOrNull(usualGuests);

                const area =
                    numberOrNull(minimumArea);

                const roomType =
                    numberOrNull(favoriteRoomType);

                if (!validBudget(minBudget) ||
                    !validBudget(maxBudget)) {
                    showMessage(
                        preferencesMessage,
                        "Ngân sách phải từ 0 đến 100.000.000 VNĐ.",
                        "error"
                    );
                    return;
                }

                if (
                    minBudget !== null &&
                    maxBudget !== null &&
                    minBudget > maxBudget
                ) {
                    showMessage(
                        preferencesMessage,
                        "Ngân sách tối thiểu không được lớn hơn ngân sách tối đa.",
                        "error"
                    );
                    return;
                }

                if (
                    guests !== null &&
                    (
                        !Number.isInteger(guests) ||
                        guests < 1 ||
                        guests > 20
                    )
                ) {
                    showMessage(
                        preferencesMessage,
                        "Số người mong muốn phải từ 1 đến 20.",
                        "error"
                    );
                    return;
                }

                if (!validArea(area)) {
                    showMessage(
                        preferencesMessage,
                        "Diện tích mong muốn không hợp lệ.",
                        "error"
                    );
                    return;
                }

                const allowedRoomTypes = Array.from(
                    favoriteRoomType.options
                ).map(option => option.value);

                if (
                    roomType !== null &&
                    !allowedRoomTypes.includes(String(roomType))
                ) {
                    showMessage(
                        preferencesMessage,
                        "Vui lòng chọn loại phòng hợp lệ.",
                        "error"
                    );
                    return;
                }

                const payload = {
                    nganSachToiThieu: minBudget,
                    nganSachToiDa: maxBudget,
                    soNguoiMongMuon: guests,
                    maLoaiPhongUuTien: roomType,
                    dienTichToiThieu: area,
                    tienNghiYeuThich: collectAmenities()
                };

                savePreferencesButton.disabled = true;

                showMessage(
                    preferencesMessage,
                    "Đang lưu sở thích..."
                );

                try {
                    const csrfToken = await getCsrfToken();

                    const response = await fetch(
                        "/api/so-thich-luu-tru",
                        {
                            method: "PUT",
                            credentials: "same-origin",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRF-TOKEN": csrfToken
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                    if (redirectIfUnauthorized(response)) {
                        return;
                    }

                    const data = await readJson(response);

                    if (!response.ok) {
                        throw new Error(
                            getErrorMessage(
                                data,
                                "Không thể lưu sở thích."
                            )
                        );
                    }

                    showMessage(
                        preferencesMessage,
                        data.message ||
                            "Đã lưu sở thích lưu trú thành công!",
                        "success"
                    );

                } catch (error) {
                    showMessage(
                        preferencesMessage,
                        error.message ||
                            "Có lỗi khi lưu sở thích.",
                        "error"
                    );
                } finally {
                    savePreferencesButton.disabled = false;
                }
            }
        );
    }

    loadProfile();

    if (initialTab === "preferences") {
        loadPreferences();
    }


});
