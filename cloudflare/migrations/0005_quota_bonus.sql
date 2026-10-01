-- Keep existing quota allowances when importing databases that predate D1.
ALTER TABLE quotas ADD COLUMN bonus INTEGER NOT NULL DEFAULT 0;
