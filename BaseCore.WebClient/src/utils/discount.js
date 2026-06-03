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
    const originalPrice = Number(item.originalPrice || item.OriginalPrice || basePrice);
    const discountPercent = Number(item.discountPercent || item.DiscountPercent || 0);

    const quantityDiscountRate = item.quantity >= 3 ? 0.10 : 0;
    const tierDiscountRate = getTierDiscountRate(userTier);
    
    // Additive discount rates
    const itemDiscountRate = tierDiscountRate + quantityDiscountRate;
    
    const finalPrice = Math.round(basePrice * (1 - itemDiscountRate));
    
    // Calculate breakdown for details
    const productDiscountAmount = (originalPrice - basePrice) * item.quantity;
    const tierDiscountAmount = Math.round(basePrice * tierDiscountRate * item.quantity);
    const quantityDiscountAmount = Math.round(basePrice * quantityDiscountRate * item.quantity);
    const totalItemDiscountAmount = (originalPrice * item.quantity) - (finalPrice * item.quantity);
    
    return {
        originalPrice,
        discountPercent,
        basePrice,
        finalPrice,
        discountRate: itemDiscountRate,
        tierDiscountRate,
        quantityDiscountRate,
        productDiscountAmount,
        tierDiscountAmount,
        quantityDiscountAmount,
        totalItemDiscountAmount
    };
};

export const calculateOrderTotal = (selectedItems, userTier) => {
    let subTotal = 0; // Total after item-level privileges, before order-level privileges
    let totalOriginal = 0; // Total before any discounts
    let totalProductDiscount = 0;
    let totalTierDiscount = 0;
    let totalQuantityDiscount = 0;
    
    selectedItems.forEach(item => {
        const d = calculateItemDiscount(item, userTier);
        subTotal += d.finalPrice * item.quantity;
        totalOriginal += d.originalPrice * item.quantity;
        totalProductDiscount += d.productDiscountAmount;
        totalTierDiscount += d.tierDiscountAmount;
        totalQuantityDiscount += d.quantityDiscountAmount;
    });

    const isLargeOrder = subTotal > 5000000;
    let totalAmount = subTotal;
    let largeOrderDiscountAmount = 0;
    
    if (isLargeOrder) {
        totalAmount = Math.round(subTotal * 0.80);
        largeOrderDiscountAmount = subTotal - totalAmount;
    }

    const totalReduced = totalOriginal - totalAmount;

    return {
        totalOriginal,
        totalProductDiscount,
        totalTierDiscount,
        totalQuantityDiscount,
        largeOrderDiscountAmount,
        subTotal,
        totalAmount,
        isLargeOrder,
        largeOrderDiscount: isLargeOrder ? 0.20 : 0,
        totalReduced
    };
};
