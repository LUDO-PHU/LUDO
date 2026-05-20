import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, loading, user } = useAuth();

    // 1. Đợi quá trình kiểm tra đăng nhập hoàn tất để tránh đá nhầm về Login
    if (loading) {
        return null; // Trả về null để màn hình giữ nguyên trạng thái cũ thay vì hiện spinner gây lặp render
    }

    // 2. Nếu chưa đăng nhập, đá về trang Login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 3. Lấy đúng userType từ mockDB (0: Khách, 1: Admin)[cite: 3, 4]
    const currentUserType = user?.userType;

    // 4. Kiểm tra quyền truy cập dựa trên danh sách roles truyền vào (ví dụ: [1] hoặc [0])
    if (roles && !roles.includes(currentUserType)) {
        // Nếu là User mà cố vào trang Admin, đá về trang chủ Customer[cite: 4]
        if (currentUserType === 0) {
            return <Navigate to="/customer/home" replace />;
        }
        // Các trường hợp khác đá về gốc
        return <Navigate to="/" replace />;
    }

    // 5. Nếu mọi thứ hợp lệ, hiển thị nội dung bên trong (Layout)
    return children;
};

export default ProtectedRoute;