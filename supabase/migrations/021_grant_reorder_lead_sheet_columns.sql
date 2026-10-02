-- Service role calls this via createAdminClient(); migration 020 revoked PUBLIC but did not grant service_role.
grant execute on function public.reorder_lead_sheet_template_columns(uuid, uuid[]) to service_role;
