/**
 * Parking Slots - Regroupement des rotations et détection de chevauchements
 */

export interface Movement {
  id: string;
  flight_number: string;
  flight_no_arr: string | null;
  flight_no_dep: string | null;
  aircraft_type: string;
  registration: string;
  movement_type: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  stand_id: string;
  rotation_id: string | null;
  airline_code?: string | null;
  airline_name?: string | null;
  pax_arr?: number | null;
  pax_dep?: number | null;
}

export interface ParkingSlot {
  id: string; // rotation_id ou mouvement unique id
  rotation_id: string | null;
  stand_id: string;
  arrival: Movement | null;
  departure: Movement | null;
  start_time: Date; // Heure début occupation
  end_time: Date; // Heure fin occupation
  label: string; // Ex: "HF029/HF028 A319"
  has_conflict: boolean;
  conflict_reason?: string;
}

/**
 * Durée par défaut si une des bornes manque (en minutes)
 */
const DEFAULT_DURATION_MINUTES = 45;

/**
 * Regroupe les mouvements par rotation_id en slots
 */
export function buildParkingSlots(
  movements: Movement[],
  selectedDate: string
): ParkingSlot[] {
  const rotationMap = new Map<string, { arr: Movement | null; dep: Movement | null }>();
  const standaloneMovements: Movement[] = [];

  // Grouper par rotation_id
  movements.forEach((movement) => {
    if (movement.rotation_id) {
      if (!rotationMap.has(movement.rotation_id)) {
        rotationMap.set(movement.rotation_id, { arr: null, dep: null });
      }
      const rotation = rotationMap.get(movement.rotation_id)!;

      if (movement.movement_type === 'ARR') {
        rotation.arr = movement;
      } else if (movement.movement_type === 'DEP') {
        rotation.dep = movement;
      }
    } else {
      // Mouvements sans rotation (orphelins)
      standaloneMovements.push(movement);
    }
  });

  const slots: ParkingSlot[] = [];

  // Créer slots depuis rotations
  rotationMap.forEach((rotation, rotationId) => {
    const { arr, dep } = rotation;

    // Calculer start et end
    let startTime: Date;
    let endTime: Date;

    if (arr && dep) {
      // Cas idéal : arrivée + départ
      startTime = getMovementTime(arr);
      endTime = getMovementTime(dep);
    } else if (arr) {
      // Seulement arrivée
      startTime = getMovementTime(arr);
      endTime = new Date(startTime.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    } else if (dep) {
      // Seulement départ
      endTime = getMovementTime(dep);
      startTime = new Date(endTime.getTime() - DEFAULT_DURATION_MINUTES * 60 * 1000);
    } else {
      // Ne devrait pas arriver
      return;
    }

    // Clamp dans la journée
    const { clamped_start, clamped_end } = clampToDay(startTime, endTime, selectedDate);

    // Stand ID (priorité arr puis dep)
    const standId = arr?.stand_id || dep?.stand_id || '';

    // Label
    const flightNumbers: string[] = [];
    if (arr) flightNumbers.push(arr.flight_number);
    if (dep) flightNumbers.push(dep.flight_number);
    const aircraftType = arr?.aircraft_type || dep?.aircraft_type || '';
    const label = `${flightNumbers.join('/')} ${aircraftType}`;

    slots.push({
      id: rotationId,
      rotation_id: rotationId,
      stand_id: standId,
      arrival: arr,
      departure: dep,
      start_time: clamped_start,
      end_time: clamped_end,
      label,
      has_conflict: false
    });
  });

  // Créer slots depuis mouvements standalone
  standaloneMovements.forEach((movement) => {
    const movementTime = getMovementTime(movement);
    let startTime: Date;
    let endTime: Date;

    if (movement.movement_type === 'ARR') {
      startTime = movementTime;
      endTime = new Date(movementTime.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    } else {
      endTime = movementTime;
      startTime = new Date(movementTime.getTime() - DEFAULT_DURATION_MINUTES * 60 * 1000);
    }

    const { clamped_start, clamped_end } = clampToDay(startTime, endTime, selectedDate);

    const label = `${movement.flight_number} ${movement.aircraft_type}`;

    slots.push({
      id: movement.id,
      rotation_id: null,
      stand_id: movement.stand_id,
      arrival: movement.movement_type === 'ARR' ? movement : null,
      departure: movement.movement_type === 'DEP' ? movement : null,
      start_time: clamped_start,
      end_time: clamped_end,
      label,
      has_conflict: false
    });
  });

  return slots;
}

/**
 * Récupère le temps effectif d'un mouvement (priorité actual_time)
 */
function getMovementTime(movement: Movement): Date {
  return movement.actual_time ? new Date(movement.actual_time) : new Date(movement.scheduled_time);
}

/**
 * Clamp les horaires dans la journée sélectionnée (00:00-23:59)
 */
function clampToDay(
  startTime: Date,
  endTime: Date,
  selectedDate: string
): { clamped_start: Date; clamped_end: Date } {
  const dayStart = new Date(selectedDate + 'T00:00:00');
  const dayEnd = new Date(selectedDate + 'T23:59:59');

  const clamped_start = startTime < dayStart ? dayStart : startTime > dayEnd ? dayEnd : startTime;
  const clamped_end = endTime > dayEnd ? dayEnd : endTime < dayStart ? dayStart : endTime;

  return { clamped_start, clamped_end };
}

/**
 * Détecte les chevauchements entre deux slots
 * overlap si A.start < B.end ET B.start < A.end
 */
export function hasOverlap(slotA: ParkingSlot, slotB: ParkingSlot): boolean {
  return (
    slotA.start_time < slotB.end_time &&
    slotB.start_time < slotA.end_time
  );
}

/**
 * Détecte et marque les conflits (chevauchements) sur un même stand
 */
export function detectConflicts(slots: ParkingSlot[]): ParkingSlot[] {
  // Grouper par stand
  const standGroups = new Map<string, ParkingSlot[]>();

  slots.forEach((slot) => {
    if (!standGroups.has(slot.stand_id)) {
      standGroups.set(slot.stand_id, []);
    }
    standGroups.get(slot.stand_id)!.push(slot);
  });

  // Vérifier chevauchements par stand
  standGroups.forEach((standSlots) => {
    for (let i = 0; i < standSlots.length; i++) {
      for (let j = i + 1; j < standSlots.length; j++) {
        const slotA = standSlots[i];
        const slotB = standSlots[j];

        if (hasOverlap(slotA, slotB)) {
          slotA.has_conflict = true;
          slotA.conflict_reason = `Chevauchement avec ${slotB.label}`;
          slotB.has_conflict = true;
          slotB.conflict_reason = `Chevauchement avec ${slotA.label}`;
        }
      }
    }
  });

  return slots;
}

/**
 * Vérifie si un nouveau slot chevaucherait des slots existants sur un stand
 * Retourne la liste des conflits trouvés
 */
export function checkOverlapForNewSlot(
  newSlot: { start_time: Date; end_time: Date; stand_id: string },
  existingSlots: ParkingSlot[]
): ParkingSlot[] {
  const conflicts: ParkingSlot[] = [];

  existingSlots.forEach((slot) => {
    if (slot.stand_id === newSlot.stand_id) {
      if (
        newSlot.start_time < slot.end_time &&
        slot.start_time < newSlot.end_time
      ) {
        conflicts.push(slot);
      }
    }
  });

  return conflicts;
}

/**
 * Converti un slot en heures fractionnaires pour rendering (0-24)
 */
export function slotToHours(slot: ParkingSlot): { startHour: number; endHour: number; duration: number } {
  const startHour = slot.start_time.getHours() + slot.start_time.getMinutes() / 60;
  const endHour = slot.end_time.getHours() + slot.end_time.getMinutes() / 60;
  const duration = endHour - startHour;

  return { startHour, endHour, duration };
}
