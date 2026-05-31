-- Add airport-specific report types to the location_reports check constraint.
-- We drop the old constraint and replace it with the expanded list.

alter table location_reports
  drop constraint if exists location_reports_report_type_check;

alter table location_reports
  add constraint location_reports_report_type_check
  check (report_type in (
    'vibe', 'price', 'service', 'event',
    'cover_charge', 'parking', 'cleanliness', 'wait_time',
    'security_line', 'tsa_precheck', 'baggage_dropoff'
  ));
