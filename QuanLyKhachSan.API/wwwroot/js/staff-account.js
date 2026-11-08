
"use strict";

document.addEventListener("staff-auth-ready", () => {
    const s = Staff;

    const page = document.getElementById("staffAccountPage");
    const message = document.getElementById("staffAccountMessage");

    const profileForm = document.getElementById("staffProfileForm");
    const passwordForm = document.getElementById("staffPasswordForm");

    const fields = {
        id: document.getElementById("staffAccountId"),
        username: document.getElementById("staffAccountUsername"),
        position: document.getElementById("staffAccountPosition"),
        startDate: document.getElementById("staffAccountStartDate"),
        status: document.getElementById("staffAccountStatus"),
        createdAt: document.getElementById("staffAccountCreatedAt"),

        fullName: document.getElementById("staffFullName"),
        phone: document.getElementById("staffPhone"),
        email: document.getElementById("staffEmail"),
        address: document.getElementById("staffAddress"),

        oldPassword: document.getElementById("staffOldPassword"),
        newPassword: document.getElementById("staffNewPassword"),
        confirmPassword: document.getElementById("staffConfirmPassword"),

        showPassword: document.getElementById("staffShowPassword"),
        reset: document.getElementById("staffResetProfile"),
        save: document.getElementById("staffSaveProfile"),
        changePassword: document.getElementById("staffChangePassword")
    };

    let originalProfile = null;
    let savingProfile = false;
    let changingPassword = false;

    if (!page || !profileForm || !passwordForm) return;

    if (s.content) {
        s.content.appendChild(page);
    }

    page.hidden = false;

    function notify(text, isError = false) {
        message.textContent = text;
        message.hidden = !text;
        message.classList.toggle("error", isError);
        message.classList.toggle("success", !isError);
    }

    function text(element, value) {
        if (element) {
            element.textContent = value ?? "—";
        }
    }

    function date(value) {
        if (!value) return "—";

        const parts = String(value).split("T")[0].split("-");

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        return s.date(value);
    }

    function fillProfile(profile) {
        text(fields.id, "#" + profile.id);
        text(fields.username, profile.username);
        text(fields.position, profile.position || "Nhân viên");
        text(fields.startDate, date(profile.startDate));
        text(fields.status, profile.active ? "Đang hoạt động" : "Ngừng hoạt động");
        text(fields.createdAt, date(profile.createdAt));

        fields.fullName.value = profile.fullName || "";
        fields.phone.value = profile.phone || "";
        fields.email.value = profile.email || "";
        fields.address.value = profile.address || "";

        originalProfile = {
            ...profile
        };
    }

    async function loadProfile() {
        try {
            notify("");

            const profile = await s.api("account/profile");
            fillProfile(profile);
        } catch (error) {
            notify(
                error.message || "Không thể tải thông tin nhân viên.",
                true
            );
        }
    }

    function resetProfile() {
        if (!originalProfile) return;

        fillProfile(originalProfile);
        notify("");
    }

    async function saveProfile(event) {
        event.preventDefault();

        if (savingProfile) return;

        const fullName = fields.fullName.value.trim();
        const phone = fields.phone.value.trim();
        const email = fields.email.value.trim();
        const address = fields.address.value.trim();

        if (fullName.length < 2 || fullName.length > 100) {
            notify("Họ tên phải có từ 2 đến 100 ký tự.", true);
            fields.fullName.focus();
            return;
        }

        if (phone && !/^\+?[0-9]{9,15}$/.test(phone)) {
            notify("Số điện thoại không hợp lệ.", true);
            fields.phone.focus();
            return;
        }

        if (!profileForm.reportValidity()) return;

        savingProfile = true;
        fields.save.disabled = true;
        fields.save.textContent = "Đang lưu...";

        try {
            const result = await s.api(
                "account/profile",
                "PUT",
                {
                    hoTen: fullName,
                    soDienThoai: phone,
                    email,
                    diaChi: address
                }
            );

            await loadProfile();
            notify(result.message || "Đã lưu thông tin cá nhân.");
        } catch (error) {
            notify(error.message || "Không thể lưu thông tin.", true);
        } finally {
            savingProfile = false;
            fields.save.disabled = false;
            fields.save.textContent = "Lưu thay đổi";
        }
    }

    function togglePasswordVisibility() {
        const type = fields.showPassword.checked ? "text" : "password";

        fields.oldPassword.type = type;
        fields.newPassword.type = type;
        fields.confirmPassword.type = type;
    }

    async function changePassword(event) {
        event.preventDefault();

        if (changingPassword) return;

        const oldPassword = fields.oldPassword.value;
        const newPassword = fields.newPassword.value;
        const confirmPassword = fields.confirmPassword.value;

        if (!oldPassword) {
            notify("Vui lòng nhập mật khẩu hiện tại.", true);
            fields.oldPassword.focus();
            return;
        }

        if (newPassword.length < 12 || newPassword.length > 128) {
            notify("Mật khẩu mới phải có từ 12 đến 128 ký tự.", true);
            fields.newPassword.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            notify("Xác nhận mật khẩu mới không khớp.", true);
            fields.confirmPassword.focus();
            return;
        }

        if (oldPassword === newPassword) {
            notify("Mật khẩu mới phải khác mật khẩu hiện tại.", true);
            return;
        }

        if (!confirm("Bạn có chắc muốn đổi mật khẩu tài khoản?")) {
            return;
        }

        changingPassword = true;
        fields.changePassword.disabled = true;
        fields.changePassword.textContent = "Đang cập nhật...";

        try {
            const result = await s.api(
                "account/change-password",
                "POST",
                {
                    matKhauCu: oldPassword,
                    matKhauMoi: newPassword,
                    xacNhanMatKhau: confirmPassword
                }
            );

            passwordForm.reset();
            togglePasswordVisibility();

            alert(
                result.message ||
                "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
            );

            window.location.replace(result.redirectUrl || "/login.html");
        } catch (error) {
            notify(error.message || "Không thể đổi mật khẩu.", true);
        } finally {
            changingPassword = false;
            fields.changePassword.disabled = false;
            fields.changePassword.textContent = "Đổi mật khẩu";
        }
    }

    profileForm.addEventListener("submit", saveProfile);
    passwordForm.addEventListener("submit", changePassword);

    fields.reset.addEventListener("click", resetProfile);
    fields.showPassword.addEventListener("change", togglePasswordVisibility);

    loadProfile();
});
