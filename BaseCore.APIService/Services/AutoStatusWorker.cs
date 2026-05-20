using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services;

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
            // Supplier receipts are now completed only by explicit Admin approval.
            // Orders also stay in Shipping until the owning user confirms receipt.
            await Task.CompletedTask;
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
