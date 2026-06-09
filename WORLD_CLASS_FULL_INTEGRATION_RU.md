# SkillDrop — full marketplace upgrade intégré

Intégration ajoutée dans ce ZIP sans supprimer les catégories existantes.

## 1. Buyer dashboard redesign
- Dashboard orienté problème: description du besoin, appels à venir, demandes actives, experts recommandés, reviews et action plans.
- Ajout d'un compteur visible pour les outcomes/action plans.
- Ajout du raccourci `/buyer/outcomes`.

## 2. Problem request flow
- Flow `/help-me` conservé et renforcé autour du brief: situation, objectif, déjà essayé, langue, budget, urgence.
- Les demandes redirigent vers `/experts` avec `requestId` pour matcher les helpers.

## 3. Expert visibility checklist
- Expert dashboard fonctionne comme cockpit: profile, offers, availability, payouts, trust.
- L'expert voit pourquoi il est bookable ou non.

## 4. Outcome page after call
- Page buyer: `/buyer/bookings/[id]/outcome`.
- Index buyer outcomes: `/buyer/outcomes`.
- Expert outcome creation déjà relié à `/expert/outcomes` et `/expert/bookings/[id]/outcome`.

## 5. Better expert cards
- Cards experts orientées match: service recommandé, raisons du match, langue, disponibilité, taux de problème résolu, prix total.

## 6. Admin launch dashboard
- `/admin/launch` affiche maintenant aussi les alertes opérationnelles:
  - pending payments,
  - open disputes,
  - completed calls without outcomes,
  - approved experts without availability,
  - payout-ready experts.

## 7. Email reminders
- Ajout de `/api/cron/send-call-reminders`.
- Envoie des rappels email + notifications in-app environ 60 min et 10 min avant un call confirmé.
- Anti-duplication via `ProductEvent` (`CALL_REMINDER_SENT`).
- `vercel.json` contient maintenant le cron toutes les 5 minutes.

## 8. Follow-up booking
- Les outcomes visibles côté buyer affichent un bloc follow-up recommandé avec lien vers le profil expert.

## 9. Better reviews
- Le modèle Review contient déjà rating, helpfulness, clarity, professionalism, wouldRecommend, problemSolved.
- Les cards expert utilisent ces signaux pour le quality score et le problem solved rate.

## 10. Dispute/refund UX
- Buyer/expert booking pages ont déjà report/dispute UX via `ReportBookingForm`.
- Admin launch dashboard affiche les disputes ouvertes.
- Emails admin dispute déjà reliés à `sendDisputeCreatedEmail`.

## Notes de build
- Le ZIP ne contient pas `.env`, `.env.local`, `.next` ou `node_modules`.
- Après extraction: `npm install`, `npm run db:generate`, `npm run typecheck`, `npm run build`.
