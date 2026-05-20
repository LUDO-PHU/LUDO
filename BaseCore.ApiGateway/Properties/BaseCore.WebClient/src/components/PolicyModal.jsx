import React from 'react';

const PolicyModal = ({ onClose }) => {
    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={onClose}
        >
            <div
                style={{ background: '#fff', width: '90%', maxWidth: '600px', borderRadius: '16px', padding: '30px', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Chính sách cửa hàng</h3>
                    <button
                        style={{ border: 'none', background: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                    <h4 style={{ fontSize: '15px', color: '#0ea5e9', marginBottom: '8px', fontWeight: '700' }}>1. Chính sách bán hàng</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>Tất cả linh kiện điện thoại được bán tại cửa hàng đều là hàng chính hãng, có nguồn gốc xuất xứ rõ ràng. Chúng tôi cam kết cung cấp sản phẩm chất lượng cao với giá cạnh tranh nhất thị trường.</p>

                    <h4 style={{ fontSize: '15px', color: '#0ea5e9', marginBottom: '8px', fontWeight: '700' }}>2. Chính sách bảo hành & Đổi trả</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>Bảo hành từ 3 đến 12 tháng tùy loại linh kiện. Khách hàng có thể đổi trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng nếu phát hiện lỗi từ nhà sản xuất. Sản phẩm phải còn nguyên vẹn, chưa qua lắp ráp.</p>

                    <h4 style={{ fontSize: '15px', color: '#0ea5e9', marginBottom: '8px', fontWeight: '700' }}>3. Chính sách giao hàng & Thanh toán</h4>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', lineHeight: '1.6' }}>Miễn phí giao hàng cho đơn từ 500.000đ. Chúng tôi chấp nhận thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng và các ví điện tử phổ biến.</p>
                </div>

                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <button
                        style={{ width: '100%', padding: '12px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                        onClick={onClose}
                    >
                        Tôi đã hiểu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PolicyModal;