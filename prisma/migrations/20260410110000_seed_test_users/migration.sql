-- Seed test users to verify migration pipeline on Netlify
-- Password for all: test1234
INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName", "role", "elo", "createdAt")
VALUES
  (gen_random_uuid(), 'testuser1@sunsetpadel.at', '$2b$10$7fxwX6z9SznQmHcaD46gFeqWyvU2JpppV92HUVM.GxfJPISmlz7Wa', 'Test', 'User One', 'USER', 1000, NOW()),
  (gen_random_uuid(), 'testuser2@sunsetpadel.at', '$2b$10$7fxwX6z9SznQmHcaD46gFeqWyvU2JpppV92HUVM.GxfJPISmlz7Wa', 'Test', 'User Two', 'USER', 1000, NOW()),
  (gen_random_uuid(), 'testuser3@sunsetpadel.at', '$2b$10$7fxwX6z9SznQmHcaD46gFeqWyvU2JpppV92HUVM.GxfJPISmlz7Wa', 'Test', 'User Three', 'USER', 1000, NOW())
ON CONFLICT ("email") DO NOTHING;
