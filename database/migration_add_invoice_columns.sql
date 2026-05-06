-- Migration: Add new columns to invoices and invoice_line_items tables
-- Run this on each tenant database

-- Add columns to invoices table if they don't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Copy data from old columns to new columns if needed
UPDATE invoices 
SET vendor_name = vendor 
WHERE vendor_name IS NULL AND vendor IS NOT NULL;

UPDATE invoices 
SET total_amount = total 
WHERE total_amount IS NULL AND total IS NOT NULL;

-- Add column to invoice_line_items table if it doesn't exist
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS line_total DECIMAL(10,2) DEFAULT 0;

-- Copy data from total to line_total if needed
UPDATE invoice_line_items 
SET line_total = total 
WHERE line_total IS NULL AND total IS NOT NULL;

-- Update convertInvoiceFields function equivalent: ensure both columns have same data
UPDATE invoices 
SET vendor = vendor_name 
WHERE vendor IS NULL AND vendor_name IS NOT NULL;

UPDATE invoices 
SET total = total_amount 
WHERE total IS NULL AND total_amount IS NOT NULL;

UPDATE invoice_line_items 
SET total = line_total 
WHERE total IS NULL AND line_total IS NOT NULL;

SELECT 'Migration completed successfully' as status;
