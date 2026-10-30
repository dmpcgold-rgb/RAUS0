-- Defense in depth: approved participants can only read and write new messages.
-- Existing history stays append-only; RLS additionally checks authorization.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
 ON TABLE public.rauso_outing_messages FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.rauso_outing_messages TO authenticated;
