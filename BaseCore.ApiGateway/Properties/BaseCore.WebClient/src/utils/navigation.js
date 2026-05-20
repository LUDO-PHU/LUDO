export const goBackOrHome = (navigate, fallback = '/customer/home') => {
    if (window.history.length > 1) {
        navigate(-1);
        return;
    }

    navigate(fallback, { replace: true });
};
