using System;
using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository
{
    public static class BaseCoreSalesSeeder
    {
        public static void Seed(ModelBuilder modelBuilder)
        {
            // Simple SHA256 hash for '123456'
            var defaultPasswordHash = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

            // 1. Users
            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, UserName = "admin", PasswordHash = defaultPasswordHash, FullName = "System Admin", Email = "admin@econent.com", Phone = "0988000000", Role = Role.Admin, IsActive = true, CreatedAt = DateTime.UtcNow },
                new User { Id = 2, UserName = "user", PasswordHash = defaultPasswordHash, FullName = "Test User", Email = "user@econent.com", Phone = "0988111111", Role = Role.User, IsActive = true, CreatedAt = DateTime.UtcNow },
                new User { Id = 3, UserName = "supplier", PasswordHash = defaultPasswordHash, FullName = "Supplier Demo", Email = "supplier@econent.com", Phone = "0988222222", Role = Role.Supplier, IsActive = true, CreatedAt = DateTime.UtcNow }
            );

            // 2. Suppliers
            modelBuilder.Entity<Supplier>().HasData(
                new Supplier { Id = 1, UserId = 3, CompanyName = "Tech Supply Co.", ContactName = "Mr. John", Email = "supplier@econent.com", Phone = "0988222222", Address = "Hanoi, Vietnam", IsActive = true, CreatedAt = DateTime.UtcNow }
            );

            // 3. Categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, NameVi = "Màn hình điện thoại", NameEn = "Phone Screen", Description = "", IsActive = true },
                new Category { Id = 2, NameVi = "Pin điện thoại", NameEn = "Phone Battery", Description = "", IsActive = true },
                new Category { Id = 3, NameVi = "Camera điện thoại", NameEn = "Phone Camera", Description = "", IsActive = true },
                new Category { Id = 4, NameVi = "Vỏ điện thoại", NameEn = "Phone Case/Housing", Description = "", IsActive = true },
                new Category { Id = 5, NameVi = "Cáp sạc", NameEn = "Charging Cable", Description = "", IsActive = true },
                new Category { Id = 6, NameVi = "Loa trong / loa ngoài", NameEn = "Speaker", Description = "", IsActive = true },
                new Category { Id = 7, NameVi = "Mainboard", NameEn = "Mainboard", Description = "", IsActive = true },
                new Category { Id = 8, NameVi = "IC linh kiện", NameEn = "IC Component", Description = "", IsActive = true },
                new Category { Id = 9, NameVi = "Kính cường lực", NameEn = "Tempered Glass", Description = "", IsActive = true },
                new Category { Id = 10, NameVi = "Phụ kiện sửa chữa", NameEn = "Repair Tool", Description = "", IsActive = true }
            );

            // 4. Products (30 items)
            var products = new List<Product>();
            int productId = 1;
            
            // Adding a helper to generate products quickly
            void AddProducts(string namePrefix, int categoryId, decimal basePrice, string image, int count)
            {
                for (int i = 1; i <= count; i++)
                {
                    products.Add(new Product
                    {
                        Id = productId,
                        NameVi = $"{namePrefix} {i}",
                        NameEn = $"{namePrefix} {i} (EN)",
                        DescriptionVi = $"Mô tả chi tiết cho {namePrefix} {i}",
                        Specifications = "Original 100%, Warranty 12 months",
                        Price = basePrice + (i * 10000),
                        ImportPrice = (basePrice + (i * 10000)) * 0.7m,
                        DiscountPercent = (i % 3 == 0) ? 10 : 0,
                        Stock = 100 + i * 10,
                        ImageUrl = image,
                        CategoryId = categoryId,
                        Brand = "EconentTech",
                        Color = "Default",
                        Condition = "New",
                        Status = "Active",
                        SupplierId = 1,
                        CreatedAt = DateTime.UtcNow
                    });
                    productId++;
                }
            }

            // Generating 30 products across categories
            AddProducts("Màn hình iPhone 15 Pro Max OLED", 1, 3000000, "https://placehold.co/400x400?text=Screen", 3);
            AddProducts("Pin iPhone 13 chính hãng", 2, 500000, "https://placehold.co/400x400?text=Battery", 3);
            AddProducts("Camera sau Samsung S23 Ultra", 3, 1500000, "https://placehold.co/400x400?text=Camera", 3);
            AddProducts("Màn hình Samsung A54", 1, 1000000, "https://placehold.co/400x400?text=Samsung+Screen", 3);
            AddProducts("Cáp sạc Type-C nhanh", 5, 100000, "https://placehold.co/400x400?text=Cable", 3);
            AddProducts("Loa ngoài iPhone 12", 6, 250000, "https://placehold.co/400x400?text=Speaker", 3);
            AddProducts("Mainboard iPhone 11", 7, 2000000, "https://placehold.co/400x400?text=Mainboard", 3);
            AddProducts("Vỏ lưng iPhone 14 Pro", 4, 800000, "https://placehold.co/400x400?text=Housing", 3);
            AddProducts("IC nguồn iPhone X", 8, 300000, "https://placehold.co/400x400?text=IC", 3);
            AddProducts("Kính cường lực Samsung S22", 9, 50000, "https://placehold.co/400x400?text=Glass", 3);

            modelBuilder.Entity<Product>().HasData(products);
        }
    }
}
