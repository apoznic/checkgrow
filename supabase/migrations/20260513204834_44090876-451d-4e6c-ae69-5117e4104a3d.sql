
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'project_tasks','project_task_comments','project_meetings','project_links',
    'project_link_groups','project_sticky_notes','project_docs','project_doc_comments',
    'project_milestones','project_resources','project_strategic_goals',
    'project_checklist_items','project_checklist_confirmations','project_key_people',
    'project_comments','project_time_entries','projects'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;
