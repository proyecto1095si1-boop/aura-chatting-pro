# Aura - TODO

## Branding & Setup
- [x] Generar logo de la app (gradiente rosa-naranja)
- [x] Configurar tema oscuro en theme.config.js
- [x] Actualizar app.config.ts con nombre y branding

## Navegación y Estructura
- [x] Configurar navegación principal (tabs + stack)
- [x] Configurar rutas de autenticación vs app principal
- [x] Configurar GestureHandlerRootView en root layout

## Autenticación & Onboarding
- [x] SplashScreen con logo animado
- [x] WelcomeScreen con botones de login social
- [x] PhoneAuthScreen con selector de código de país
- [x] OTPScreen con 6 dígitos y auto-focus
- [x] OnboardingNameScreen
- [x] OnboardingBirthScreen con validación 18+
- [x] OnboardingGenderScreen con selector de preferencia
- [x] OnboardingLocationScreen con permiso GPS
- [x] OnboardingPhotosScreen con grilla (3 min, 9 max)
- [x] OnboardingInterestsScreen con chips (5 min)
- [x] OnboardingBioScreen (500 chars)
- [x] Persistencia del estado de onboarding con AsyncStorage

## Pantalla Principal - Swipes
- [x] DiscoverScreen con stack de tarjetas
- [x] Tarjeta de perfil (85% altura, bordes 32px)
- [x] Navegación de fotos tipo Stories (tap izq/der)
- [x] Swipe izquierda (dislike) con animación
- [x] Swipe derecha (like) con overlay verde
- [x] Swipe arriba (super like) con overlay azul
- [x] Expansión de tarjeta hacia arriba (bio + intereses)
- [x] Botones de acción inferiores (dislike, super like, like)
- [x] Botones premium (rewind, boost)
- [x] Lógica de match (verificar like mutuo)
- [x] MatchOverlay animado "It's a Match!"

## Matches & Chat
- [x] MatchesScreen con grid de matches
- [x] Fila horizontal de "New Matches"
- [x] ChatListScreen con lista de conversaciones
- [x] ChatDetailScreen con burbujas estilo iMessage dark
- [x] Indicador "Escribiendo..."
- [x] Estado "Visto"
- [ ] Envío de fotos en chat (pendiente)
- [x] Botón reportar/bloquear en chat

## Sistema de Suscripción
- [x] Hook useSubscriptionStatus
- [x] Límites diarios por plan (Free: 20 likes, Gold: ilimitado, Platinum: ilimitado)
- [x] PaywallScreen con planes (Free, Gold, Platinum)
- [x] Funciones premium: Rewind, Boost, Super Likes ilimitados
- [x] Contador de likes con reset cada 24h

## Perfil Propio
- [x] ProfileScreen con fotos y datos
- [ ] Edición de perfil (nombre, bio, intereses) - pendiente
- [ ] Ajustes de filtros (edad, distancia, género) - pendiente
- [x] Badge de verificación
- [x] Badge de suscripción premium

## Datos Mock
- [x] Perfiles de ejemplo para swipes (6 perfiles)
- [x] Conversaciones de ejemplo (2 chats con mensajes)
- [x] Matches de ejemplo (4 matches, 2 nuevos)
