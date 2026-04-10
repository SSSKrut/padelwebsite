-- Remove test users seeded in 20260410110000_seed_test_users
DELETE FROM "User" WHERE "email" IN (
  'testuser1@sunsetpadel.at',
  'testuser2@sunsetpadel.at',
  'testuser3@sunsetpadel.at'
);
