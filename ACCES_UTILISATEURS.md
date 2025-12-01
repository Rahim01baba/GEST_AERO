# 🔐 Accès Utilisateurs - Airport Manager

## ✅ Problème résolu

Le problème de connexion était causé par une **récursion infinie dans la politique RLS** de la table `users`.

**Correction appliquée :**
- Migration `fix_users_rls_infinite_recursion.sql`
- Fonction `is_user_admin()` créée pour éviter la récursion
- Politiques RLS optimisées

---

## 👤 Comptes Disponibles

### 1. Administrateur Principal
```
Email    : admin@airport.com
Password : Baba1234
Rôle     : ADMIN
Accès    : Total (tous aéroports, toutes fonctionnalités)
```

### 2. Direction Centrale (DED-C)
```
Email    : dedc@airport.com
Password : dedc123
Rôle     : ADMIN (DED-C)
Accès    : Gestion centrale, configuration aéroports
```

### 3. ATS Bouaké
```
Email    : atsbyk@airport.com
Password : ats123
Rôle     : ATS
Aéroport : Bouaké (DIBK)
Accès    : Mouvements aéronefs
```

### 4. ATS San Pedro
```
Email    : atsspy@airport.com
Password : ats123
Rôle     : ATS
Aéroport : San Pedro (DISP)
Accès    : Mouvements aéronefs
```

### 5. ATS Korhogo
```
Email    : atshgo@airport.com
Password : ats123
Rôle     : ATS
Aéroport : Korhogo (DIKO)
Accès    : Mouvements aéronefs
```

### 6. AIM Bouaké
```
Email    : aimbyk@airport.com
Password : aim123
Rôle     : AIM
Aéroport : Bouaké (DIBK)
Accès    : Gestion registre aéronefs
```

### 7. AIM San Pedro
```
Email    : aimspy@airport.com
Password : aim123
Rôle     : AIM
Aéroport : San Pedro (DISP)
Accès    : Gestion registre aéronefs
```

### 8. OPS (Operations)
```
Email    : ops@airport.com
Password : ops123
Rôle     : OPS
Aéroport : Bouaké (DIBK)
Accès    : Gestion parkings, stands
```

### 9. Finance
```
Email    : fin@airport.com
Password : fin123
Rôle     : FIN
Aéroport : Bouaké (DIBK)
Accès    : Facturation
```

---

## 🔑 Droits par Rôle

| Rôle | Dashboard | Movements | Parking | Billing | Aircraft | Airports | Users | Audit |
|------|-----------|-----------|---------|---------|----------|----------|-------|-------|
| **ADMIN** | ✅ Tous | ✅ Tous | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DED-C** | ✅ Tous | ✅ Lecture | ✅ Lecture | ✅ Lecture | ✅ Lecture | ✅ | ❌ | ✅ |
| **ATS** | ✅ Son aéroport | ✅ Écriture | ✅ Lecture | ❌ | ✅ Lecture | ❌ | ❌ | ✅ |
| **OPS** | ✅ Son aéroport | ✅ Lecture | ✅ Écriture | ❌ | ✅ Lecture | ❌ | ❌ | ✅ |
| **AIM** | ✅ Son aéroport | ✅ Lecture | ✅ Lecture | ❌ | ✅ Écriture | ❌ | ❌ | ✅ |
| **FIN** | ✅ Son aéroport | ✅ Lecture | ✅ Lecture | ✅ Écriture | ✅ Lecture | ❌ | ❌ | ✅ |

---

## 🚀 Comment se connecter

1. Ouvrir l'application : `https://votre-app.netlify.app/login`
2. Entrer l'email et le mot de passe
3. Cliquer sur **"Sign In"**

---

## 🔧 Réinitialiser un mot de passe

**Via l'interface admin :**
1. Se connecter en tant qu'ADMIN
2. Aller dans **Users**
3. Sélectionner l'utilisateur
4. Cliquer sur "Reset Password"

**Via script (nécessite accès serveur) :**
```bash
node reset-password.js user@email.com nouveaumotdepasse
```

---

## ⚠️ Sécurité

**Mots de passe par défaut :**
- Ces mots de passe sont des exemples pour le développement
- **IMPORTANT** : Changez tous les mots de passe en production !

**Recommandations :**
- Utiliser des mots de passe forts (12+ caractères)
- Activer l'authentification à deux facteurs (si disponible)
- Changer les mots de passe régulièrement
- Ne pas partager les comptes

---

## 📝 Créer un nouvel utilisateur

**Via l'interface admin :**
1. Se connecter en tant qu'ADMIN
2. Aller dans **Users**
3. Cliquer sur **"+ Add User"**
4. Remplir le formulaire
5. Sauvegarder

**Via script :**
```bash
node setup-users.js
```

---

## 🐛 Problèmes fréquents

### "Invalid login credentials"
- Vérifier l'email (pas d'espace, minuscules)
- Vérifier le mot de passe (sensible à la casse)
- Essayer de copier-coller depuis ce document

### "Infinite recursion detected"
- ✅ **Corrigé** par la migration `fix_users_rls_infinite_recursion`
- Les politiques RLS ont été optimisées

### Compte verrouillé
- Attendre 5 minutes ou contacter l'administrateur

### Accès refusé à une page
- Vérifier les droits de votre rôle dans le tableau ci-dessus
- Seuls les ADMIN ont accès à tous les modules

---

## ✅ Tests de connexion

Vous pouvez tester avec n'importe quel compte :

**Test rapide ADMIN :**
```
Email    : admin@airport.com
Password : Baba1234
```

Vous devriez voir le **Dashboard** avec tous les menus disponibles.

---

## 📞 Support

En cas de problème persistant :
1. Vérifier la console du navigateur (F12)
2. Noter le message d'erreur exact
3. Vérifier que le serveur Supabase est accessible
4. Contacter l'administrateur système

---

**Dernière mise à jour :** 2025-11-14
**Status :** ✅ Tous les accès fonctionnels
