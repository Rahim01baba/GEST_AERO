/**
 * Unified billing engine - single source of truth for all invoice calculations
 * Used by InvoicePreviewModal, InvoiceEditorModal, and BillingEditor
 */

import { supabase } from './supabase';
import type { BillingScope } from './billingScope';
import {
  calculateAllItems,
  calculateTotal,
  calculateGroupTotals,
  type BillingCalculationInput,
  type InvoiceItem
} from './billing';

export type DocumentType = 'PROFORMA' | 'INVOICE';

export interface InvoiceHeader {
  documentType: DocumentType;
  scope: BillingScope;
  mtow_kg: number;
  registration: string;
  airline_code?: string;
  airline_name?: string;
  aircraft_type?: string;
  traffic_type: 'NAT' | 'INT';
}

export interface InvoiceTotals {
  items_total_xof: number;
  group_totals: Record<string, number>;
  grand_total_xof: number;
}

export interface InvoiceModel {
  header: InvoiceHeader;
  items: InvoiceItem[];
  totals: InvoiceTotals;
}

/**
 * Get MTOW for a billing scope
 * Priority:
 * 1. Max of movement.mtow_kg from scope movements
 * 2. Lookup via aircraft_registry RPC
 * 3. Fallback to aircrafts table
 * 4. Throw error if no MTOW found
 */
export async function getMtowForScope(scope: BillingScope): Promise<number> {
  const mtowValues = scope.movements
    .map(m => m.mtow_kg)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);

  if (mtowValues.length > 0) {
    return Math.max(...mtowValues);
  }

  const registration = scope.movements[0]?.registration;
  if (!registration) {
    throw new Error('Aucune immatriculation trouvée pour déterminer le MTOW');
  }

  const { data: lookupData, error: lookupError } = await supabase.rpc(
    'lookup_aircraft_by_registration',
    { reg: registration }
  );

  if (!lookupError && lookupData && lookupData.length > 0 && lookupData[0].mtow_kg) {
    return lookupData[0].mtow_kg;
  }

  const { data: aircraftData, error: aircraftError } = await supabase
    .from('aircrafts')
    .select('mtow_kg')
    .eq('registration', registration)
    .maybeSingle();

  if (!aircraftError && aircraftData?.mtow_kg) {
    return aircraftData.mtow_kg;
  }

  throw new Error(
    `MTOW requis pour calculer la facture. Aucune donnée MTOW trouvée pour ${registration}`
  );
}

/**
 * Build complete invoice model from billing scope
 * This is the single source of truth for invoice calculations
 */
export async function buildInvoiceModelFromScope(
  scope: BillingScope,
  params: {
    documentType: DocumentType;
    customMtow?: number;
    pax_full?: number;
    pax_half?: number;
    pax_transit?: number;
    freight_kg?: number;
    fuel_liters?: number;
    overtime_hours?: number;
    freight_rate_xof_kg?: number;
    fuel_rate_xof_liter?: number;
    overtime_rate_xof_hour?: number;
  }
): Promise<InvoiceModel> {
  const mtow_kg = params.customMtow || (await getMtowForScope(scope));

  const firstMovement = scope.movements[0];
  if (!firstMovement) {
    throw new Error('Aucun mouvement dans le scope');
  }

  const arrMovement = scope.movements.find(m => m.movement_type === 'ARR');
  const depMovement = scope.movements.find(m => m.movement_type === 'DEP');

  const arr_datetime = arrMovement ? new Date(arrMovement.scheduled_time) : undefined;
  const dep_datetime = depMovement ? new Date(depMovement.scheduled_time) : undefined;

  const traffic_type = firstMovement.traffic_type === 'INT' ? 'INT' : 'NAT';

  const include_lighting_arr = arrMovement !== undefined;
  const include_lighting_dep = depMovement !== undefined;

  const calculationInput: BillingCalculationInput = {
    mtow_kg,
    traffic_type,
    arr_datetime,
    dep_datetime,
    pax_full: params.pax_full,
    pax_half: params.pax_half,
    pax_transit: params.pax_transit,
    freight_kg: params.freight_kg,
    fuel_liters: params.fuel_liters,
    overtime_hours: params.overtime_hours,
    include_lighting_arr,
    include_lighting_dep,
    freight_rate_xof_kg: params.freight_rate_xof_kg,
    fuel_rate_xof_liter: params.fuel_rate_xof_liter,
    overtime_rate_xof_hour: params.overtime_rate_xof_hour
  };

  const items = calculateAllItems(calculationInput);
  const items_total = calculateTotal(items);
  const group_totals = calculateGroupTotals(items);

  const header: InvoiceHeader = {
    documentType: params.documentType,
    scope,
    mtow_kg,
    registration: firstMovement.registration,
    airline_code: firstMovement.airline_code || undefined,
    airline_name: firstMovement.airline_name || undefined,
    aircraft_type: firstMovement.aircraft_type || undefined,
    traffic_type
  };

  const totals: InvoiceTotals = {
    items_total_xof: items_total,
    group_totals,
    grand_total_xof: items_total
  };

  return {
    header,
    items,
    totals
  };
}

/**
 * Save invoice to database
 */
export async function saveInvoice(
  model: InvoiceModel,
  params: {
    client_name: string;
    client_address?: string;
    notes?: string;
    status?: string;
  }
): Promise<{ invoice_id: string; invoice_number: string }> {
  const movementIds = model.header.scope.movements.map(m => m.id);

  const invoiceData = {
    movement_id: movementIds[0],
    client_name: params.client_name,
    client_address: params.client_address || null,
    invoice_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount_xof: model.totals.grand_total_xof,
    status: params.status || 'draft',
    notes: params.notes || null,
    document_type: model.header.documentType,
    rotation_id: model.header.scope.rotation_id || null
  };

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single();

  if (invoiceError || !invoice) {
    throw new Error(`Erreur lors de la création de la facture: ${invoiceError?.message}`);
  }

  const itemsData = model.items.map(item => ({
    invoice_id: invoice.id,
    item_code: item.code,
    description: item.label,
    quantity: item.qty,
    unit_price_xof: item.unit_price_xof,
    total_price_xof: item.total_xof,
    item_group: item.item_group,
    sort_order: item.sort_order
  }));

  const { error: itemsError } = await supabase.from('invoice_items').insert(itemsData);

  if (itemsError) {
    await supabase.from('invoices').delete().eq('id', invoice.id);
    throw new Error(`Erreur lors de l'ajout des lignes de facture: ${itemsError.message}`);
  }

  if (model.header.documentType === 'INVOICE') {
    const { error: updateError } = await supabase
      .from('aircraft_movements')
      .update({ is_invoiced: true })
      .in('id', movementIds);

    if (updateError) {
      console.error('Erreur lors de la mise à jour is_invoiced:', updateError);
    }
  }

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number
  };
}
