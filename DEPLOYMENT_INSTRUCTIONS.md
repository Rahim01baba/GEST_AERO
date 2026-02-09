# 🚀 Instructions de Déploiement - Airport Manager Refactorisé

**Version:** 1.0
**Date:** 2026-02-09

---

## ⚡ Déploiement Rapide (5 min)

### 1. Pré-requis

```bash
node --version  # v18+ requis
npm --version   # v9+ requis
```

### 2. Validation Locale

```bash
cd /tmp/cc-agent/60079395/project

# Install dependencies
npm install

# Build
npm run build

# Tests
npm test -- --run

# Vérifier résultats
# ✅ Build: Success
# ✅ Tests: 38/38 passed
```

### 3. Déploiement

```bash
# Build de production
npm run build

# Déployer dist/ selon votre méthode
# (Netlify, Vercel, S3, etc.)
```

**Edge Functions:** Déjà déployées automatiquement sur Supabase.

---

## 🔧 Configuration Post-Déploiement

### Variables d'Environnement

**Vérifier que le fichier `.env` contient:**

```env
VITE_SUPABASE_URL=https://yjbigexmqmkxyxlecdej.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # NON exposée au client
```

**Important:**
- ✅ `VITE_*` variables exposées au client (OK)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` jamais exposée (serveur only)

### Feature Flags

**État initial (SAFE):**
```typescript
{
  USE_EDGE_FUNCTIONS: false,      // ⚠️ À activer après tests
  STRICT_TYPES: false,            // ⚠️ Non implémenté
  STRICT_VALIDATION: false,       // ⚠️ Non implémenté
  NEW_DATETIME_HANDLING: false,   // ⚠️ Non implémenté
  ENABLE_RATE_LIMITING: false     // ✅ Actif dans Edge Functions
}
```

**Comportement par défaut:**
- Application fonctionne exactement comme avant
- Aucun changement visible pour l'utilisateur
- Rollback instantané disponible

---

## 📊 Vérifications Post-Déploiement

### 1. Application Démarre

```
✅ Page de login accessible
✅ Pas d'erreur console
✅ Assets chargent correctement
```

### 2. Fonctionnalités de Base

**Smoke Test (2 min):**

1. ✅ Login admin
2. ✅ Liste mouvements visible
3. ✅ Création mouvement fonctionne
4. ✅ Preview facture OK
5. ✅ Création facture OK

### 3. Console Navigateur

Ouvrir DevTools (F12):
```
✅ Pas d'erreur rouge
✅ Max 2-3 warnings non critiques
✅ Pas de "SERVICE_ROLE" visible
```

---

## 🎯 Activation Progressive Edge Functions

### Phase 1: Test Utilisateur Unique (Jour 1)

**Activer pour 1 admin:**

```javascript
// Console navigateur (F12)
featureFlags.set('USE_EDGE_FUNCTIONS', true);
location.reload();
```

**Tester:**
- Création mouvement
- Mise à jour mouvement
- Preview facture

**Vérifier:**
- Latence acceptable (<500ms)
- Pas d'erreur
- Rate limiting fonctionne (30 req/min)

**Si problème → Rollback immédiat:**
```javascript
featureFlags.set('USE_EDGE_FUNCTIONS', false);
location.reload();
```

### Phase 2: Pilotes (Jour 2-5)

**Activer pour 3-5 utilisateurs pilotes:**

Répéter Phase 1 pour chaque utilisateur.

**Monitoring:**
- Logs Supabase Edge Functions
- Retours utilisateurs
- Temps de réponse API

### Phase 3: Production (Semaine 2)

**Activation globale:**

Modifier `src/config/flags.ts`:
```typescript
const defaultFlags: FeatureFlags = {
  USE_EDGE_FUNCTIONS: true,  // ← Changé
  // ...
};
```

Rebuild et redeploy:
```bash
npm run build
# Déployer dist/
```

---

## 🚨 Procédure d'Urgence

### Si Problème Critique Post-Activation

**1. Rollback Immédiat (30 secondes)**

Sur un compte admin:
```javascript
// Console navigateur (F12)
localStorage.setItem('feature_flags', JSON.stringify({
  USE_EDGE_FUNCTIONS: false,
  STRICT_TYPES: false,
  STRICT_VALIDATION: false,
  NEW_DATETIME_HANDLING: false,
  ENABLE_RATE_LIMITING: false
}));
location.reload();
```

**2. Communication**

Informer utilisateurs:
- "Maintenance en cours"
- "Retour à version stable"
- "Aucune perte de données"

**3. Investigation**

- Capturer logs Edge Functions (Supabase Dashboard)
- Noter erreur et étapes de reproduction
- Consulter `REFACTORING_FINAL_REPORT.md`

---

## 🔍 Monitoring & Logs

### Supabase Dashboard

1. Ouvrir https://supabase.com/dashboard
2. Projet: yjbigexmqmkxyxlecdej
3. Section "Edge Functions"
4. Voir logs en temps réel

**Logs à surveiller:**
- Erreurs 500
- Rate limit (429)
- Validation errors (400)

### Console Navigateur

**Erreurs à surveiller:**
```javascript
// Ouvrir DevTools (F12)
// Onglet Console

