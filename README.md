# ⚡ EconentTech — Hệ thống TMĐT Linh kiện Điện thoại

> **Full-stack E-Commerce System** — ASP.NET Core 8 API + React 18 + SQL Server  
> Hệ thống quản lý mua bán linh kiện điện thoại với đầy đủ luồng Admin, Supplier và Customer.

---

## 📋 Mục lục

1. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
2. [Cấu trúc project](#cấu-trúc-project)
3. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
4. [Cấu hình SQL Server](#cấu-hình-sql-server)
5. [Khởi tạo Database](#khởi-tạo-database)
6. [Chạy Backend](#chạy-backend)
7. [Chạy Frontend](#chạy-frontend)
8. [Tài khoản mặc định](#tài-khoản-mặc-định)
9. [Luồng test chính](#luồng-test-chính)
10. [Lỗi thường gặp](#lỗi-thường-gặp)

---

## 🛠️ Công nghệ sử dụng

### Backend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Web Framework | ASP.NET Core | 8.0 |
| ORM | Entity Framework Core | 8.x |
| Database | SQL Server | 2019/2022/Express |
| Authentication | JWT Bearer Token | — |
| API Docs | Swagger / OpenAPI | — |
| Background Job | IHostedService (`AutoStatusWorker`) | — |

### Frontend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| UI Framework | React | 18.2 |
| Build Tool | Vite | 8.x |
| Routing | React Router DOM | 7.x |
| HTTP Client | Axios | 1.x |
| Charts | Recharts | 3.x |
| Icons | Font Awesome Free | 7.x |
| CSS | Vanilla CSS (custom design system) | — |

---

## 📂 Cấu trúc project

```
d:\FW-2\FW-2\BaseCore\BaseCore\
│
├── BaseCore.sln                    ← Solution file (.NET)
│
├── BaseCore.APIService\            ← 🚀 API chính (port 5000)
│   ├── Controllers\                ← REST endpoints
│   │   ├── AuthController.cs
│   │   ├── ProductsController.cs
│   │   ├── OrdersController.cs
│   │   ├── ReceiptsController.cs
│   │   ├── UsersController.cs
│   │   ├── SuppliersController.cs
│   │   ├── CategoriesController.cs
│   │   ├── CartController.cs
│   │   ├── NotificationsController.cs
│   │   ├── ReviewsController.cs
│   │   └── DashboardController.cs
│   ├── Services\
│   │   └── AutoStatusWorker.cs     ← Robot tự động cập nhật trạng thái
│   ├── appsettings.json            ← ⚙️ Connection String, JWT Secret
│   └── Program.cs
│
├── BaseCore.DTO\                   ← Data Transfer Objects
│   └── Sales\
│       ├── OrderDtos.cs
│       ├── ProductDtos.cs
│       ├── ReceiptDtos.cs
│       ├── UserDtos.cs
│       ├── SupplierDtos.cs
│       └── DashboardDtos.cs
│
├── BaseCore.Services\              ← Business Logic
├── BaseCore.Repository\            ← Data Access Layer (EF Core)
├── BaseCore.Entities\              ← Entity Models + DbContext
│
├── BaseCoreSales.sql               ← 📄 Script SQL tạo DB + Seed data
│
└── BaseCore.WebClient\             ← ⚛️ React Frontend (port 3000)
    ├── src\
    │   ├── App.jsx                 ← Routing chính
    │   ├── services\
    │   │   └── api.js              ← Tất cả API calls (Axios)
    │   ├── contexts\
    │   │   ├── AuthContext.jsx
    │   │   └── ToastContext.jsx
    │   ├── components\
    │   │   ├── AdminLayout.jsx     ← Sidebar Admin/Supplier
    │   │   └── CustomerLayout.jsx
    │   ├── pages\
    │   │   ├── Dashboard.jsx       ← Admin: KPI + Charts
    │   │   ├── Products.jsx        ← Admin/Supplier: Quản lý sản phẩm
    │   │   ├── Orders.jsx          ← Admin: Quản lý đơn hàng
    │   │   ├── Receipts.jsx        ← Admin/Supplier: Biên lai
    │   │   ├── Users.jsx           ← Admin: Quản lý tài khoản
    │   │   ├── Suppliers.jsx       ← Admin: Quản lý NCC
    │   │   ├── SupplierDashboard.jsx ← Supplier: Dashboard riêng
    │   │   └── customer\
    │   │       ├── Home.jsx
    │   │       ├── ProductDetail.jsx
    │   │       ├── Cart.jsx
    │   │       ├── Checkout.jsx
    │   │       ├── MyOrders.jsx
    │   │       └── Profile.jsx
    │   └── styles\
    │       └── admin.css           ← Design system chính
    ├── vite.config.js              ← Proxy API → localhost:5000
    └── package.json
```

---

## ✅ Yêu cầu hệ thống

- **Windows** 10/11
- **.NET SDK** 8.0+ → [Tải tại đây](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js** 18+ và npm → [Tải tại đây](https://nodejs.org)
- **SQL Server Express** (hoặc Developer/Standard) → [Tải tại đây](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **SQL Server Management Studio (SSMS)** — để chạy script SQL

Kiểm tra phiên bản đã cài:
```powershell
dotnet --version   # Cần >= 8.0
node --version     # Cần >= 18
npm --version
```

---

## 🗄️ Cấu hình SQL Server

### 1. Connection String và Secret Key mặc định

File: `BaseCore.APIService\appsettings.json`

```json
{
  "ConnectionStrings": {
    "ConnectedDb": "Server=LUDO\\SQLEXPRESS;Database=BaseCoreSales;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SecretKey": ""
  }
}
```

> **Lưu ý Bảo mật:** `Jwt:SecretKey` hiện đã được loại bỏ khỏi mã nguồn để đảm bảo an toàn.
> Ứng dụng sẽ báo lỗi (throw `InvalidOperationException`) nếu bạn không cấu hình key này hoặc cấu hình quá ngắn (< 16 ký tự).
>
> **Cách cấu hình Secret Key cho Local Development:**
>
> Bạn có thể cấu hình thông qua `appsettings.Development.json` (đã cung cấp sẵn key dummy). Hoặc tốt nhất là dùng `dotnet user-secrets`:
> ```powershell
> cd d:\FW-2\FW-2\BaseCore\BaseCore\BaseCore.APIService
> dotnet user-secrets init
> dotnet user-secrets set "Jwt:SecretKey" "ChuyenGiDoBiMatKhongTheTietLo123!"
> ```
> *(Làm tương tự cho thư mục `BaseCore.AuthService` nếu bạn chạy AuthService độc lập).*

> **Giải thích:**
> - `LUDO\\SQLEXPRESS` → Tên máy tính `LUDO` + Instance `SQLEXPRESS`
> - `Trusted_Connection=True` → Dùng Windows Authentication (không cần user/password)
> - `TrustServerCertificate=True` → Bỏ qua lỗi SSL certificate

### 2. Đổi Connection String theo máy khác

Nếu tên máy tính của bạn **không phải `LUDO`**, hãy đổi thành:

```json
"ConnectedDb": "Server=.\\SQLEXPRESS;Database=BaseCoreSales;Trusted_Connection=True;TrustServerCertificate=True;"
```

> `.\SQLEXPRESS` = SQL Server Express trên máy hiện tại (cách viết thay thế cho `localhost\SQLEXPRESS`)

Nếu dùng **SQL Authentication** (user/password):
```json
"ConnectedDb": "Server=LUDO\\SQLEXPRESS;Database=BaseCoreSales;User Id=sa;Password=YourPassword;TrustServerCertificate=True;"
```

---

## 🗃️ Khởi tạo Database

### Cách 1: Chạy Script SQL (Khuyến nghị)

1. Mở **SQL Server Management Studio (SSMS)**
2. Kết nối đến `LUDO\SQLEXPRESS`
3. Mở file: `d:\FW-2\FW-2\BaseCore\BaseCore\BaseCoreSales.sql`
4. Nhấn **F5** hoặc nút **Execute**

Script sẽ tự động:
- ✅ Tạo database `BaseCoreSales` (nếu chưa có)
- ✅ Tạo đầy đủ 11 bảng (`Users`, `Products`, `Orders`, `OrderDetails`, `Receipts`, `Suppliers`, `Categories`, `CartItems`, `Notifications`, `Reviews`, `ProductImages`)
- ✅ Insert **30 sản phẩm** mẫu và **3 tài khoản** mặc định

### Cách 2: EF Core Migration (CLI)

```powershell
# Từ thư mục gốc solution
cd d:\FW-2\FW-2\BaseCore\BaseCore

# Chạy migration
dotnet ef database update --project BaseCore.Repository --startup-project BaseCore.APIService
```

---

## 🖥️ Chạy Backend

### Terminal 1 — Chạy API Server

```powershell
cd d:\FW-2\FW-2\BaseCore\BaseCore\BaseCore.APIService
dotnet run
```

Hoặc từ thư mục gốc:
```powershell
cd d:\FW-2\FW-2\BaseCore\BaseCore
dotnet run --project BaseCore.APIService
```

**Kết quả mong đợi:**
```
====================================================
🚀 BaseCore API Service is running!
📍 Port: 5001
🛠️  AutoStatusWorker is monitoring orders/receipts...
====================================================
```

> ⚠️ **Lưu ý Port:** API chạy ở port **5000** (theo cấu hình Vite proxy) hoặc **5001** (theo log console).  
> Vite proxy trong `vite.config.js` đang trỏ đến `http://localhost:5000`.  
> Nếu backend chạy ở port khác, cần sửa `target` trong `vite.config.js`.

### Swagger UI

Sau khi backend chạy, truy cập:
- **http://localhost:5000/swagger** (Development mode)
- **http://localhost:5001/swagger** (tuỳ cổng)

---

## ⚛️ Chạy Frontend

### Terminal 2 — Chạy React Dev Server

```powershell
cd d:\FW-2\FW-2\BaseCore\BaseCore\BaseCore.WebClient

# Lần đầu: cài dependencies
npm install

# Chạy dev server
npm run dev
```

**Kết quả mong đợi:**
```
  VITE v8.0.10  ready in 500ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Mở trình duyệt: **http://localhost:3000**

### Build Production

```powershell
npm run build
# Output: dist/ folder
```

---

## 👤 Tài khoản mặc định

> **Mật khẩu tất cả tài khoản:** `123456`

| Username | Mật khẩu | Role | Quyền hạn |
|---|---|---|---|
| `admin` | `123456` | Admin (Role=0) | Toàn quyền: Dashboard, Sản phẩm, Đơn hàng, Biên lai, Người dùng, NCC |
| `user` | `123456` | Customer (Role=1) | Mua hàng, giỏ hàng, đặt đơn, đánh giá |
| `supplier` | `123456` | Supplier (Role=2) | Supplier Portal: sản phẩm, biên lai, dashboard |

### URL đăng nhập theo Role

| Role | URL sau đăng nhập |
|---|---|
| Admin | `http://localhost:3000/admin` → Dashboard |
| Supplier | `http://localhost:3000/admin` → tự redirect → `/admin/supplier-home` |
| Customer | `http://localhost:3000/customer/home` |

---

## 🧪 Luồng test chính

### Luồng 1: Admin quản lý Đơn hàng

1. Đăng nhập `admin / 123456`
2. Vào **Admin → Đơn hàng**
3. Lọc theo trạng thái **"Chờ xử lý"**
4. Click vào row đơn hàng → Modal chi tiết mở ra
5. Nhấn **✅ Xác nhận** → Trạng thái chuyển sang `Confirmed`
6. (Hoặc nhấn **❌ Từ chối** → Nhập lý do → Xác nhận từ chối)
7. `AutoStatusWorker` tự chạy: Confirmed → Shipping → Delivered → Completed

> ⏱️ Worker chạy mỗi 5 phút (tuỳ cấu hình `AutoStatusWorker.cs`)

### Luồng 2: Supplier nhập hàng — Admin duyệt Biên lai

**Bước Supplier:**
1. Đăng nhập `supplier / 123456`
2. Vào **Supplier Dashboard** → Nhấn **"Tạo Biên lai nhập hàng"**
3. Chọn sản phẩm → Nhập số lượng, giá nhập, upload ảnh vận đơn → Gửi

**Bước Admin:**
4. Đăng nhập `admin / 123456` → **Admin → Duyệt Biên lai**
5. Filter trạng thái **"Chờ duyệt"**
6. Click vào biên lai → Xem chi tiết (ảnh vận đơn, số lượng, giá nhập)
7. Nhấn **✅ Xác nhận** → Trạng thái: Confirmed → Shipping → Delivered (tự động)
8. Khi `Delivered`: Tồn kho sản phẩm **tự động +số lượng**

### Luồng 3: Khách hàng mua hàng

1. Truy cập `http://localhost:3000/customer/home`
2. Duyệt sản phẩm → Thêm vào giỏ hàng
3. Đăng nhập `user / 123456` (nếu chưa đăng nhập)
4. Vào **Giỏ hàng** → Đặt hàng → Tồn kho tự động giảm
5. Vào **Đơn hàng của tôi** → Theo dõi trạng thái
6. Khi đơn `Delivered` → Nhấn **"Đã nhận hàng"** → `Completed`
7. Khi `Completed` → Vào trang sản phẩm → Viết đánh giá ⭐

### Luồng 4: Admin quản lý Nhà cung cấp

1. Đăng nhập `admin / 123456`
2. Vào **Admin → Nhà cung cấp**
3. Click vào supplier → Modal 3 tabs:
   - **Thông tin**: địa chỉ, liên hệ, ngày tham gia
   - **Sản phẩm**: danh sách sản phẩm đang cung cấp
   - **Biên lai**: lịch sử nhập hàng
4. Nhấn **Khóa/Mở khóa** nhà cung cấp

### Luồng 5: Admin Dashboard KPI

1. Đăng nhập `admin / 123456` → **Dashboard**
2. Xem 5 KPI: Doanh thu, Lợi nhuận, Sản phẩm, Đơn hàng, Biên lai
3. Xem biểu đồ **Doanh thu 7 ngày** (Area Chart)
4. Xem biểu đồ **Trạng thái đơn hàng** (Bar Chart)
5. Click vào đơn hàng trong bảng "Recent Orders" → Modal chi tiết

---

## ❓ Lỗi thường gặp

### ❌ Backend không kết nối được Database

**Triệu chứng:** `A network-related or instance-specific error occurred while establishing a connection to SQL Server`

**Giải pháp:**
1. Kiểm tra SQL Server đang chạy:
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*SQL*"}
   ```
2. Mở **SQL Server Configuration Manager** → Đảm bảo `SQL Server (SQLEXPRESS)` đang **Running**
3. Kiểm tra tên Instance trong Connection String:
   - Nếu tên máy không phải `LUDO` → Sửa thành `.\SQLEXPRESS` trong `appsettings.json`
4. Bật **TCP/IP** trong SQL Server Configuration Manager

---

### ❌ Vite proxy lỗi "Backend not available"

**Triệu chứng:** API call trả về `{"message": "Backend not available"}`

**Giải pháp:**
1. Đảm bảo backend đang chạy và lắng nghe đúng port
2. Kiểm tra port trong `vite.config.js`:
   ```js
   target: 'http://localhost:5000'  // Phải khớp với port backend
   ```
3. Nếu backend chạy ở port 5001 (có https redirect), sửa thành:
   ```js
   target: 'http://localhost:5001'
   ```

---

### ❌ Lỗi 401 Unauthorized

**Triệu chứng:** Mọi API gọi đều trả về 401

**Giải pháp:**
1. Xoá localStorage trong DevTools → Application → Local Storage → Xoá `user` và `token`
2. Đăng nhập lại
3. Kiểm tra `Jwt:SecretKey` trong `appsettings.json` không bị thay đổi

---

### ❌ npm install lỗi permission / EACCES

**Giải pháp:**
```powershell
# Chạy PowerShell với quyền Administrator
cd d:\FW-2\FW-2\BaseCore\BaseCore\BaseCore.WebClient
Remove-Item -Recurse -Force node_modules
npm install
```

---

### ❌ Database chưa có bảng (Table doesn't exist)

**Triệu chứng:** Lỗi `Invalid object name 'Products'` hoặc tương tự

**Giải pháp:**  
Chạy lại file SQL:
1. Mở SSMS → Kết nối `LUDO\SQLEXPRESS`
2. Nếu database `BaseCoreSales` chưa tồn tại: Tạo mới rỗng trước
3. Chạy script `BaseCoreSales.sql` trong context database `BaseCoreSales`

---

### ❌ Frontend hiển thị trắng / blank

**Triệu chứng:** Trang trắng sau khi đăng nhập

**Giải pháp:**
1. Mở DevTools Console (F12) kiểm tra lỗi
2. Đảm bảo React Router phiên bản 7 (đã có trong package.json)
3. Hard reload: `Ctrl + Shift + R`

---

### ❌ Supplier đăng nhập không vào được Supplier Portal

**Triệu chứng:** Đăng nhập `supplier` nhưng hiển thị trang trắng hoặc 403

**Giải pháp:**
- Đảm bảo tài khoản `supplier` trong DB có `Role = 2`
- Kiểm tra trong Users table:
  ```sql
  SELECT Id, UserName, Role FROM Users WHERE UserName = 'supplier';
  -- Role phải = 2 (Supplier)
  ```

---

### ❌ AutoStatusWorker không tự cập nhật trạng thái

**Triệu chứng:** Đơn hàng ở `Confirmed` mãi không chuyển `Shipping`

**Giải pháp:**
1. Kiểm tra log backend console → Worker có hiện log không?
2. Worker chạy theo interval trong `AutoStatusWorker.cs` — mặc định có thể là 5-10 phút
3. Nếu muốn test nhanh: Admin tự nhấn nút **"Bắt đầu giao hàng"** trong modal chi tiết đơn

---

## 📡 API Endpoints chính

| Method | URL | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | ❌ | Đăng nhập, trả JWT token |
| POST | `/api/auth/register` | ❌ | Đăng ký tài khoản |
| GET | `/api/dashboard/stats` | Admin | Thống kê tổng quan |
| GET | `/api/products/search` | ❌ | Tìm kiếm sản phẩm |
| POST | `/api/orders` | User | Tạo đơn hàng |
| GET | `/api/orders/my` | User | Đơn hàng của tôi |
| GET | `/api/orders/search` | Admin | Tìm kiếm đơn hàng |
| PUT | `/api/orders/{id}/status` | Admin | Cập nhật trạng thái |
| POST | `/api/receipts` | Supplier | Tạo biên lai nhập hàng |
| PUT | `/api/receipts/{id}/status` | Admin | Duyệt/Từ chối biên lai |
| GET | `/api/suppliers` | Admin | Danh sách nhà cung cấp |
| GET | `/api/suppliers/me` | Supplier | Profile của tôi |
| PATCH | `/api/users/{id}/toggle-active` | Admin | Khóa/Mở tài khoản |
| POST | `/api/cart/add` | User | Thêm vào giỏ hàng |

> 📖 Xem đầy đủ tại **Swagger UI**: `http://localhost:5000/swagger`

---

## 🔐 Phân quyền hệ thống

```
UserType / Role:
  0 (Admin)    → Toàn quyền hệ thống
  1 (User)     → Customer: mua hàng, giỏ hàng, đánh giá
  2 (Supplier) → Supplier Portal: biên lai, sản phẩm

Hạng thành viên Customer (tính từ totalSpent):
  🥉 Đồng     → < 5,000,000đ
  🥈 Bạc      → 5,000,000đ — 20,000,000đ
  🥇 Vàng     → 20,000,000đ — 50,000,000đ
  💎 Kim Cương → ≥ 50,000,000đ
```

---

## 🔄 Luồng trạng thái

### Đơn hàng (Orders)
```
Pending → Confirmed → Shipping → Delivered → Completed
   ↓           ↓
CancelledByUser  CancelledByAdmin (kèm lý do)
```

### Biên lai nhập hàng (Receipts)
```
Pending → Confirmed → Shipping → Delivered
                                    ↓
                           (Stock sản phẩm +quantity)
   ↓
RejectedByAdmin
```

---

*README được tạo tự động sau khi hoàn thành Phase 6 · EconentTech 2026*
#   L U D O  
 