-- ─── Migration 003: Owner Assignment Configuration ───────────────────────────
--
-- Adds owner_config JSONB column to sync_configs.
-- Stores how records created in the target org should be owned.
--
-- Shape:
-- {
--   "strategy": "fixed" | "round_robin" | "passthrough",
--   "target_users": [{ "id": "005...", "name": "Jane Doe", "email": "jane@..." }],
--   -- For bidirectional syncs only:
--   "reverse_strategy": "fixed" | "round_robin" | "passthrough",
--   "reverse_users": [{ "id": "005...", "name": "John Smith", "email": "john@..." }]
-- }
--
-- Strategies:
--   fixed        — All created records are owned by target_users[0]
--   round_robin  — Records rotate through target_users in order
--   passthrough  — Source OwnerId is copied as-is (will fail if user doesn't exist in target)

ALTER TABLE sync_configs
  ADD COLUMN IF NOT EXISTS owner_config JSONB DEFAULT NULL;

COMMENT ON COLUMN sync_configs.owner_config IS
  'Owner assignment strategy for records created in the target org. '
  'Null means no explicit owner override (OwnerId from source is used as-is, which may fail cross-org).';
