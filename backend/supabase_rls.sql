-- =============================================================================
-- DLLM Backend Supabase Row Level Security (RLS) Definition File
-- Enables RLS and defines policies for all 8 database tables asserting
-- user isolation via auth.uid() = user_id
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: users
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own profile" ON users;
CREATE POLICY "Users can select own profile"
    ON users FOR SELECT
    USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- -----------------------------------------------------------------------------
-- 2. Table: user_settings
-- -----------------------------------------------------------------------------
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
    ON user_settings FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 3. Table: usage_limits
-- -----------------------------------------------------------------------------
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own usage limits" ON usage_limits;
CREATE POLICY "Users can select own usage limits"
    ON usage_limits FOR SELECT
    USING (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 4. Table: usage_logs
-- -----------------------------------------------------------------------------
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own usage logs" ON usage_logs;
CREATE POLICY "Users can manage own usage logs"
    ON usage_logs FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 5. Table: chat_sessions
-- -----------------------------------------------------------------------------
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own chat sessions" ON chat_sessions;
CREATE POLICY "Users can manage own chat sessions"
    ON chat_sessions FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 6. Table: chat_messages
-- -----------------------------------------------------------------------------
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage messages in own sessions" ON chat_messages;
CREATE POLICY "Users can manage messages in own sessions"
    ON chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()::text
        )
    );

-- -----------------------------------------------------------------------------
-- 7. Table: message_attachments
-- -----------------------------------------------------------------------------
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage attachments in own messages" ON message_attachments;
CREATE POLICY "Users can manage attachments in own messages"
    ON message_attachments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_messages
            JOIN chat_sessions ON chat_sessions.id = chat_messages.session_id
            WHERE chat_messages.id = message_attachments.message_id
              AND chat_sessions.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_messages
            JOIN chat_sessions ON chat_sessions.id = chat_messages.session_id
            WHERE chat_messages.id = message_attachments.message_id
              AND chat_sessions.user_id = auth.uid()::text
        )
    );

-- -----------------------------------------------------------------------------
-- 8. Table: custom_instructions
-- -----------------------------------------------------------------------------
ALTER TABLE custom_instructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own custom instructions" ON custom_instructions;
CREATE POLICY "Users can manage own custom instructions"
    ON custom_instructions FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
