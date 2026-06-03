using System;
using NUnit.Framework;
using BaseCore.Common;

namespace BaseCore.UnitTest.Auth
{
    [TestFixture]
    public class TokenHelperTests
    {
        [Test]
        public void IsValidPassword_ValidPassword_ReturnsTrue()
        {
            // Arrange
            string password = "MySecurePassword123!";
            byte[] salt;
            string hashedPassword = TokenHelper.HashPassword(password, out salt);

            // Act
            bool result = TokenHelper.IsValidPassword(password, salt, hashedPassword);

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public void IsValidPassword_InvalidPassword_ReturnsFalse()
        {
            // Arrange
            string password = "MySecurePassword123!";
            byte[] salt;
            string hashedPassword = TokenHelper.HashPassword(password, out salt);

            // Act
            bool result = TokenHelper.IsValidPassword("WrongPassword!", salt, hashedPassword);

            // Assert
            Assert.That(result, Is.False);
        }

        [Test]
        public void IsValidPassword_NullPassword_ThrowsArgumentNullException()
        {
            // Arrange
            byte[] salt = new byte[16];
            string hashedParam = "dummyHash";

            // Act & Assert
            Assert.Throws<ArgumentNullException>(() =>
                TokenHelper.IsValidPassword(null, salt, hashedParam));
        }

        [Test]
        public void IsValidPassword_EmptyPassword_ReturnsCorrectResult()
        {
            // Arrange
            string password = "";
            byte[] salt;
            string hashedPassword = TokenHelper.HashPassword(password, out salt);

            // Act
            bool result = TokenHelper.IsValidPassword(password, salt, hashedPassword);

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public void IsValidPassword_NullSalt_ThrowsArgumentNullException()
        {
            // Arrange
            string password = "MySecurePassword123!";
            string hashedParam = "dummyHash";

            // Act & Assert
            Assert.Throws<ArgumentNullException>(() =>
                TokenHelper.IsValidPassword(password, null, hashedParam));
        }

        [Test]
        public void IsValidPassword_EmptySalt_ReturnsCorrectResult()
        {
            // Arrange
            string password = "MySecurePassword123!";
            byte[] salt = new byte[0];

            // Generate expected hash manually since HashPassword always creates 16 bytes salt
            var expectedHashed = Convert.ToBase64String(Microsoft.AspNetCore.Cryptography.KeyDerivation.KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: Microsoft.AspNetCore.Cryptography.KeyDerivation.KeyDerivationPrf.HMACSHA1,
                iterationCount: 10000,
                numBytesRequested: 256 / 8));

            // Act
            bool result = TokenHelper.IsValidPassword(password, salt, expectedHashed);

            // Assert
            Assert.That(result, Is.True);
        }

        [Test]
        public void HashPassword_And_IsValidPassword_Integration()
        {
            // Arrange
            string originalPassword = "IntegrationTestPassword_999";

            // Act 1: Hash the password
            string generatedHash = TokenHelper.HashPassword(originalPassword, out byte[] generatedSalt);

            // Assert 1: Ensure hash and salt are generated
            Assert.That(generatedHash, Is.Not.Null.And.Not.Empty);
            Assert.That(generatedSalt, Is.Not.Null);
            Assert.That(generatedSalt.Length, Is.GreaterThan(0));

            // Act 2: Validate the original password with the generated salt and hash
            bool isValid = TokenHelper.IsValidPassword(originalPassword, generatedSalt, generatedHash);

            // Assert 2: The validation should succeed
            Assert.That(isValid, Is.True);

            // Act 3: Validate a different password
            bool isInvalid = TokenHelper.IsValidPassword(originalPassword + "wrong", generatedSalt, generatedHash);

            // Assert 3: The validation should fail
            Assert.That(isInvalid, Is.False);
        }
    }
}
