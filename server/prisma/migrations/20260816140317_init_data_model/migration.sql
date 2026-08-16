-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('HODLER', 'DAY_TRADER', 'NFT_COLLECTOR');

-- CreateEnum
CREATE TYPE "ContentTopic" AS ENUM ('MARKET_NEWS', 'CHARTS', 'SOCIAL', 'FUN');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('NEWS', 'AI_INSIGHT', 'MEME');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('NEWS', 'PRICES', 'AI_INSIGHT', 'MEME');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assets" TEXT[],
    "investorType" "InvestorType" NOT NULL,
    "topics" "ContentTopic"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "userId" TEXT,
    "forDate" DATE,
    "externalId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "SectionType" NOT NULL,
    "contentItemId" TEXT,
    "value" "VoteValue" NOT NULL,
    "userPreferencesId" TEXT NOT NULL,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_isActive_idx" ON "UserPreferences"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_version_key" ON "UserPreferences"("userId", "version");

-- CreateIndex
CREATE INDEX "ContentItem_type_createdAt_idx" ON "ContentItem"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_userId_type_forDate_key" ON "ContentItem"("userId", "type", "forDate");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_type_externalId_key" ON "ContentItem"("type", "externalId");

-- CreateIndex
CREATE INDEX "Vote_userId_section_createdAt_idx" ON "Vote"("userId", "section", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_contentItemId_idx" ON "Vote"("contentItemId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userPreferencesId_fkey" FOREIGN KEY ("userPreferencesId") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
