import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { goBackOrHome } from "../../utils/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { userApi } from "../../services/api";

const Profile = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const getTierColor = (tier) => {
        if (!tier) return '#d97706';
        const t = tier.toLowerCase();
        if (t.includes('vàng') || t.includes('gold')) return '#fde047';
        if (t.includes('bạc') || t.includes('silver')) return '#64748b';
        if (t.includes('đồng') || t.includes('bronze')) return '#d97706';
        return '#fde047';
    };
    const tierColor = getTierColor(user?.tier);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name || "" }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            return showToast("Mật khẩu xác nhận không khớp!", "danger");
        }

        if (formData.newPassword && !formData.oldPassword) {
            return showToast("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu!", "warning");
        }

        setIsLoading(true);
        try {
            // Gọi API thật: PUT /api/users/profile
            const payload = {
                fullName: formData.name,
            };
            // Chỉ gửi thông tin đổi mật khẩu nếu user nhập
            if (formData.newPassword) {
                payload.oldPassword = formData.oldPassword;
                payload.newPassword = formData.newPassword;
            }

            await userApi.updateProfile(payload);

            // Cập nhật AuthContext để header và Profile hiển thị tên mới
            updateUser({ name: formData.name });

            showToast("Cập nhật tài khoản thành công!", "success");
            setFormData(prev => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
        } catch (error) {
            const msg = error.response?.data?.message || "Có lỗi xảy ra khi cập nhật!";
            showToast(msg, "danger");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '40px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>

                <div style={{ marginBottom: '20px' }}>
                    <button type="button" onClick={() => goBackOrHome(navigate)} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', padding: 0 }}>
                        ← Quay lại
                    </button>
                </div>

                {/* TIÊU ĐỀ & AVATAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '30px', marginBottom: '30px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #0ea5e9, #1e3a8a)', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '32px', border: `3px solid ${tierColor}`, boxShadow: `0 0 15px ${tierColor}66` }}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Hồ Sơ Của Tôi</h2>
                        <div style={{ display: 'inline-block', padding: '4px 12px', background: '#f8fafc', border: `1px solid ${tierColor}`, borderRadius: '20px', fontSize: '13px', fontWeight: '800', color: tierColor, textTransform: 'uppercase' }}>
                            🏆 Khách Hàng Hạng {user?.tier || 'Đồng'}
                        </div>
                    </div>
                </div>

                {/* FORM CHỈNH SỬA */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Username — chỉ đọc */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Tên đăng nhập (Không thể đổi)</label>
                        <input type="text" value={user?.userName || "user_demo"} disabled style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#94a3b8', fontSize: '15px', fontWeight: '600', cursor: 'not-allowed', boxSizing: 'border-box' }} />
                    </div>

                    {/* Tên hiển thị */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Tên hiển thị</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', boxSizing: 'border-box' }} placeholder="Nhập tên của bạn..." />
                    </div>

                    {/* Đổi mật khẩu */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1', marginTop: '10px' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e3a8a', fontWeight: '800' }}>🔒 Đổi mật khẩu (Bỏ qua nếu không muốn đổi)</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="password" name="oldPassword" value={formData.oldPassword} onChange={handleChange} placeholder="Mật khẩu hiện tại" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                            <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Mật khẩu mới" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Xác nhận mật khẩu mới" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{ marginTop: '15px', width: '100%', padding: '14px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '800', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    >
                        {isLoading ? "Đang lưu..." : <><i className="fa fa-save"></i> LƯU THAY ĐỔI</>}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Profile;