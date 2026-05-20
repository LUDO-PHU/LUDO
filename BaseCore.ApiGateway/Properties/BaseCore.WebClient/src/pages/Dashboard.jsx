import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import '../styles/admin.css';

const ChartFrame = ({ height = 350, children }) => {
    const ref = useRef(null);
    const [hasWidth, setHasWidth] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const updateWidth = () => {
            setHasWidth(node.getBoundingClientRect().width > 0);
        };

        updateWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        const observer = new ResizeObserver(updateWidth);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ width: '100%', height: `${height}px`, minHeight: `${height}px`, minWidth: 0 }}>
            {hasWidth ? children : null}
        </div>
    );
};

const Dashboard = () => {
    const { showToast } = useToast();

    // Khớp với DashboardStatsDto từ backend:
    // { totalRevenue, totalProfit, totalProducts, totalOrders, totalReceipts,
    //   revenueChart: [{label, value}], orderStatusChart: [{label, value}],
    //   recentOrders: [...], recentReceipts: [...] }
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartsReady, setChartsReady] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                // Đúng route: GET /api/dashboard/stats
                const res = await api.get('/dashboard/stats');
                // res.data = ApiResponse<DashboardStatsDto>
                setStats(res.data?.data || null);
            } catch (err) {
                console.error(err);
                showToast('Không thể tải dữ liệu thống kê', 'danger');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [showToast]);

    useEffect(() => {
        let frameOne;
        let frameTwo;
        frameOne = window.requestAnimationFrame(() => {
            frameTwo = window.requestAnimationFrame(() => setChartsReady(true));
        });
        return () => {
            window.cancelAnimationFrame(frameOne);
            window.cancelAnimationFrame(frameTwo);
        };
    }, []);

    const fmtVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    const cardStyle = {
        padding: '24px', borderRadius: '12px', background: '#fff',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex',
        alignItems: 'center', gap: '20px'
    };
    const iconWrapStyle = {
        width: '60px', height: '60px', borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0
    };

    // Map revenueChart (label/value) sang định dạng recharts
    const revenueChartData = (stats?.revenueChart || []).map(d => ({ name: d.label, revenue: d.value }));
    const orderChartData = (stats?.orderStatusChart || []).map(d => ({ name: d.label, orders: d.value }));

    if (loading) {
        return (
            <div className="admin-layout">
                <div className="admin-container">
                    <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '16px' }}>
                        Đang tải dữ liệu thống kê...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>📊 Bảng điều khiển</h2>
                    <p style={{ color: '#6b7280', marginTop: '5px' }}>Tổng quan tình hình kinh doanh của cửa hàng.</p>
                </div>

                {/* 5 THẺ THỐNG KÊ KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div style={cardStyle}>
                        <div style={{ ...iconWrapStyle, background: '#dbeafe', color: '#4f46e5' }}><i className="fa fa-money-bill-wave"></i></div>
                        <div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Doanh Thu</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{fmtVND(stats?.totalRevenue)}</div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ ...iconWrapStyle, background: '#dcfce7', color: '#15803d' }}><i className="fa fa-chart-line"></i></div>
                        <div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Lợi Nhuận</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{fmtVND(stats?.totalProfit)}</div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ ...iconWrapStyle, background: '#fce7f3', color: '#e11d48' }}><i className="fa fa-box-open"></i></div>
                        <div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Đơn Hàng</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{stats?.totalOrders ?? 0} <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>đơn</span></div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ ...iconWrapStyle, background: '#f3e8ff', color: '#9333ea' }}><i className="fa fa-tags"></i></div>
                        <div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Sản Phẩm</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{stats?.totalProducts ?? 0} <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>món</span></div>
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ ...iconWrapStyle, background: '#fff7ed', color: '#d97706' }}><i className="fa fa-file-invoice"></i></div>
                        <div>
                            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Biên Lai Nhập</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{stats?.totalReceipts ?? 0} <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>phiếu</span></div>
                        </div>
                    </div>
                </div>

                {/* BIỂU ĐỒ */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                    {/* Biểu đồ Area (Doanh thu) */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '16px', color: '#374151' }}>
                            Biểu đồ Doanh thu (7 ngày gần nhất)
                        </h3>
                        <ChartFrame height={350}>
                            {chartsReady && revenueChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip formatter={(value) => fmtVND(value)} labelStyle={{ color: '#111827', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                    Chưa có dữ liệu doanh thu
                                </div>
                            )}
                        </ChartFrame>
                    </div>

                    {/* Biểu đồ Cột (Trạng thái đơn) */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '16px', color: '#374151' }}>
                            Phân loại Trạng thái Đơn hàng
                        </h3>
                        <ChartFrame height={350}>
                            {chartsReady && orderChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={orderChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} labelStyle={{ color: '#111827', fontWeight: 'bold' }} />
                                        <Bar dataKey="orders" name="Số đơn" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                    Chưa có dữ liệu đơn hàng
                                </div>
                            )}
                        </ChartFrame>
                    </div>
                </div>

                {/* BẢNG ĐƠN HÀNG GẦN ĐÂY */}
                {stats?.recentOrders?.length > 0 && (
                    <div className="card" style={{ padding: '24px', marginTop: '20px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#374151' }}>🕐 Đơn hàng gần đây</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Mã ĐH</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Khách hàng</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Tổng tiền</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentOrders.map(o => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4f46e5' }}>#{o.id}</td>
                                        <td style={{ padding: '10px 12px', color: '#374151' }}>{o.customerName || '—'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtVND(o.totalAmount)}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: o.status === 'Completed' ? '#dcfce7' : o.status === 'Pending' ? '#fef9c3' : '#f1f5f9', color: o.status === 'Completed' ? '#166534' : o.status === 'Pending' ? '#ca8a04' : '#475569' }}>
                                                {o.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
