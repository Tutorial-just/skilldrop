# Cleanup changes: homepage / expert / help

Сделано аккуратно по запросу:

1. Homepage
   - Убран блок поиска `Describe your problem` из hero.
   - Убран блок `CategoriesSection` с homepage.
   - Убран блок `TrustSection` с homepage.
   - Остались понятные CTA: `Find help now` и `Become a helper`.

2. Header / footer
   - В верхнем меню убраны `Describe problem`, `Categories`, `Trust`.
   - Вместо них добавлен `Help`.
   - В footer убрана ссылка `Categories` из Product.
   - `Trust Center` заменён на `Help Center`.

3. Expert public page
   - Убран текст `Describe your problem and desired result`.
   - Вместо этого добавлен нейтральный блок `Add a short preparation note`.
   - Убраны category badges из service cards на странице эксперта.
   - Ссылки на `/trust` заменены на `/help`.
   - `How trust works` заменено на `How to use SkillDrop`.

4. Experts search page
   - `Describe your problem` заменено на `Search helpers` / `Search by topic`.
   - `Trust signals` заменено на `Helpful booking info`.

5. Trust route
   - `/trust` теперь перенаправляет на `/help`, чтобы публично не было отдельного Trust Center.

Важно: `Describe problem` оставлен внутри buyer dashboard, потому что там это основная правильная логика для buyer.
