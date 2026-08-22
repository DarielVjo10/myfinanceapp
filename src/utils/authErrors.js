export function translateAuthError(error) {
  if (!error) return ''
  const msg = error.message || ''

  if (/invalid login credentials/i.test(msg)) {
    return 'Correo o contraseña incorrectos. Si te registraste con Google, usa "Continuar con Google" en vez de la contraseña.'
  }
  if (/already registered|already exists|user_repeated_signup/i.test(msg)) {
    return 'Ya existe una cuenta con este correo. Inicia sesión, o si te registraste con Google, usa "Continuar con Google".'
  }
  if (/email rate limit/i.test(msg)) {
    return 'Se alcanzó el límite de correos por ahora. Intenta de nuevo en unos minutos.'
  }
  if (/password should be at least/i.test(msg)) {
    return 'La contraseña es muy corta. Usa al menos 8 caracteres.'
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada (o spam).'
  }
  if (/unable to validate email address|invalid email/i.test(msg)) {
    return 'Ese correo no parece válido.'
  }
  if (/network|fetch/i.test(msg)) {
    return 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'
  }
  return msg
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}
