import { describe, it, expect } from 'vitest';
import { getUserRole, can, canViewAllAirports, type UserRole } from '../permissions';

describe('permissions - getUserRole', () => {
  it('parses local ATS email correctly', () => {
    const role = getUserRole('atsabj@airport.com');
    expect(role.role).toBe('ats');
    expect(role.scope).toBe('local');
    expect(role.airport_code).toBe('ABJ');
    expect(role.email).toBe('atsabj@airport.com');
  });

  it('parses local AIM email correctly', () => {
    const role = getUserRole('aimbyk@airport.com');
    expect(role.role).toBe('aim');
    expect(role.scope).toBe('local');
    expect(role.airport_code).toBe('BYK');
  });

  it('parses local CMD email correctly', () => {
    const role = getUserRole('cmdodi@airport.com');
    expect(role.role).toBe('cmd');
    expect(role.scope).toBe('local');
    expect(role.airport_code).toBe('ODI');
  });

  it('parses global ATS email correctly', () => {
    const role = getUserRole('ats@airport.com');
    expect(role.role).toBe('ats');
    expect(role.scope).toBe('global');
    expect(role.airport_code).toBeUndefined();
  });

  it('parses global DEDC email correctly', () => {
    const role = getUserRole('dedc@airport.com');
    expect(role.role).toBe('dedc');
    expect(role.scope).toBe('global');
  });

  it('parses global DIAA email correctly', () => {
    const role = getUserRole('diaa@airport.com');
    expect(role.role).toBe('diaa');
    expect(role.scope).toBe('global');
  });

  it('defaults unknown email to local ATS', () => {
    const role = getUserRole('unknown@example.com');
    expect(role.role).toBe('ats');
    expect(role.scope).toBe('local');
  });

  it('is case insensitive', () => {
    const role1 = getUserRole('ATSABJ@AIRPORT.COM');
    const role2 = getUserRole('atsabj@airport.com');

    expect(role1.role).toBe(role2.role);
    expect(role1.scope).toBe(role2.scope);
    expect(role1.airport_code).toBe(role2.airport_code);
  });
});

