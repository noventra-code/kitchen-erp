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
    vendor VARCHAR(255),
    invoice_number VARCHAR(100),
    total DECIMAL(10,2),
    file_url VARCHAR(500), -- Path to uploaded invoice file
    ocr_raw TEXT, -- Raw OCR output
    parsed_data JSONB, -- Structured data after OCR parsing
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
    invoice_date DATE,
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

-- Insert sample fixed costs
INSERT INTO fixed_costs (name, amount, allocation_type) VALUES
('Rent', 5000.00, 'per_month'),
('Utilities', 800.00, 'per_month'),
('Insurance', 400.00, 'per_month'),
('Equipment Depreciation', 200.00, 'per_month')
ON CONFLICT DO NOTHING;
