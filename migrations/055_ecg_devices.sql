-- Portable ECG devices (BLE AIECG) linked to InLab accounts.

CREATE TABLE IF NOT EXISTS ecg_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mac TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    agent_token_hash TEXT NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ecg_devices_mac_unique UNIQUE (mac)
);

CREATE INDEX IF NOT EXISTS ecg_devices_user_id_idx ON ecg_devices (user_id);
CREATE INDEX IF NOT EXISTS ecg_devices_agent_token_hash_idx ON ecg_devices (agent_token_hash);

CREATE TABLE IF NOT EXISTS ecg_link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ecg_link_codes_user_id_idx ON ecg_link_codes (user_id);
CREATE INDEX IF NOT EXISTS ecg_link_codes_expires_at_idx ON ecg_link_codes (expires_at);
