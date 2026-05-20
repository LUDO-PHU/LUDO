using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class RevenueService : IRevenueService
    {
        private readonly BaseCoreSalesContext _db;

        public RevenueService(BaseCoreSalesContext db)
        {
            _db = db;
        }

        public async Task<ApiResponse<AdminRevenueDto>> GetAdminRevenueAsync()
        {
            var adminImportCost = await _db.RevenueTransactions
                .Where(t => t.OwnerType == "Admin" && t.TransactionType == "AdminImportCost")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            var saleProfit = await _db.RevenueTransactions
                .Where(t => t.OwnerType == "Admin" && t.TransactionType == "AdminSaleProfit")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            return ApiResponse<AdminRevenueDto>.Ok(new AdminRevenueDto
            {
                TotalImportCost = Math.Abs(adminImportCost),
                TotalSaleProfit = saleProfit,
                CurrentRevenue = adminImportCost + saleProfit
            });
        }

        public async Task<decimal> GetSupplierRevenueAsync(int supplierId)
        {
            return await _db.RevenueTransactions
                .Where(t => t.OwnerType == "Supplier" &&
                            t.OwnerId == supplierId &&
                            t.TransactionType == "SupplierReceiptRevenue")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;
        }
    }
}
