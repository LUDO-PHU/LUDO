using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore Auth Service API",
        Version = "v1",
        Description = "Authentication and user management"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<BaseCoreSalesContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});

builder.Services.AddScoped<IUserRepositoryEF, UserRepositoryEF>();
builder.Services.AddScoped<ISupplierRepositoryEF, SupplierRepositoryEF>();
builder.Services.AddScoped<IOrderRepositoryEF, OrderRepositoryEF>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<BaseCore.Services.IUserService, BaseCore.Services.UserService>();

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BaseCoreSalesContext>();
    dbContext.Database.EnsureCreated();
    await EnsureOrderCustomerFieldsAsync(dbContext);

    await EnsureSeedUser(dbContext, "admin", "System Admin", "admin@econenttech.local", "0900000001", Role.Admin);
    await EnsureSeedUser(dbContext, "user", "Test User", "user@econenttech.local", "0900000002", Role.User);
    await EnsureSeedUser(dbContext, "supplier", "Supplier Demo", "supplier@econenttech.local", "0900000003", Role.Supplier);
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("====================================================");
Console.WriteLine("BaseCore Auth Service is running on port 5002");
Console.WriteLine("Endpoints: /api/auth, /api/users, /api/roles");
Console.WriteLine("====================================================");

app.Run("http://localhost:5002");

static async Task EnsureSeedUser(
    BaseCoreSalesContext dbContext,
    string username,
    string fullName,
    string email,
    string phone,
    Role role)
{
    var user = await dbContext.Users.FirstOrDefaultAsync(u => u.UserName == username);
    if (user == null)
    {
        await dbContext.Users.AddAsync(new User
        {
            UserName = username,
            PasswordHash = PasswordHasher.Hash("123456"),
            FullName = fullName,
            Email = email,
            Phone = phone,
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();
        return;
    }

    user.FullName = string.IsNullOrWhiteSpace(user.FullName) ? fullName : user.FullName;
    user.Email = string.IsNullOrWhiteSpace(user.Email) ? email : user.Email;
    user.Phone = string.IsNullOrWhiteSpace(user.Phone) ? phone : user.Phone;
    user.Role = role;
    user.IsActive = true;
    await dbContext.SaveChangesAsync();
}

static async Task EnsureOrderCustomerFieldsAsync(BaseCoreSalesContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[dbo].[Orders]', N'CustomerName') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CustomerName] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_CustomerName] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'CustomerPhone') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CustomerPhone] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_CustomerPhone] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'ShippingAddress') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [ShippingAddress] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_ShippingAddress] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'Note') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [Note] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_Note] DEFAULT N'';
END");
}
