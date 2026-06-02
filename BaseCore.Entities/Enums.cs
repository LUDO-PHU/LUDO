namespace BaseCore.Entities
{
    public enum Role
    {
        Admin,
        User,
        Supplier
    }

    public enum OrderStatus
    {
        Pending,
        Confirmed,
        Shipping,
        Delivered,
        Completed,
        CancelledByUser,
        CancelledByAdmin,
        Rejected,
        Cancelled,
        ReturnedToStock
    }

    public enum ReceiptStatus
    {
        Pending,
        Confirmed,
        Shipping,
        Delivered,
        CancelledBySupplier,
        RejectedByAdmin,
        PendingAdminReview = Pending,
        ApprovedByAdmin = Delivered,
        Completed = Delivered
    }

    public enum ReceiptType
    {
        ProposalReceipt,
        RequestedReceipt
    }

    public enum SupplierRequestStatus
    {
        Pending,
        ApprovedBySupplier,
        RejectedBySupplier,
        ReceiptCreated,
        Completed,
        Cancelled
    }
}
