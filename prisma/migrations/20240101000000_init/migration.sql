-- CreateTable
CREATE TABLE "User" (
    "id" NVARCHAR(36) NOT NULL,
    "email" NVARCHAR(255) NOT NULL,
    "hashedPassword" NVARCHAR(255),
    "name" NVARCHAR(255) NOT NULL DEFAULT '',
    "role" NVARCHAR(20) NOT NULL DEFAULT 'user',
    "emailVerifiedAt" DATETIME2,
    "emailVerificationToken" NVARCHAR(255),
    "emailVerificationExpires" DATETIME2,
    "loginAttempts" INT NOT NULL DEFAULT 0,
    "lockUntil" DATETIME2,
    "createdAt" DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" NVARCHAR(36) NOT NULL,
    "title" NVARCHAR(255) NOT NULL,
    "slug" NVARCHAR(255) NOT NULL,
    "description" NVARCHAR(MAX),
    "price" INT NOT NULL,
    "stock" INT NOT NULL DEFAULT 0,
    "images" NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    "categories" NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    "featured" BIT NOT NULL DEFAULT 0,
    "createdAt" DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" NVARCHAR(36) NOT NULL,
    "userId" NVARCHAR(36) NOT NULL,
    "productId" NVARCHAR(36) NOT NULL,
    "qty" INT NOT NULL DEFAULT 1,
    "createdAt" DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" NVARCHAR(36) NOT NULL,
    "userId" NVARCHAR(36) NOT NULL,
    "status" NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "total" INT NOT NULL,
    "currency" NVARCHAR(10) NOT NULL DEFAULT 'INR',
    "paymentProvider" NVARCHAR(20),
    "paymentRef" NVARCHAR(255),
    "paymentOrderId" NVARCHAR(255),
    "items" NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    "shippingAddress" NVARCHAR(MAX),
    "createdAt" DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
