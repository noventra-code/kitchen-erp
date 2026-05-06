-- Tenant Database Initialization
-- This template will be cloned for each new tenant
-- Contains all tenant-specific tables

-- Local recipes (cloned from master recipes)
CREATE TABLE IF NOT EXISTS local_recipes (
    id SERIAL PRIMARY KEY,
    master_recipe_id INTEGER, -- Reference to master recipe (for tracking)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    servings INTEGER,
    category VARCHAR(100) DEFAULT 'Uncategorized', -- Recipe category
    ingredients_json JSONB,
    instructions JSONB,
    image_url VARCHAR(500),
    labor_rate_id INTEGER,
    fixed_cost_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients table (tenant-specific ingredient catalog)
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50), -- oz, lb, g, kg, ml, l, each, case, etc.
    cost_per_unit DECIMAL(10,2),
    current_stock DECIMAL(10,2) DEFAULT 0,
    low_stock_threshold DECIMAL(10,2),
    invoice_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100),
    vendor_name VARCHAR(255),
    vendor VARCHAR(255), -- Keep for backward compatibility
    invoice_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    total DECIMAL(10,2), -- Keep for backward compatibility
    description TEXT,
    file_url VARCHAR(500), -- Path to uploaded invoice file
    ocr_raw TEXT, -- Raw OCR output
    parsed_data JSONB, -- Structured data after OCR parsing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER,
    cases DECIMAL(10,2) DEFAULT 0,
    pack_size VARCHAR(50),
    category VARCHAR(50),
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0, -- Keep for backward compatibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labor rates table
CREATE TABLE IF NOT EXISTS labor_rates (
    id SERIAL PRIMARY KEY,
    role VARCHAR(100), -- prep cook, line cook, chef, etc.
    hourly_rate DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fixed costs table (overhead)
CREATE TABLE IF NOT EXISTS fixed_costs (
    id SERIAL PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample fixed costs
INSERT INTO fixed_costs (item, type, value) VALUES
('Rent', 'Rent', 5000.00),
('Utilities', 'Utilities', 800.00),
('Insurance', 'Insurance', 400.00),
('Equipment Depreciation', 'Equipment', 200.00)
ON CONFLICT DO NOTHING;
