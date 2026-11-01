-- Foundation migration. Business tables and seed data arrive in Phase 2.
CREATE TABLE schema_metadata (
    id INTEGER PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_metadata (id, description) VALUES (1, 'Airline reservation foundation');
