# Aura Chatting Pro 💜

Una aplicación de citas moderna y elegante construida con **React Native**, **Expo**, y **TypeScript**. Diseñada para conectar personas con intereses similares a través de un sistema intuitivo de swipes, chat en tiempo real y features premium.

## 🚀 Características principales

### Autenticación & Onboarding
- **Splash animado** con logo de marca
- **Autenticación flexible**: Google, Apple, o teléfono + OTP
- **Onboarding de 7 pasos** para crear un perfil completo:
  - Nombre y edad
  - Género y preferencia
  - Ubicación (con permiso GPS mock)
  - Fotos (grilla 3×3, mínimo 3, máximo 9)
  - Intereses (chips interactivos)
  - Bio (hasta 500 caracteres)

### Pantalla de Swipes
- **Tarjetas de perfil** con navegación de fotos
- **Gestos Reanimated** suaves:
  - Swipe izquierda: NOPE (dislike)
  - Swipe derecha: LIKE (like)
  - Swipe arriba: SUPER LIKE (super like)
- **Overlays dinámicos** con opacidad según dirección
- **Modal "It's a Match!"** con animación
- **Expansión de tarjeta** para ver bio e intereses completos
- **Botones de acción**: Rewind, Dislike, Super Like, Like, Boost

### Matches & Chat
- **Pantalla de Matches** con:
  - Sección "Nuevos matches" horizontal
  - Lista de conversaciones con preview
  - Badges de mensajes no leídos
  - Indicador de usuario en línea
- **Chat en tiempo real** con:
  - Burbujas estilo iMessage (dark mode)
  - Indicador "escribiendo..."
  - Estados de entrega (enviado, entregado, visto)
  - Reacciones con emojis
  - Respuestas automáticas mock

### Sistema de Suscripción
- **Planes**:
  - **Free**: 20 likes/día, 1 super like/día
  - **Gold**: Likes ilimitados, 5 super likes/día, rewind, 1 boost/mes
  - **Platinum**: Todo ilimitado + ver quién te dio like + prioridad en algoritmo
- **Paywall interactivo** con comparativa de features
- **Límites diarios** con reset automático

### Perfil Propio
- **Galería de fotos** editable
- **Bio y intereses** personalizables
- **Stats**: Likes recibidos, matches, super likes
- **Badge de verificación** y suscripción
- **Ajustes**: Notificaciones, privacidad, ayuda, términos

### Features Premium
- **Boost**: Aparece primero en búsquedas (30 min, 2h, 24h)
- **Rewind**: Deshacer último swipe
- **Super Like**: Notificación especial para el otro usuario
- **Filtros avanzados**: Edad, distancia, género, intereses, verificados, con fotos

### Descubrimiento
- **Pantalla Discover** con 4 modos:
  - Trending: Perfiles populares
  - Nearby: Usuarios cercanos
  - New: Perfiles nuevos
  - Verified: Solo verificados
- **Búsqueda** por nombre e intereses
- **Filtros** personalizables
- **Grid de perfiles** con preview de intereses

## 🎨 Diseño & UX