// ✅ Normal
[DEBUG] Using Edge Function for createMovement
[INFO] Movement created successfully

// ❌ Problème
[ERROR] Edge function call failed
[ERROR] RATE_LIMIT: Too many requests
```

---

## 📝 Checklist Déploiement

### Avant Déploiement

- [ ] `npm run build` OK
- [ ] `npm test` OK (38/38)
- [ ] `.env` configuré correctement
- [ ] Pas de secrets exposés
- [ ] Edge Functions déployées

### Après Déploiement

- [ ] Application accessible
- [ ] Login fonctionne
- [ ] Smoke tests passent
- [ ] Console sans erreur critique
- [ ] Feature flags désactivés
- [ ] Rollback testé

### Activation Edge Functions

- [ ] Test 1 utilisateur OK (24h)
- [ ] Test pilotes OK (3-5 jours)
- [ ] Monitoring en place
- [ ] Retours utilisateurs positifs
- [ ] Performance acceptable
- [ ] Activation globale

---

## 💡 Commandes Utiles

### Build & Test

```bash
# Build complet
npm run build

# Tests unitaires
npm test -- --run

# Tests avec coverage
npm test -- --coverage

# Dev local
npm run dev
```

### Vérification Sécurité

```bash
# Vérifier aucun secret exposé
grep -r "SERVICE_ROLE" src/
# Résultat attendu: No matches

# Vérifier .env
cat .env | grep VITE_
# Résultat: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### Logs Edge Functions

```bash
# Via Supabase CLI (si installé)
supabase functions logs create-movement
supabase functions logs update-movement
supabase functions logs invoice-preview
```

---

## 🎓 Formation Utilisateurs

### Pour les Administrateurs

**Activer Edge Functions:**
```javascript
// Console (F12)
featureFlags.set('USE_EDGE_FUNCTIONS', true);
location.reload();
```

**Désactiver si problème:**
```javascript
featureFlags.set('USE_EDGE_FUNCTIONS', false);
location.reload();
```

### Pour les Utilisateurs Finaux

**Aucun changement visible:**
- Application fonctionne normalement
- Pas de nouvelle interface
- Pas de nouvelle procédure

**Améliorations invisibles:**
- Validation plus stricte
- Sécurité renforcée
- Rate limiting (anti-spam)

---

## 📞 Support

### En cas de problème

1. **Rollback immédiat** (voir section Urgence)
2. **Vérifier console** navigateur (F12)
3. **Consulter logs** Supabase Dashboard
4. **Lire documentation** `REFACTORING_FINAL_REPORT.md`

### Contacts

- **Documentation technique:** `REFACTORING_FINAL_REPORT.md`
- **Ce guide:** `DEPLOYMENT_INSTRUCTIONS.md`
- **Tests:** `npm test`

---

## ✅ Résumé

**Déploiement Airport Manager Refactorisé:**

1. ✅ Build local OK
2. ✅ Tests passent (38/38)
3. ✅ Déployer dist/
4. ✅ Vérifier fonctionnement de base
5. ✅ Feature flags désactivés (safe)
6. ⏳ Activer Edge Functions progressivement
7. ✅ Rollback disponible 24/7

**Prêt pour production!** 🚀

---

**Version:** 1.0
**Dernière mise à jour:** 2026-02-09
