import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div className="notification" style={{
                    borderLeft: `4px solid var(--${toast.type})`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    {toast.type === 'success' && '✅'}
                    {toast.type === 'danger' && '❌'}
                    {toast.type === 'warning' && '⚠️'}
                    {toast.type === 'info' && '💡'}
                    {toast.message}
                </div>
            )}
        </ToastContext.Provider>
    );
};