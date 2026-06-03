using System;
using NUnit.Framework;
using BaseCore.Entities;
using BaseCore.Services;

namespace BaseCore.UnitTest.Services
{
    [TestFixture]
    public class ProductServiceTests
    {
        [Test]
        public void CalculateFinalPrice_WithValidPriceAndDiscount_ReturnsCorrectDiscountedPrice()
        {
            // Arrange
            var product = new Product { Price = 100m, DiscountPercent = 20m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(80m));
        }

        [Test]
        public void CalculateFinalPrice_WithZeroDiscount_ReturnsOriginalPrice()
        {
            // Arrange
            var product = new Product { Price = 150.5m, DiscountPercent = 0m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(150.5m));
        }

        [Test]
        public void CalculateFinalPrice_WithOneHundredPercentDiscount_ReturnsZero()
        {
            // Arrange
            var product = new Product { Price = 999.99m, DiscountPercent = 100m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(0m));
        }

        [Test]
        public void CalculateFinalPrice_WithFractionalResult_RoundsToTwoDecimalPlaces()
        {
            // Arrange
            // 100 * (1 - 33.333 / 100) = 100 * (1 - 0.33333) = 100 * 0.66667 = 66.667 -> round to 66.67
            var product = new Product { Price = 100m, DiscountPercent = 33.333m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(66.67m));
        }

        [Test]
        public void CalculateFinalPrice_WithNegativePrice_CalculatesAccordingly()
        {
            // Arrange
            // Even though negative price might be invalid in business logic,
            // the calculation method should just process it mathmatically.
            // -100 * (1 - 0.1) = -100 * 0.9 = -90
            var product = new Product { Price = -100m, DiscountPercent = 10m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(-90m));
        }

        [Test]
        public void CalculateFinalPrice_WithNegativeDiscount_IncreasesPrice()
        {
            // Arrange
            // Negative discount means an increase in price.
            // 100 * (1 - (-10)/100) = 100 * (1 + 0.1) = 110
            var product = new Product { Price = 100m, DiscountPercent = -10m };

            // Act
            var finalPrice = ProductService.CalculateFinalPrice(product);

            // Assert
            Assert.That(finalPrice, Is.EqualTo(110m));
        }

        [Test]
        public void CalculateFinalPrice_WithNullProduct_ThrowsNullReferenceException()
        {
            // Arrange
            Product product = null!;

            // Act & Assert
            Assert.That(() => ProductService.CalculateFinalPrice(product), Throws.TypeOf<NullReferenceException>());
        }
    }
}