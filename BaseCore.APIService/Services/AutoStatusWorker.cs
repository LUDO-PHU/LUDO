using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Services
{
    public class AutoStatusWorker : BackgroundService
    {
        private readonly ILogger<AutoStatusWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;

        public AutoStatusWorker(
            ILogger<AutoStatusWorker> logger,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AutoStatusWorker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAutoTransitionsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing AutoStatusWorker.");
                }

                await Task.Delay(GetWorkerDelay(), stoppingToken);
            }

            _logger.LogInformation("AutoStatusWorker is stopping.");
        }

        private async Task ProcessAutoTransitionsAsync()
        {
            var returnAfterDays = _configuration.GetValue<int>("BusinessRules:AutoReturnAfterDays", 3);
            var cutoff = DateTime.UtcNow.AddDays(-returnAfterDays);

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BaseCoreSalesContext>();
            var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

            // Lấy các đơn hàng đang giao đã quá thời hạn xác nhận nhận hàng
            var overdueOrders = await db.Orders
                .Where(o =>
                    (o.Status == OrderStatus.Shipping ||
                     o.Status == OrderStatus.Confirmed ||
                     o.Status == OrderStatus.Delivered) &&
                    o.ShippingAt != null &&
                    o.ShippingAt <= cutoff)
                .Select(o => o.Id)
                .ToListAsync();

            if (overdueOrders.Count == 0)
            {
                return;
            }

            _logger.LogInformation(
                "AutoStatusWorker: Found {Count} order(s) to auto-return to stock (ShippingAt <= {Cutoff:yyyy-MM-dd HH:mm} UTC).",
                overdueOrders.Count,
                cutoff);

            foreach (var orderId in overdueOrders)
            {
                try
                {
                    var result = await orderService.ReturnToStockAsync(orderId);
                    if (result.Success)
                    {
                        _logger.LogInformation(
                            "AutoStatusWorker: Order #{OrderId} has been auto-returned to stock.",
                            orderId);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "AutoStatusWorker: Could not return order #{OrderId} to stock: {Message}",
                            orderId,
                            result.Message);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "AutoStatusWorker: Exception while returning order #{OrderId} to stock.", orderId);
                }
            }
        }

        private TimeSpan GetWorkerDelay()
        {
            var intervalSeconds = _configuration.GetValue<int>(
                "BusinessRules:AutoStatusWorkerIntervalSeconds",
                30);

            return TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));
        }
    }
}
