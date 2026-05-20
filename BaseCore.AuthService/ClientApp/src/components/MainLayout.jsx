import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button">
              <i className="fas fa-bars"></i>
            </a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item dropdown">
            <a className="nav-link" data-toggle="dropdown" href="#">
              <i className="fas fa-user"></i> {user?.name || 'User'}
            </a>
            <div className="dropdown-menu dropdown-menu-right">
              <a href="#" className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2"></i> Logout
              </a>
            </div>
          </li>
        </ul>
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="/" className="brand-link">
          <span className="brand-text font-weight-light ml-3">
            <b>Econent</b>Tech
          </span>
        </a>
        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="image">
              <i className="fas fa-user-circle fa-2x text-light"></i>
            </div>
            <div className="info">
              <a href="#" className="d-block">{user?.name || 'User'}</a>
            </div>
          </div>
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              <li className="nav-item">
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                  <i className="nav-icon fas fa-tachometer-alt"></i>
                  <p>Tổng quan</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/products" className={`nav-link ${isActive('/products')}`}>
                  <i className="nav-icon fas fa-shopping-cart"></i>
                  <p>Sản phẩm</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/categories" className={`nav-link ${isActive('/categories')}`}>
                  <i className="nav-icon fas fa-tags"></i>
                  <p>Danh mục</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/orders" className={`nav-link ${isActive('/orders')}`}>
                  <i className="nav-icon fas fa-bag-shopping"></i>
                  <p>Đơn hàng</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/users" className={`nav-link ${isActive('/users')}`}>
                  <i className="nav-icon fas fa-users"></i>
                  <p>Tài khoản</p>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {children}
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <strong>EconentTech Admin</strong>
        <div className="float-right d-none d-sm-inline-block">
          <b>Version</b> 1.0.0
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