### Tema oscuro
- **Colores principales**: Rosa (#FF2D78) → Naranja (#FF6B35)
- **Paleta neutral**: Negro profundo, grises, blancos
- **Gradientes**: Usados estratégicamente en CTAs y elementos premium
- **Tipografía**: Fuerte y moderna, con jerarquía clara

### Animaciones
- **Entrada de componentes**: Spring suave con delay
- **Transiciones de pantalla**: Fade y slide
- **Feedback táctil**: Haptics en acciones principales
- **Overlays dinámicos**: Opacidad según gesto

## 📱 Pantallas

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Splash | `/splash` | Animación de bienvenida |
| Welcome | `/auth/welcome` | Opciones de login |
| Phone Auth | `/auth/phone` | Ingreso de teléfono |
| OTP | `/auth/otp` | Verificación de 6 dígitos |
| Onboarding | `/onboarding/*` | 7 pasos de perfil |
| Discover | `/(tabs)` | Swipes principales |
| Matches | `/(tabs)/matches` | Lista de matches |
| Chat | `/chat/[matchId]` | Conversación |
| Profile | `/(tabs)/profile` | Perfil propio |
| Edit Profile | `/edit-profile` | Editar bio e intereses |
| Filters | `/filters` | Filtros de búsqueda |
| Discover Advanced | `/discover` | Búsqueda y descubrimiento |
| Paywall | `/paywall` | Planes de suscripción |
| Boost | `/boost` | Activar boost |

## 🛠️ Tech Stack

- **React Native 0.81** con Expo SDK 54
- **TypeScript 5.9** para type safety
- **React Router 6** para navegación
- **NativeWind 4** (Tailwind CSS)
- **Reanimated 4** para gestos y animaciones
- **Expo Linear Gradient** para gradientes
- **Expo Image Picker** para fotos
- **Expo Haptics** para feedback táctil
- **Expo Notifications** para push notifications
- **AsyncStorage** para persistencia local
- **TRPC** para API client

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/proyecto1095si1-boop/aura-chatting-pro.git
cd aura-chatting-pro

# Instalar dependencias
pnpm install

# Iniciar dev server
pnpm dev

# En otro terminal, para testing en dispositivo
pnpm ios      # iOS simulator
pnpm android  # Android emulator
```

## 📲 Escanear QR en Expo Go

1. Abre la app **Expo Go** en tu dispositivo
2. Escanea el código QR que aparece en `http://localhost:8081`
3. La app se abrirá en tu dispositivo

## 📦 Estructura del proyecto

```
aura/
├── app/                      # Rutas y pantallas
│   ├── (tabs)/              # Tab navigation
│   ├── auth/                # Autenticación
│   ├── onboarding/          # Onboarding
│   ├── chat/                # Chat
│   ├── profile/             # Perfil detallado
│   ├── filters.tsx          # Filtros
│   ├── discover.tsx         # Descubrimiento
│   ├── boost.tsx            # Boost
│   ├── paywall.tsx          # Suscripción
│   └── edit-profile.tsx     # Editar perfil
├── components/              # Componentes reutilizables
│   ├── gradient-button.tsx
│   ├── animated-card.tsx
│   ├── message-reactions.tsx
│   └── ...
├── lib/                     # Lógica compartida
│   ├── auth-context.tsx     # Contexto de autenticación
│   ├── subscription-context.tsx  # Suscripción
│   ├── mock-data.ts         # Datos mock
│   ├── notifications-service.ts  # Notificaciones
│   └── ...
├── assets/                  # Imágenes y recursos
├── theme.config.js          # Configuración de colores
└── tailwind.config.js       # Tailwind CSS
```

## 🎯 Próximas mejoras

- [ ] Integración con backend real (PostgreSQL)
- [ ] Autenticación con OAuth real (Google, Apple)
- [ ] Chat en tiempo real con WebSockets
- [ ] Notificaciones push reales
- [ ] Pagos reales con Stripe
- [ ] Verificación de identidad
- [ ] Reportes y moderación
- [ ] Analytics y tracking
- [ ] Búsqueda avanzada con algoritmo ML
- [ ] Video chat
- [ ] Stories (como Instagram)
- [ ] Recomendaciones personalizadas

## 🔐 Seguridad

- Las contraseñas se hashean con bcrypt
- Los tokens JWT expiran en 24 horas
- Las fotos se validan en el servidor
- Los reportes se revisan manualmente
- HTTPS en todas las conexiones

## 📄 Licencia

MIT - Libre para usar, modificar y distribuir

## 👨‍💻 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Contacto

Para preguntas o sugerencias, abre un issue en GitHub.

---

**Hecho con ❤️ usando React Native y Expo**