describe('permissions - can', () => {
  const localATS: UserRole = {
    role: 'ats',
    scope: 'local',
    airport_code: 'ABJ',
    email: 'atsabj@airport.com',
  };

  const globalAIM: UserRole = {
    role: 'aim',
    scope: 'global',
    email: 'aim@airport.com',
  };

  const globalDIAA: UserRole = {
    role: 'diaa',
    scope: 'global',
    email: 'diaa@airport.com',
  };

  const admin: UserRole = {
    role: 'ats',
    scope: 'local',
    email: 'admin@example.com',
    isAdmin: true,
  };

  describe('view_movements', () => {
    it('allows everyone to view movements', () => {
      expect(can('view_movements', localATS)).toBe(true);
      expect(can('view_movements', globalAIM)).toBe(true);
      expect(can('view_movements', globalDIAA)).toBe(true);
    });
  });

  describe('edit_movements', () => {
    it('allows local ATS to edit movements', () => {
      expect(can('edit_movements', localATS)).toBe(true);
    });

    it('denies global roles to edit movements', () => {
      expect(can('edit_movements', globalAIM)).toBe(false);
      expect(can('edit_movements', globalDIAA)).toBe(false);
    });
  });

  describe('create_movements', () => {
    it('allows local ATS to create movements', () => {
      expect(can('create_movements', localATS)).toBe(true);
    });

    it('denies global roles to create movements', () => {
      expect(can('create_movements', globalAIM)).toBe(false);
    });
  });

  describe('delete_movements', () => {
    it('allows local ATS to delete movements', () => {
      expect(can('delete_movements', localATS)).toBe(true);
    });

    it('denies global roles to delete movements', () => {
      expect(can('delete_movements', globalAIM)).toBe(false);
    });
  });

  describe('view_invoices', () => {
    it('denies local ATS to view invoices', () => {
      expect(can('view_invoices', localATS)).toBe(false);
    });

    it('allows global AIM to view invoices', () => {
      expect(can('view_invoices', globalAIM)).toBe(true);
    });

    it('allows global DIAA to view invoices', () => {
      expect(can('view_invoices', globalDIAA)).toBe(true);
    });
  });

  describe('create_invoice', () => {
    it('allows AIM to create invoices', () => {
      expect(can('create_invoice', globalAIM)).toBe(true);
    });

    it('denies ATS to create invoices', () => {
      expect(can('create_invoice', localATS)).toBe(false);
    });

    it('denies DIAA to create invoices', () => {
      expect(can('create_invoice', globalDIAA)).toBe(false);
    });
  });

  describe('create_proforma', () => {
    it('allows AIM to create proformas', () => {
      expect(can('create_proforma', globalAIM)).toBe(true);
    });

    it('denies ATS to create proformas', () => {
      expect(can('create_proforma', localATS)).toBe(false);
    });
  });

  describe('export_csv', () => {
    it('denies local ATS to export CSV', () => {
      expect(can('export_csv', localATS)).toBe(false);
    });

    it('allows global AIM to export CSV', () => {
      expect(can('export_csv', globalAIM)).toBe(true);
    });
  });

  describe('edit_airport', () => {
    it('allows global DIAA to edit airports', () => {
      expect(can('edit_airport', globalDIAA)).toBe(true);
    });

    it('denies ATS to edit airports', () => {
      expect(can('edit_airport', localATS)).toBe(false);
    });

    it('denies AIM to edit airports', () => {
      expect(can('edit_airport', globalAIM)).toBe(false);
    });
  });

  describe('edit_aircraft', () => {
    it('allows global AIM to edit aircraft', () => {
      expect(can('edit_aircraft', globalAIM)).toBe(true);
    });

    it('denies local ATS to edit aircraft', () => {
      expect(can('edit_aircraft', localATS)).toBe(false);
    });

    it('denies DIAA to edit aircraft', () => {
      expect(can('edit_aircraft', globalDIAA)).toBe(false);
    });
  });

  describe('edit_billing_settings', () => {
    it('allows global AIM to edit billing settings', () => {
      expect(can('edit_billing_settings', globalAIM)).toBe(true);
    });

    it('denies local ATS to edit billing settings', () => {
      expect(can('edit_billing_settings', localATS)).toBe(false);
    });

    it('denies DIAA to edit billing settings', () => {
      expect(can('edit_billing_settings', globalDIAA)).toBe(false);
    });
  });

  describe('admin override', () => {
    it('allows admin to do everything', () => {
      expect(can('view_movements', admin)).toBe(true);
      expect(can('edit_movements', admin)).toBe(true);
      expect(can('create_invoice', admin)).toBe(true);
      expect(can('edit_airport', admin)).toBe(true);
      expect(can('edit_aircraft', admin)).toBe(true);
      expect(can('edit_billing_settings', admin)).toBe(true);
    });
  });
});

describe('permissions - canViewAllAirports', () => {
  it('allows admin to view all airports', () => {
    const admin: UserRole = {
      role: 'ats',
      scope: 'local',
      email: 'admin@example.com',
      isAdmin: true,
    };

    expect(canViewAllAirports(admin)).toBe(true);
  });

  it('allows global users to view all airports', () => {
    const globalUser: UserRole = {
      role: 'aim',
      scope: 'global',
      email: 'aim@airport.com',
    };

    expect(canViewAllAirports(globalUser)).toBe(true);
  });

  it('denies local users to view all airports', () => {
    const localUser: UserRole = {
      role: 'ats',
      scope: 'local',
      airport_code: 'ABJ',
      email: 'atsabj@airport.com',
    };

    expect(canViewAllAirports(localUser)).toBe(false);
  });
});
