
CREATE OR REPLACE FUNCTION public.delete_project_cascade(_project_id uuid, _caller_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _project RECORD;
  _caller_user_id uuid;
  _has_access boolean := false;
BEGIN
  -- Get caller user_id
  SELECT user_id INTO _caller_user_id FROM profiles WHERE id = _caller_profile_id;
  IF _caller_user_id IS NULL THEN RETURN false; END IF;

  -- Get project
  SELECT * INTO _project FROM projects WHERE id = _project_id;
  IF _project IS NULL THEN RETURN false; END IF;

  -- Check access: owner of project
  IF _project.owner_id = _caller_profile_id THEN
    _has_access := true;
  END IF;

  -- Check access: org admin/owner of the project's cluster
  IF NOT _has_access AND _project.cluster_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM cluster_enrollments ce
      JOIN profiles p ON ce.profile_id = p.id
      WHERE p.user_id = _caller_user_id
        AND ce.cluster_id = _project.cluster_id
        AND ce.status = 'approved'
        AND ce.role IN ('owner', 'admin')
    ) INTO _has_access;
  END IF;

  -- Check access: org admin/owner of ANY cluster that has members in this project
  IF NOT _has_access THEN
    SELECT EXISTS(
      SELECT 1 FROM cluster_enrollments ce
      JOIN profiles p ON ce.profile_id = p.id
      WHERE p.user_id = _caller_user_id
        AND ce.status = 'approved'
        AND ce.role IN ('owner', 'admin')
        AND EXISTS(
          SELECT 1 FROM project_teams pt
          JOIN cluster_enrollments ce2 ON pt.profile_id = ce2.profile_id
          WHERE pt.project_id = _project_id
            AND ce2.cluster_id = ce.cluster_id
            AND ce2.status = 'approved'
        )
    ) INTO _has_access;
  END IF;

  IF NOT _has_access THEN RETURN false; END IF;

  -- Cascade delete child records
  DELETE FROM project_doc_comments WHERE doc_id IN (SELECT id FROM project_docs WHERE project_id = _project_id);
  DELETE FROM project_doc_images WHERE doc_id IN (SELECT id FROM project_docs WHERE project_id = _project_id);
  DELETE FROM project_docs WHERE project_id = _project_id;
  DELETE FROM project_task_comments WHERE task_id IN (SELECT id FROM project_tasks WHERE project_id = _project_id);
  DELETE FROM project_tasks WHERE project_id = _project_id;
  DELETE FROM project_teams WHERE project_id = _project_id;
  DELETE FROM messages WHERE project_id = _project_id;
  DELETE FROM project_activities WHERE project_id = _project_id;
  DELETE FROM project_time_entries WHERE project_id = _project_id;
  DELETE FROM project_milestones WHERE project_id = _project_id;
  DELETE FROM project_settings WHERE project_id = _project_id;
  DELETE FROM project_resources WHERE project_id = _project_id;
  DELETE FROM project_links WHERE project_id = _project_id;
  DELETE FROM project_comments WHERE project_id = _project_id;
  
  -- Unlink deals
  UPDATE crm_deals SET project_id = NULL WHERE project_id = _project_id;
  
  -- Unlink AI conversations
  UPDATE ai_conversations SET project_id = NULL WHERE project_id = _project_id;

  -- Delete the project
  DELETE FROM projects WHERE id = _project_id;

  RETURN true;
END;
$function$;
