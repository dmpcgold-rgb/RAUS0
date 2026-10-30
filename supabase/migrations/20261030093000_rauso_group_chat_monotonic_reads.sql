-- RAUSO: stale devices must not move an account's read position backwards.
-- SECURITY INVOKER trigger: preserves RLS ownership checks.
CREATE OR REPLACE FUNCTION private.rauso_monotonic_chat_read()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF NEW.outing_id IS DISTINCT FROM OLD.outing_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
   RAISE EXCEPTION 'Gruppenchat-Zuordnung darf nicht verändert werden' USING ERRCODE='42501';
 END IF;
 NEW.last_read_at:=GREATEST(OLD.last_read_at,NEW.last_read_at);
 RETURN NEW;
END $fn$;
CREATE TRIGGER rauso_group_read_monotonic BEFORE UPDATE
 ON public.rauso_outing_chat_reads
 FOR EACH ROW EXECUTE FUNCTION private.rauso_monotonic_chat_read();
