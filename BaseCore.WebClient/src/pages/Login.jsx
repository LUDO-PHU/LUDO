import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

const Login = () => {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        userType: 0,
        companyName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const updateForm = (field, value) => setForm(current => ({ ...current, [field]: value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                const regResult = await authApi.register({
                    username: form.username,
                    password: form.password,
                    fullName: form.name || form.username,
                    email: form.email,
                    phone: form.phone,
                    role: Number(form.userType) === 2 ? 'Supplier' : 'User',
                    companyName: form.companyName || form.name || form.username,
                });

                if (regResult?.data?.success === false) {
                    setError(regResult.data.message || 'Đăng ký thất bại, tên đăng nhập có thể đã tồn tại.');
                    setLoading(false);
                    return;
                }
            }

            const result = await login(form.username, form.password);
            if (result.success) {
                navigate(result.user.userType === 1 || result.user.userType === 2 ? '/admin' : '/customer/home');
            } else {
                setError(typeof result.message === 'string' ? result.message : (result.error || 'Đăng nhập thất bại.'));
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu. Kiểm tra dịch vụ máy chủ rồi thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-screen">
            <section className="auth-panel">
                <div className="auth-panel__visual">
                    <img src="/banner/A8.png" alt="Ảnh đăng nhập PhoneStore" />
                </div>

                <div className="auth-card">
                    <div className="auth-tabs">
                        <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError(''); }}>
                            Đăng nhập
                        </button>
                        <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError(''); }}>
                            Đăng ký
                        </button>
                    </div>

                    {error && (
                        <div className="form-alert">
                            <i className="fa fa-triangle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {mode === 'register' && (
                            <div className="form-group">
                                <label>Loại tài khoản</label>
                                <div className="account-type-grid">
                                    <button type="button" className={form.userType === 0 ? 'is-active' : ''} onClick={() => updateForm('userType', 0)}>
                                        <i className="fa fa-user"></i>
                                        Khách
                                    </button>
                                    <button type="button" className={form.userType === 2 ? 'is-active' : ''} onClick={() => updateForm('userType', 2)}>
                                        <i className="fa fa-store"></i>
                                        Nhà cung cấp
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Tên đăng nhập</label>
                            <input value={form.username} onChange={event => updateForm('username', event.target.value)} required />
                        </div>

                        {mode === 'register' && (
                            <div className="form-group">
                                <label>Họ và tên</label>
                                <input value={form.name} onChange={event => updateForm('name', event.target.value)} required />
                            </div>
                        )}

                        {mode === 'register' && Number(form.userType) === 2 && (
                            <div className="form-group">
                                <label>Tên công ty / nhà cung cấp</label>
                                <input value={form.companyName} onChange={event => updateForm('companyName', event.target.value)} required />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Mật khẩu</label>
                            <input type="password" value={form.password} minLength={6} onChange={event => updateForm('password', event.target.value)} required />
                        </div>

                        {mode === 'register' && (
                            <div className="two-column-fields">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={form.email} onChange={event => updateForm('email', event.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input type="tel" value={form.phone} onChange={event => updateForm('phone', event.target.value)} />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="submit-button" disabled={loading}>
                            {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Hoàn tất đăng ký')}
                        </button>
                    </form>

                    <Link to="/customer/home" className="back-shop-link">
                        <i className="fa fa-arrow-left"></i>
                        Về trang mua hàng
                    </Link>
                </div>
            </section>
        </main>
    );
};

export default Login;
