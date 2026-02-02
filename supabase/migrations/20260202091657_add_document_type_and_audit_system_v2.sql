/*
  # Add Document Type and Enhanced Audit System

  ## Changes

  ### 1. Invoices Table Updates
    - Add `document_type` column (PROFORMA or INVOICE)
    - Add `rotation_id` column to link invoices to rotations

  ### 2. Enhanced Audit System
    - Keep existing audit_logs structure
    - Add new detailed_audit_logs table with enhanced tracking
    - Create triggers for aircraft_movements, invoices, invoice_items

  ## Security
    - RLS enabled on detailed_audit_logs (admin only)
    - Audit triggers capture user_id from auth.uid()
*/

-- Add document_type to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN document_type text NOT NULL DEFAULT 'INVOICE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_document_type_chk'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_document_type_chk
    CHECK (document_type IN ('PROFORMA', 'INVOICE'));
  END IF;
END $$;

-- Ensure rotation_id exists in invoices (should already exist based on table list)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rotation_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN rotation_id uuid;
  END IF;
END $$;

-- Create detailed_audit_logs table with enhanced tracking
CREATE TABLE IF NOT EXISTS detailed_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now() NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[]
);

-- Enable RLS on detailed_audit_logs
ALTER TABLE detailed_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view detailed audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'detailed_audit_logs' AND policyname = 'Admins can view detailed audit logs'
  ) THEN
    CREATE POLICY "Admins can view detailed audit logs"
      ON detailed_audit_logs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Create indexes for detailed_audit_logs
CREATE INDEX IF NOT EXISTS detailed_audit_logs_table_record_idx
  ON detailed_audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS detailed_audit_logs_changed_at_idx
  ON detailed_audit_logs(changed_at DESC);

CREATE INDEX IF NOT EXISTS detailed_audit_logs_changed_by_idx
  ON detailed_audit_logs(changed_by);

-- Generic detailed audit logging function
CREATE OR REPLACE FUNCTION log_detailed_audit()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array text[];
  old_json jsonb;
  new_json jsonb;
  audit_table_name text;
  audit_record_id uuid;
  audit_action text;
BEGIN
  audit_table_name := TG_TABLE_NAME;
  audit_action := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    new_json := NULL;
    audit_record_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    old_json := NULL;
    new_json := to_jsonb(NEW);
    audit_record_id := NEW.id;
  ELSE
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    audit_record_id := NEW.id;

    SELECT array_agg(key)
    INTO changed_fields_array
    FROM jsonb_each(new_json)
    WHERE new_json->key IS DISTINCT FROM old_json->key;
  END IF;

  INSERT INTO detailed_audit_logs (
    table_name,
    record_id,
    action,
    changed_by,
    changed_at,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    audit_table_name,
    audit_record_id,
    audit_action,
    auth.uid(),
    now(),
    old_json,
    new_json,
    changed_fields_array
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for aircraft_movements
DROP TRIGGER IF EXISTS detailed_audit_aircraft_movements_trigger ON aircraft_movements;
CREATE TRIGGER detailed_audit_aircraft_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON aircraft_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_detailed_audit();

-- Create triggers for invoices
DROP TRIGGER IF EXISTS detailed_audit_invoices_trigger ON invoices;
CREATE TRIGGER detailed_audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_detailed_audit();

-- Create triggers for invoice_items
DROP TRIGGER IF EXISTS detailed_audit_invoice_items_trigger ON invoice_items;
CREATE TRIGGER detailed_audit_invoice_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION log_detailed_audit();
