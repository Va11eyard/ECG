package queries

const (
	ECGLinkDeleteForUser = `
DELETE FROM ecg_link_codes WHERE user_id = $1::uuid`

	ECGLinkInsert = `
INSERT INTO ecg_link_codes (user_id, code, expires_at)
VALUES ($1::uuid, $2, $3)
RETURNING id::text, user_id::text, code, expires_at, created_at`

	ECGLinkSelectByCode = `
SELECT id::text, user_id::text, code, expires_at, created_at
FROM ecg_link_codes
WHERE code = $1`

	ECGLinkDeleteByID = `
DELETE FROM ecg_link_codes WHERE id = $1::uuid`

	ECGDeviceInsert = `
INSERT INTO ecg_devices (user_id, mac, name, agent_token_hash)
VALUES ($1::uuid, $2, $3, $4)
RETURNING id::text, user_id::text, mac, name, agent_token_hash, last_seen_at, created_at, updated_at`

	ECGDeviceSelectByID = `
SELECT id::text, user_id::text, mac, name, agent_token_hash, last_seen_at, created_at, updated_at
FROM ecg_devices WHERE id = $1::uuid`

	ECGDeviceSelectByMAC = `
SELECT id::text, user_id::text, mac, name, agent_token_hash, last_seen_at, created_at, updated_at
FROM ecg_devices WHERE mac = $1`

	ECGDeviceSelectByTokenHash = `
SELECT id::text, user_id::text, mac, name, agent_token_hash, last_seen_at, created_at, updated_at
FROM ecg_devices WHERE agent_token_hash = $1`

	ECGDeviceListByUser = `
SELECT id::text, user_id::text, mac, name, agent_token_hash, last_seen_at, created_at, updated_at
FROM ecg_devices WHERE user_id = $1::uuid
ORDER BY created_at DESC`

	ECGDeviceTouch = `
UPDATE ecg_devices SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`

	ECGDeviceDelete = `
DELETE FROM ecg_devices WHERE id = $1::uuid AND user_id = $2::uuid`
)
