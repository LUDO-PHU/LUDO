import React, { useEffect, useState } from 'react';
import { orderApi } from '../services/api';

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN') + 'đ';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderApi.getAll();
      setOrders(response.data || []);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (orderId, status) => {
    try {
      await orderApi.updateStatus(orderId, status);
      loadOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Cập nhật đơn hàng thất bại');
    }
  };

  return (
    <>
      <div className="content-header"><div className="container-fluid"><h1 className="m-0">Quản lý đơn hàng người dùng</h1></div></div>
      <section className="content">
        <div className="container-fluid">
          <div className="card"><div className="card-body table-responsive">
            {loading ? <div className="text-center py-4">Đang tải...</div> : (
              <table className="table table-bordered">
                <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}<div className="small text-muted">{new Date(order.orderDate).toLocaleString('vi-VN')}</div></td>
                      <td><strong>{order.customerName}</strong><div>{order.customerPhone}</div><small>{order.shippingAddress}</small>{order.deliveryFrom && <div className="small text-success">Giao dự kiến {new Date(order.deliveryFrom).toLocaleDateString('vi-VN')} - {new Date(order.deliveryTo).toLocaleDateString('vi-VN')}</div>}</td>
                      <td>{(order.details || order.Details || []).map((d) => <div key={d.id || d.productId}>{d.productName || d.ProductName} x {d.quantity}</div>)}</td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td><span className={`badge ${order.status === 'Confirmed' ? 'badge-success' : order.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>{order.status}</span></td>
                      <td><div className="btn-group"><button className="btn btn-sm btn-success" disabled={order.status === 'Confirmed'} onClick={() => updateStatus(order.id, 'Confirmed')}>Xác nhận</button><button className="btn btn-sm btn-outline-danger" disabled={order.status === 'Cancelled'} onClick={() => updateStatus(order.id, 'Cancelled')}>Hủy</button></div></td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-4">Chưa có đơn hàng.</td></tr>}
                </tbody>
              </table>
            )}
          </div></div>
        </div>
      </section>
    </>
  );
};

export default Orders;
