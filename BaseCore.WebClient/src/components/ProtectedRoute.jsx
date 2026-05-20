import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const currentUserType = user?.userType;
    if (roles && !roles.includes(currentUserType)) {
        if (currentUserType === 0) {
            return <Navigate to="/customer/home" replace />;
        }
        if (currentUserType === 2) {
            return <Navigate to="/admin/supplier-home" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
