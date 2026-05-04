-- Main Database Initialization
-- This database stores tenant metadata, users, and master recipes

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    db_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'staff')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create master_recipes table (global recipe library)
CREATE TABLE IF NOT EXISTS master_recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    servings INTEGER,
    ingredients_json JSONB, -- Array of {name, amount, unit, cost_per_unit}
    instructions JSONB, -- Array of instruction steps
    image_url VARCHAR(500),
    is_public BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample master recipes
INSERT INTO tenants (name, db_name) VALUES 
('Demo Kitchen', 'tenant_demo_kitchen')
ON CONFLICT (db_name) DO NOTHING;

-- Sample master recipe
INSERT INTO master_recipes (name, description, prep_time, cook_time, servings, ingredients_json, instructions) 
VALUES (
    'Classic Margherita Pizza',
    'A simple and delicious Neapolitan-style pizza with fresh mozzarella and basil.',
    30,
    15,
    4,
    '[
        {"name": "Pizza Dough", "amount": 1, "unit": "ball", "cost_per_unit": 2.50},
        {"name": "San Marzano Tomatoes", "amount": 200, "unit": "g", "cost_per_unit": 0.01},
        {"name": "Fresh Mozzarella", "amount": 200, "unit": "g", "cost_per_unit": 0.02},
        {"name": "Fresh Basil", "amount": 10, "unit": "leaves", "cost_per_unit": 0.10},
        {"name": "Extra Virgin Olive Oil", "amount": 30, "unit": "ml", "cost_per_unit": 0.05}
    ]',
    '[
        "Preheat oven to 500°F (260°C)",
        "Roll out pizza dough to 12-inch circle",
        "Spread crushed tomatoes evenly",
        "Add slices of fresh mozzarella",
        "Bake for 12-15 minutes until crust is golden",
        "Top with fresh basil leaves and drizzle with olive oil"
    ]'
) ON CONFLICT DO NOTHING;
