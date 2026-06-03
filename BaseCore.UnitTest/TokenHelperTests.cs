using NUnit.Framework;
using BaseCore.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Linq;

namespace BaseCore.UnitTest
{
    public class TokenHelperTests
    {
        private const string ValidSecretKey = "my_super_secret_key_that_is_long_enough_12345!";

        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void GenerateToken_WithValidParameters_ReturnsValidJwtWithCorrectClaims()
        {
            // Arrange
            string secretKey = ValidSecretKey;
            int minuteExpireTime = 60;
            string userId = "user123";
            string userName = "john.doe";
            string roles = "Admin,User";

            // Act
            string token = TokenHelper.GenerateToken(secretKey, minuteExpireTime, userId, userName, roles);

            // Assert
            Assert.That(token, Is.Not.Null.And.Not.Empty, "Token should not be null or empty.");

            // Decode the token to verify claims
            var handler = new JwtSecurityTokenHandler();
            Assert.That(handler.CanReadToken(token), Is.True, "The returned string should be a valid JWT.");

            var jwtToken = handler.ReadJwtToken(token);

            // Verify Claims
            var nameClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "unique_name" || c.Type == ClaimTypes.Name);
            Assert.That(nameClaim, Is.Not.Null, "Name claim is missing.");
            Assert.That(nameClaim.Value, Is.EqualTo(userName), "Name claim value is incorrect.");

            var nameIdentifierClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "nameid" || c.Type == ClaimTypes.NameIdentifier);
            Assert.That(nameIdentifierClaim, Is.Not.Null, "NameIdentifier claim is missing.");
            Assert.That(nameIdentifierClaim.Value, Is.EqualTo(userId), "NameIdentifier claim value is incorrect.");

            var roleClaims = jwtToken.Claims.Where(c => c.Type == "role" || c.Type == ClaimTypes.Role).ToList();
            Assert.That(roleClaims, Is.Not.Empty, "Role claim is missing.");
            Assert.That(roleClaims.First().Value, Is.EqualTo(roles), "Role claim value is incorrect.");
        }

        [Test]
        public void GenerateToken_WithShortSecretKey_ThrowsException()
        {
            // Arrange
            string shortSecretKey = "short"; // Under 16 bytes/characters
            int minuteExpireTime = 60;
            string userId = "user123";
            string userName = "john.doe";
            string roles = "Admin";

            // Act & Assert
            // Depending on the version of Microsoft.IdentityModel.Tokens, this might throw ArgumentOutOfRangeException or similar.
            Assert.Throws<System.ArgumentOutOfRangeException>(() =>
                TokenHelper.GenerateToken(shortSecretKey, minuteExpireTime, userId, userName, roles)
            );
        }

        [Test]
        public void GenerateToken_WithZeroOrNegativeExpiration_ThrowsException()
        {
            // Arrange
            string secretKey = ValidSecretKey;
            int minuteExpireTime = -5; // Negative expiration
            string userId = "user123";
            string userName = "john.doe";
            string roles = "Admin";

            // Act & Assert
            // JwtSecurityTokenHandler throws ArgumentException if Expires < NotBefore
            Assert.Throws<System.ArgumentException>(() =>
                TokenHelper.GenerateToken(secretKey, minuteExpireTime, userId, userName, roles)
            );
        }
    }
}
