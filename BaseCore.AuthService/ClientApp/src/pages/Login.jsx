import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

const Login = () => {
    const [mode, setMode] = useState("login");
    // State mặc định có userType = 0 (Khách hàng)
    const [form, setForm] = useState({ username: "", password: "", name: "", email: "", phone: "", userType: 0 });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                await authApi.register({
                    username: form.username,
                    password: form.password,
                    name: form.name || form.username,
                    email: form.email,
                    phone: form.phone,
                    userType: Number(form.userType), // Gửi quyền lên Backend: 0 là User, 1 là Admin
                });
            }

            const result = await login(form.username, form.password);

            if (result.success) {
                if (result.user.userType === 1) {
                    navigate('/admin');
                } else {
                    navigate('/customer/home');
                }
            } else {
                setError(typeof result.message === 'string' ? result.message : (result.error || 'Đăng nhập thất bại'));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xử lý yêu cầu. Vui lòng kiểm tra lại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ marginBottom: 32, textAlign: "center" }}>
                <div className="logo" style={{ justifyContent: "center", fontSize: 36, marginBottom: 8, color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '40px' }}>📱</span> PhoneStore
                </div>
                <p style={{ color: "var(--muted)", fontSize: 15, fontWeight: 500 }}>Hệ thống bán lẻ linh kiện chính hãng</p>
            </div>

            <div className="card" style={{ width: "100%", maxWidth: 420, padding: 32, background: '#fff', borderRadius: '16px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>

                <div className="tab-bar" style={{ marginBottom: 24, width: "100%", display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '6px' }}>
                    <button
                        type="button"
                        style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: mode === "login" ? '#fff' : 'transparent', color: mode === "login" ? 'var(--primary)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', boxShadow: mode === "login" ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        onClick={() => { setMode("login"); setError(""); }}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: mode === "register" ? '#fff' : 'transparent', color: mode === "register" ? 'var(--primary)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', boxShadow: mode === "register" ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        onClick={() => { setMode("register"); setError(""); }}
                    >
                        Đăng ký
                    </button>
                </div>

                {error && <div style={{ background: "#fee2e2", color: "#e11d48", padding: "12px 16px", borderRadius: '8px', marginBottom: 16, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>

                    {/* KHỐI CHỌN QUYỀN ĐÃ ĐƯỢC ĐƯA LÊN ĐẦU TIÊN CỦA FORM ĐĂNG KÝ */}
                    {mode === "register" && (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Loại tài khoản <span style={{ color: 'red' }}>*</span></label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: form.userType === 0 ? '2px solid var(--primary)' : '1px solid var(--border)', background: form.userType === 0 ? 'rgba(58, 134, 255, 0.08)' : '#f8fafc', color: form.userType === 0 ? 'var(--primary)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onClick={() => setForm({ ...form, userType: 0 })}
                                >
                                    👤 Người dùng
                                </button>
                                <button
                                    type="button"
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: form.userType === 1 ? '2px solid var(--primary)' : '1px solid var(--border)', background: form.userType === 1 ? 'rgba(58, 134, 255, 0.08)' : '#f8fafc', color: form.userType === 1 ? 'var(--primary)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onClick={() => setForm({ ...form, userType: 1 })}
                                >
                                    🛡️ Quản lý
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Tên đăng nhập {mode === 'register' && <span style={{ color: 'red' }}>*</span>}</label>
                        <input
                            className="input"
                            style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: '8px', fontSize: 14, outline: "none", background: '#f8fafc' }}
                            value={form.username}
                            placeholder={mode === 'register' ? "Nhập tên đăng nhập mới..." : "Nhập tên đăng nhập..."}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </div>

                    {mode === "register" && (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Họ và tên</label>
                            <input
                                className="input"
                                style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: '8px', fontSize: 14, outline: "none", background: '#f8fafc' }}
                                value={form.name}
                                placeholder="Ví dụ: Nguyễn Văn A"
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Mật khẩu {mode === 'register' && <span style={{ color: 'red' }}>*</span>}</label>
                        <input
                            className="input"
                            type="password"
                            style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: '8px', fontSize: 14, outline: "none", background: '#f8fafc' }}
                            value={form.password}
                            minLength={6}
                            placeholder={mode === 'register' ? "Mật khẩu (ít nhất 6 ký tự)" : "Nhập mật khẩu..."}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    {mode === "register" && (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Email</label>
                                <input
                                    className="input"
                                    type="email"
                                    style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: '8px', fontSize: 14, outline: "none", background: '#f8fafc' }}
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Số điện thoại</label>
                                <input
                                    className="input"
                                    type="tel"
                                    style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: '8px', fontSize: 14, outline: "none", background: '#f8fafc' }}
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: "100%", padding: "14px", marginTop: "8px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: '8px', fontSize: 15, fontWeight: 700, cursor: "pointer", transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(58, 134, 255, 0.2)' }}
                    >
                        {loading ? "Đang xử lý..." : (mode === "login" ? "ĐĂNG NHẬP" : "HOÀN TẤT ĐĂNG KÝ")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;