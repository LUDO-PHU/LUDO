export const getTierDiscountRate = (tier) => {
    switch (tier) {
        case "Kim cương": return 0.10;
        case "Vàng": return 0.07;
        case "Bạc": return 0.05;
        case "Đồng": return 0.02;
        default: return 0;
    }
};

export const calculateItemDiscount = (item, userTier) => {
    // Determine base price from item API. 
    // item.price is the unit price (which already has product.DiscountPercent applied from backend).
    const basePrice = Number(item.price || item.Price || 0);

    const quantityDiscountRate = item.quantity >= 3 ? 0.10 : 0;
    const tierDiscountRate = getTierDiscountRate(userTier);
    
    // Additive discount rates
    const itemDiscountRate = tierDiscountRate + quantityDiscountRate;
    
    const finalPrice = Math.round(basePrice * (1 - itemDiscountRate));
    
    return {
        basePrice,
        finalPrice,
        discountRate: itemDiscountRate,
        tierDiscountRate,
        quantityDiscountRate
    };
};

export const calculateOrderTotal = (selectedItems, userTier) => {
    let subTotal = 0;
    
    selectedItems.forEach(item => {
        const { finalPrice } = calculateItemDiscount(item, userTier);
        subTotal += finalPrice * item.quantity;
    });

    const isLargeOrder = subTotal > 5000000;
    let totalAmount = subTotal;
    
    if (isLargeOrder) {
        totalAmount = Math.round(subTotal * 0.80);
    }

    return {
        subTotal,
        totalAmount,
        isLargeOrder,
        largeOrderDiscount: isLargeOrder ? 0.20 : 0
    };
};
