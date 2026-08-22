-- Parte B: evita gastos recurrentes duplicados por condición de carrera
-- Corre esto en el SQL Editor de Supabase.
--
-- La auto-generación de gastos recurrentes (services/recurring.js) hace
-- "verifica que no exista todavía -> si no existe, créalo". Eso es seguro
-- para un solo llamado, pero si dos llamados corren casi al mismo tiempo
-- (ej. React StrictMode invocando el efecto de carga dos veces en
-- desarrollo, o el usuario con dos pestañas abiertas), ambos pueden ver
-- "no existe todavía" y ambos insertar, duplicando el gasto.
--
-- Este índice único parcial es la protección real: solo aplica a filas
-- con template_id (los gastos manuales normales, con template_id NULL,
-- no se ven afectados en absoluto), y hace que Postgres rechace el
-- segundo insert duplicado con un error de unique_violation en vez de
-- crearlo. El código ya está listo para capturar ese error y ignorarlo.

CREATE UNIQUE INDEX IF NOT EXISTS expenses_unique_template_per_period
  ON expenses (template_id, period_id)
  WHERE template_id IS NOT NULL;
