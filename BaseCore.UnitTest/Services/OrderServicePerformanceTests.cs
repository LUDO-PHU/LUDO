using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using Moq;

namespace BaseCore.UnitTest.Services
{
    [TestFixture]
    public class OrderServicePerformanceTests : BaseConfigService
    {
        private BaseCoreSalesContext _db;
        private OrderService _orderService;
        private Mock<INotificationService> _mockNotificationService;

        [SetUp]
        public void Setup()
        {
            var options = new DbContextOptionsBuilder<BaseCoreSalesContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _db = new BaseCoreSalesContext(options);

            var orderRepo = new OrderRepositoryEF(_db);
            var productRepo = new ProductRepositoryEF(_db);
            var userRepo = new UserRepositoryEF(_db);
            var cartRepo = new Mock<ICartRepository>().Object;
            _mockNotificationService = new Mock<INotificationService>();

            _orderService = new OrderService(
                orderRepo,
                productRepo,
                userRepo,
                cartRepo,
                _mockNotificationService.Object,
                _db);
        }

        [TearDown]
        public void TearDown()
        {
            _db.Dispose();
        }

        [Test]
        public async Task Test_CancelOrder_Performance()
        {
            // Arrange
            int numProducts = 1000;

            var user = new User { Id = 1, FullName = "Test User", Email = "test@example.com", IsActive = true };
            _db.Users.Add(user);

            var category = new Category { Id = 1, NameVi = "Test Category" };
            _db.Categories.Add(category);

            var supplier = new Supplier { Id = 1, CompanyName = "Test Supplier", UserId = 1 };
            _db.Suppliers.Add(supplier);

            var order = new Order
            {
                UserId = 1,
                Status = OrderStatus.Pending,
                OrderCode = "ORD-TEST",
                OrderDetails = new List<OrderDetail>()
            };

            for (int i = 1; i <= numProducts; i++)
            {
                var product = new Product
                {
                    Id = i,
                    NameVi = $"Product {i}",
                    Stock = 10,
                    CategoryId = 1,
                    Status = "Active",
                    Price = 100
                };
                _db.Products.Add(product);

                var batch = new StockBatch
                {
                    Id = i,
                    ProductId = i,
                    SupplierId = 1,
                    QuantityRemaining = 5,
                    UnitImportPrice = 50
                };
                _db.StockBatches.Add(batch);

                var orderDetail = new OrderDetail
                {
                    ProductId = i,
                    Quantity = 1,
                    UnitPrice = 100,
                    StockAllocations = new List<OrderStockAllocation>
                    {
                        new OrderStockAllocation
                        {
                            StockBatchId = i,
                            Quantity = 1,
                            UnitImportPrice = 50
                        }
                    }
                };
                order.OrderDetails.Add(orderDetail);
            }

            _db.Orders.Add(order);
            await _db.SaveChangesAsync();

            // Act
            var stopwatch = Stopwatch.StartNew();

            var result = await _orderService.CancelAsync(order.Id, isAdmin: true, "Test Cancel");

            stopwatch.Stop();

            // Assert
            Assert.That(result.Success, Is.True);

            // Log elapsed time to console to serve as a measurement
            Console.WriteLine($"[PERFORMANCE_MEASURE] CancelOrder with {numProducts} products took {stopwatch.ElapsedMilliseconds} ms");

            // A basic check that the products stock was incremented
            var firstProduct = await _db.Products.FindAsync(1);
            Assert.That(firstProduct.Stock, Is.EqualTo(11));

            var firstBatch = await _db.StockBatches.FindAsync(1);
            Assert.That(firstBatch.QuantityRemaining, Is.EqualTo(6));
        }
    }
}
