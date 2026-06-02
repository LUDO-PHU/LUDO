using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaseCore.Repository.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NameVi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RevenueTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OwnerId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ReferenceType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ReferenceId = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevenueTransactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrderCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerPhone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ShippingAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalImportCost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Profit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CancelReason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippingAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReturnedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContactName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Suppliers_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Suppliers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReturnRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminComment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RelatedId = table.Column<int>(type: "int", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NameVi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DescriptionVi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Specifications = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ImportPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    Brand = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SelectedImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CartItems_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UnitImportPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    FinalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalImportCost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Profit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SelectedImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderDetails_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderDetails_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AltText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductImages_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: true),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reviews_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reviews_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Reviews_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AdminId = table.Column<int>(type: "int", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: true),
                    RequestedProductName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    SuggestedPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RejectionReason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierRequests_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierRequests_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupplierRequests_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierRequests_Users_AdminId",
                        column: x => x.AdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Receipts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReceiptCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    AdminId = table.Column<int>(type: "int", nullable: true),
                    RequestId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    ImportPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalImportAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ReceiptType = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Specifications = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FromAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ToAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippingAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelReason = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Receipts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_SupplierRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "SupplierRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Receipts_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_Users_AdminId",
                        column: x => x.AdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockBatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    ReceiptId = table.Column<int>(type: "int", nullable: true),
                    QuantityImported = table.Column<int>(type: "int", nullable: false),
                    QuantityRemaining = table.Column<int>(type: "int", nullable: false),
                    UnitImportPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockBatches_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockBatches_Receipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StockBatches_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderStockAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderDetailId = table.Column<int>(type: "int", nullable: false),
                    StockBatchId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitImportPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStockAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStockAllocations_OrderDetails_OrderDetailId",
                        column: x => x.OrderDetailId,
                        principalTable: "OrderDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderStockAllocations_StockBatches_StockBatchId",
                        column: x => x.StockBatchId,
                        principalTable: "StockBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Description", "IsActive", "NameEn", "NameVi" },
                values: new object[,]
                {
                    { 1, "", true, "Phone Screen", "Màn hình điện thoại" },
                    { 2, "", true, "Phone Battery", "Pin điện thoại" },
                    { 3, "", true, "Phone Camera", "Camera điện thoại" },
                    { 4, "", true, "Phone Case/Housing", "Vỏ điện thoại" },
                    { 5, "", true, "Charging Cable", "Cáp sạc" },
                    { 6, "", true, "Speaker", "Loa trong / loa ngoài" },
                    { 7, "", true, "Mainboard", "Mainboard" },
                    { 8, "", true, "IC Component", "IC linh kiện" },
                    { 9, "", true, "Tempered Glass", "Kính cường lực" },
                    { 10, "", true, "Repair Tool", "Phụ kiện sửa chữa" }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Phone", "Role", "UpdatedAt", "UserName" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(5745), "admin@econent.com", "System Admin", true, "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", "0988000000", 0, null, "admin" },
                    { 2, new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(5747), "user@econent.com", "Test User", true, "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", "0988111111", 1, null, "user" },
                    { 3, new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(5749), "supplier@econent.com", "Supplier Demo", true, "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", "0988222222", 2, null, "supplier" }
                });

            migrationBuilder.InsertData(
                table: "Suppliers",
                columns: new[] { "Id", "Address", "CategoryId", "CompanyName", "ContactName", "CreatedAt", "Email", "IsActive", "Phone", "UpdatedAt", "UserId" },
                values: new object[] { 1, "Hanoi, Vietnam", null, "Tech Supply Co.", "Mr. John", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(5890), "supplier@econent.com", true, "0988222222", null, 3 });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Brand", "CategoryId", "Color", "Condition", "CreatedAt", "DescriptionVi", "DiscountPercent", "ImageUrl", "ImportPrice", "NameEn", "NameVi", "Price", "Specifications", "Status", "Stock", "SupplierId", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6007), "Mô tả chi tiết cho Màn hình iPhone 15 Pro Max OLED 1", 0m, "https://placehold.co/400x400?text=Screen", 2107000.0m, "Màn hình iPhone 15 Pro Max OLED 1 (EN)", "Màn hình iPhone 15 Pro Max OLED 1", 3010000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 2, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6013), "Mô tả chi tiết cho Màn hình iPhone 15 Pro Max OLED 2", 0m, "https://placehold.co/400x400?text=Screen", 2114000.0m, "Màn hình iPhone 15 Pro Max OLED 2 (EN)", "Màn hình iPhone 15 Pro Max OLED 2", 3020000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 3, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6056), "Mô tả chi tiết cho Màn hình iPhone 15 Pro Max OLED 3", 10m, "https://placehold.co/400x400?text=Screen", 2121000.0m, "Màn hình iPhone 15 Pro Max OLED 3 (EN)", "Màn hình iPhone 15 Pro Max OLED 3", 3030000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 4, "EconentTech", 2, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6060), "Mô tả chi tiết cho Pin iPhone 13 chính hãng 1", 0m, "https://placehold.co/400x400?text=Battery", 357000.0m, "Pin iPhone 13 chính hãng 1 (EN)", "Pin iPhone 13 chính hãng 1", 510000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 5, "EconentTech", 2, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6064), "Mô tả chi tiết cho Pin iPhone 13 chính hãng 2", 0m, "https://placehold.co/400x400?text=Battery", 364000.0m, "Pin iPhone 13 chính hãng 2 (EN)", "Pin iPhone 13 chính hãng 2", 520000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 6, "EconentTech", 2, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6068), "Mô tả chi tiết cho Pin iPhone 13 chính hãng 3", 10m, "https://placehold.co/400x400?text=Battery", 371000.0m, "Pin iPhone 13 chính hãng 3 (EN)", "Pin iPhone 13 chính hãng 3", 530000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 7, "EconentTech", 3, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6072), "Mô tả chi tiết cho Camera sau Samsung S23 Ultra 1", 0m, "https://placehold.co/400x400?text=Camera", 1057000.0m, "Camera sau Samsung S23 Ultra 1 (EN)", "Camera sau Samsung S23 Ultra 1", 1510000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 8, "EconentTech", 3, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6075), "Mô tả chi tiết cho Camera sau Samsung S23 Ultra 2", 0m, "https://placehold.co/400x400?text=Camera", 1064000.0m, "Camera sau Samsung S23 Ultra 2 (EN)", "Camera sau Samsung S23 Ultra 2", 1520000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 9, "EconentTech", 3, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6078), "Mô tả chi tiết cho Camera sau Samsung S23 Ultra 3", 10m, "https://placehold.co/400x400?text=Camera", 1071000.0m, "Camera sau Samsung S23 Ultra 3 (EN)", "Camera sau Samsung S23 Ultra 3", 1530000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 10, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6083), "Mô tả chi tiết cho Màn hình Samsung A54 1", 0m, "https://placehold.co/400x400?text=Samsung+Screen", 707000.0m, "Màn hình Samsung A54 1 (EN)", "Màn hình Samsung A54 1", 1010000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 11, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6087), "Mô tả chi tiết cho Màn hình Samsung A54 2", 0m, "https://placehold.co/400x400?text=Samsung+Screen", 714000.0m, "Màn hình Samsung A54 2 (EN)", "Màn hình Samsung A54 2", 1020000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 12, "EconentTech", 1, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6090), "Mô tả chi tiết cho Màn hình Samsung A54 3", 10m, "https://placehold.co/400x400?text=Samsung+Screen", 721000.0m, "Màn hình Samsung A54 3 (EN)", "Màn hình Samsung A54 3", 1030000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 13, "EconentTech", 5, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6094), "Mô tả chi tiết cho Cáp sạc Type-C nhanh 1", 0m, "https://placehold.co/400x400?text=Cable", 77000.0m, "Cáp sạc Type-C nhanh 1 (EN)", "Cáp sạc Type-C nhanh 1", 110000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 14, "EconentTech", 5, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6097), "Mô tả chi tiết cho Cáp sạc Type-C nhanh 2", 0m, "https://placehold.co/400x400?text=Cable", 84000.0m, "Cáp sạc Type-C nhanh 2 (EN)", "Cáp sạc Type-C nhanh 2", 120000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 15, "EconentTech", 5, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6100), "Mô tả chi tiết cho Cáp sạc Type-C nhanh 3", 10m, "https://placehold.co/400x400?text=Cable", 91000.0m, "Cáp sạc Type-C nhanh 3 (EN)", "Cáp sạc Type-C nhanh 3", 130000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 16, "EconentTech", 6, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6104), "Mô tả chi tiết cho Loa ngoài iPhone 12 1", 0m, "https://placehold.co/400x400?text=Speaker", 182000.0m, "Loa ngoài iPhone 12 1 (EN)", "Loa ngoài iPhone 12 1", 260000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 17, "EconentTech", 6, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6129), "Mô tả chi tiết cho Loa ngoài iPhone 12 2", 0m, "https://placehold.co/400x400?text=Speaker", 189000.0m, "Loa ngoài iPhone 12 2 (EN)", "Loa ngoài iPhone 12 2", 270000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 18, "EconentTech", 6, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6134), "Mô tả chi tiết cho Loa ngoài iPhone 12 3", 10m, "https://placehold.co/400x400?text=Speaker", 196000.0m, "Loa ngoài iPhone 12 3 (EN)", "Loa ngoài iPhone 12 3", 280000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 19, "EconentTech", 7, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6138), "Mô tả chi tiết cho Mainboard iPhone 11 1", 0m, "https://placehold.co/400x400?text=Mainboard", 1407000.0m, "Mainboard iPhone 11 1 (EN)", "Mainboard iPhone 11 1", 2010000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 20, "EconentTech", 7, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6142), "Mô tả chi tiết cho Mainboard iPhone 11 2", 0m, "https://placehold.co/400x400?text=Mainboard", 1414000.0m, "Mainboard iPhone 11 2 (EN)", "Mainboard iPhone 11 2", 2020000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 21, "EconentTech", 7, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6146), "Mô tả chi tiết cho Mainboard iPhone 11 3", 10m, "https://placehold.co/400x400?text=Mainboard", 1421000.0m, "Mainboard iPhone 11 3 (EN)", "Mainboard iPhone 11 3", 2030000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 22, "EconentTech", 4, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6149), "Mô tả chi tiết cho Vỏ lưng iPhone 14 Pro 1", 0m, "https://placehold.co/400x400?text=Housing", 567000.0m, "Vỏ lưng iPhone 14 Pro 1 (EN)", "Vỏ lưng iPhone 14 Pro 1", 810000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 23, "EconentTech", 4, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6153), "Mô tả chi tiết cho Vỏ lưng iPhone 14 Pro 2", 0m, "https://placehold.co/400x400?text=Housing", 574000.0m, "Vỏ lưng iPhone 14 Pro 2 (EN)", "Vỏ lưng iPhone 14 Pro 2", 820000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 24, "EconentTech", 4, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6156), "Mô tả chi tiết cho Vỏ lưng iPhone 14 Pro 3", 10m, "https://placehold.co/400x400?text=Housing", 581000.0m, "Vỏ lưng iPhone 14 Pro 3 (EN)", "Vỏ lưng iPhone 14 Pro 3", 830000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 25, "EconentTech", 8, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6160), "Mô tả chi tiết cho IC nguồn iPhone X 1", 0m, "https://placehold.co/400x400?text=IC", 217000.0m, "IC nguồn iPhone X 1 (EN)", "IC nguồn iPhone X 1", 310000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 26, "EconentTech", 8, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6163), "Mô tả chi tiết cho IC nguồn iPhone X 2", 0m, "https://placehold.co/400x400?text=IC", 224000.0m, "IC nguồn iPhone X 2 (EN)", "IC nguồn iPhone X 2", 320000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 27, "EconentTech", 8, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6167), "Mô tả chi tiết cho IC nguồn iPhone X 3", 10m, "https://placehold.co/400x400?text=IC", 231000.0m, "IC nguồn iPhone X 3 (EN)", "IC nguồn iPhone X 3", 330000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null },
                    { 28, "EconentTech", 9, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6171), "Mô tả chi tiết cho Kính cường lực Samsung S22 1", 0m, "https://placehold.co/400x400?text=Glass", 42000.0m, "Kính cường lực Samsung S22 1 (EN)", "Kính cường lực Samsung S22 1", 60000m, "Original 100%, Warranty 12 months", "Active", 110, 1, null },
                    { 29, "EconentTech", 9, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6174), "Mô tả chi tiết cho Kính cường lực Samsung S22 2", 0m, "https://placehold.co/400x400?text=Glass", 49000.0m, "Kính cường lực Samsung S22 2 (EN)", "Kính cường lực Samsung S22 2", 70000m, "Original 100%, Warranty 12 months", "Active", 120, 1, null },
                    { 30, "EconentTech", 9, "Default", "New", new DateTime(2026, 5, 31, 13, 7, 27, 552, DateTimeKind.Utc).AddTicks(6178), "Mô tả chi tiết cho Kính cường lực Samsung S22 3", 10m, "https://placehold.co/400x400?text=Glass", 56000.0m, "Kính cường lực Samsung S22 3 (EN)", "Kính cường lực Samsung S22 3", 80000m, "Original 100%, Warranty 12 months", "Active", 130, 1, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_ProductId",
                table: "CartItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_UserId",
                table: "CartItems",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_SupplierId",
                table: "Notifications",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_OrderId",
                table: "OrderDetails",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_ProductId",
                table: "OrderDetails",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStockAllocations_OrderDetailId",
                table: "OrderStockAllocations",
                column: "OrderDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStockAllocations_StockBatchId",
                table: "OrderStockAllocations",
                column: "StockBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImages",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_SupplierId",
                table: "Products",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_AdminId",
                table: "Receipts",
                column: "AdminId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_ProductId",
                table: "Receipts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_RequestId",
                table: "Receipts",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_SupplierId",
                table: "Receipts",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_OrderId",
                table: "ReturnRequests",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_UserId",
                table: "ReturnRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueTransactions_TransactionType_ReferenceType_ReferenceId_OwnerType_OwnerId",
                table: "RevenueTransactions",
                columns: new[] { "TransactionType", "ReferenceType", "ReferenceId", "OwnerType", "OwnerId" });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_OrderId",
                table: "Reviews",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ProductId",
                table: "Reviews",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId",
                table: "Reviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StockBatches_ProductId",
                table: "StockBatches",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockBatches_ReceiptId",
                table: "StockBatches",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_StockBatches_SupplierId",
                table: "StockBatches",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierRequests_AdminId",
                table: "SupplierRequests",
                column: "AdminId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierRequests_CategoryId",
                table: "SupplierRequests",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierRequests_ProductId",
                table: "SupplierRequests",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierRequests_SupplierId",
                table: "SupplierRequests",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_CategoryId",
                table: "Suppliers",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_UserId",
                table: "Suppliers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserName",
                table: "Users",
                column: "UserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CartItems");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "OrderStockAllocations");

            migrationBuilder.DropTable(
                name: "ProductImages");

            migrationBuilder.DropTable(
                name: "ReturnRequests");

            migrationBuilder.DropTable(
                name: "RevenueTransactions");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "OrderDetails");

            migrationBuilder.DropTable(
                name: "StockBatches");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Receipts");

            migrationBuilder.DropTable(
                name: "SupplierRequests");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
