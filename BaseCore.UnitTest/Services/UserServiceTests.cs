using BaseCore.Entities;
using BaseCore.Services;
using NUnit.Framework;

namespace BaseCore.UnitTest.Services
{
    [TestFixture]
    public class UserServiceTests
    {
        [Test]
        [TestCase(null)]
        [TestCase("")]
        [TestCase("   ")]
        public void TryParseRole_WithNullOrWhitespace_ReturnsTrueAndNullRole(string? value)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.True);
            Assert.That(role, Is.Null);
        }

        [Test]
        [TestCase("0", Role.User)]
        [TestCase("1", Role.Admin)]
        [TestCase("2", Role.Supplier)]
        public void TryParseRole_WithNumericString_ReturnsTrueAndCorrectRole(string value, Role expectedRole)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.True);
            Assert.That(role, Is.EqualTo(expectedRole));
        }

        [Test]
        [TestCase("Admin", Role.Admin)]
        [TestCase("admin", Role.Admin)]
        [TestCase("ADMIN", Role.Admin)]
        [TestCase("User", Role.User)]
        [TestCase("user", Role.User)]
        [TestCase("Supplier", Role.Supplier)]
        [TestCase("supplier", Role.Supplier)]
        public void TryParseRole_WithEnumNames_ReturnsTrueAndCorrectRole(string value, Role expectedRole)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.True);
            Assert.That(role, Is.EqualTo(expectedRole));
        }

        [Test]
        [TestCase("administrator", Role.Admin)]
        [TestCase("quan tri", Role.Admin)]
        [TestCase("quan tri vien", Role.Admin)]
        [TestCase("qtv", Role.Admin)]
        [TestCase("customer", Role.User)]
        [TestCase("khach", Role.User)]
        [TestCase("khach hang", Role.User)]
        [TestCase("nguoi dung", Role.User)]
        [TestCase("nha cung cap", Role.Supplier)]
        [TestCase("ncc", Role.Supplier)]
        [TestCase("NCC", Role.Supplier)]
        public void TryParseRole_WithAliasesWithoutDiacritics_ReturnsTrueAndCorrectRole(string value, Role expectedRole)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.True);
            Assert.That(role, Is.EqualTo(expectedRole));
        }

        [Test]
        [TestCase("quản trị", Role.Admin)]
        [TestCase("quản trị viên", Role.Admin)]
        [TestCase("khách", Role.User)]
        [TestCase("khách hàng", Role.User)]
        [TestCase("Khách Hàng", Role.User)]
        [TestCase("người dùng", Role.User)]
        [TestCase("nhà cung cấp", Role.Supplier)]
        [TestCase("Nhà Cung Cấp", Role.Supplier)]
        public void TryParseRole_WithAliasesWithDiacriticsAndMixedCasing_ReturnsTrueAndCorrectRole(string value, Role expectedRole)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.True);
            Assert.That(role, Is.EqualTo(expectedRole));
        }

        [Test]
        [TestCase("99")]
        [TestCase("-1")]
        [TestCase("invalid_role")]
        [TestCase("quản lý")] // Not mapped
        public void TryParseRole_WithInvalidValues_ReturnsFalseAndNullRole(string value)
        {
            // Act
            bool result = UserService.TryParseRole(value, out Role? role);

            // Assert
            Assert.That(result, Is.False);
            Assert.That(role, Is.Null);
        }
    }
}
