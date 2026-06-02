using Newtonsoft.Json;
using NUnit.Framework;
using BaseCore.Common;
using BaseCore.Entities;
using BaseCore.Libs.Repository;
using BaseCore.Repository.Authen;
using System;

namespace BaseCore.UnitTest
{
    public class UnitTestUserService: BaseConfigService
    {
        private IUserRepository _userRepository;
        public UnitTestUserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }


        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void TestInsertUserSuccess()
        {
            var salt = new byte[128 / 8];
            var password = TokenHelper.HashPassword("123456", out salt);
            var user = new User
            {
                Name = "Vu Tu?n",
                UserName = "tuan@oriwave.com",
                Contact = "Duong N?i, Hà Ðông",
                Password = password,
                Salt = salt,
                Created = DateTime.UtcNow,
                Email = "tuan@oriwave.com",
                Phone = "0919901195",
                IsActive = true,
                Position = "tester",
            };
            var userResult = JsonConvert.SerializeObject(user);
            Console.WriteLine(userResult);
        }


        [Test]
        public void Test1()
        {
            Assert.Pass();
        }
    }
}
