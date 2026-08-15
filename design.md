# Aura — Dating App: Design Document

## Brand Identity
- **App Name:** Aura
- **Tagline:** "Conecta con tu aura"
- **Visual Language:** Dark, vibrant, premium — like a high-end nightclub meets a modern social app
- **Primary Gradient:** Rosa neón (#FF2D78) → Naranja brillante (#FF6B35)
- **Background:** #0A0A0A (near-black)
- **Surface:** #161616 (dark card)
- **Surface Elevated:** #1E1E1E
- **Foreground:** #FFFFFF
- **Muted:** #8A8A8A
- **Border:** #2A2A2A
- **Accent Blue (Super Like):** #4FC3F7
- **Accent Green (Like):** #4CAF50
- **Font:** Inter (system fallback: SF Pro / Roboto)
- **Border Radius:** 32px for cards, 16px for inputs, 24px for buttons

---

## Screen List

### Auth & Onboarding
1. **SplashScreen** — Animated logo with gradient, brand name
2. **WelcomeScreen** — Login options (Google, Apple, Phone)
3. **PhoneAuthScreen** — Phone number input with country code
4. **OTPScreen** — 6-digit OTP input with auto-focus
5. **OnboardingNameScreen** — First name input
6. **OnboardingBirthScreen** — Date of birth picker (18+ validation)
7. **OnboardingGenderScreen** — Gender selector + preference (looking for)
8. **OnboardingLocationScreen** — GPS permission + origin city
9. **OnboardingPhotosScreen** — Photo grid (3 min, 9 max)
10. **OnboardingInterestsScreen** — Tag/chip selector (5 min)
11. **OnboardingBioScreen** — Free text bio (500 chars)
12. **OnboardingVerifyScreen** — Optional selfie verification

### Main App (Tab Navigation)
13. **DiscoverScreen** (Home Tab) — Swipe card stack
14. **MatchesScreen** (Matches Tab) — List of mutual matches + recent activity
15. **ChatListScreen** (Messages Tab) — Conversation list
16. **ChatDetailScreen** — Individual chat with real-time messages
17. **ProfileScreen** (Profile Tab) — Own profile view/edit

### Overlays & Modals
18. **MatchOverlay** — "It's a Match!" animated overlay
19. **PaywallScreen** — Subscription plans modal
20. **FilterModal** — Age range, distance, gender filters
21. **ProfileDetailModal** — Expanded profile view when swiping up
22. **ReportModal** — Report/block user form

---

## Primary Content and Functionality

### DiscoverScreen (Core)
- Full-screen card stack (85% height) with profile photo
- Tap left/right edges to cycle through profile photos (Stories-style)
- Swipe up to expand: bio + interests chips
- Bottom action buttons: Rewind (premium), Dislike, Super Like, Like, Boost (premium)
- Distance badge, verification badge, name + age
- Gradient overlay at bottom of card for text readability

### MatchesScreen
- Grid of matched profiles with last message preview
- "New Matches" horizontal scroll row at top
- Unread indicator badges

### ChatDetailScreen
- Dark bubble UI (sent: gradient, received: dark surface)
- "Typing..." indicator
- "Seen" status
- Photo sharing button
- Report/block in header menu

### ProfileScreen
- Own photos in grid
- Edit profile sections
- Subscription status badge
- Settings access

---

## Key User Flows

### Auth Flow
1. SplashScreen (2s) → WelcomeScreen
2. Tap "Google" → OAuth → if new user → Onboarding flow
3. Tap "Phone" → PhoneAuthScreen → OTPScreen → if new user → Onboarding flow
4. Returning user → DiscoverScreen directly

### Onboarding Flow
1. Name → Birth Date → Gender/Preference → Location → Photos (3+) → Interests (5+) → Bio → (Optional Verify) → DiscoverScreen

### Swipe & Match Flow
1. DiscoverScreen: swipe right/up → check subscription limits → if match → MatchOverlay → option to send message → ChatDetailScreen

### Subscription Flow
1. Hit daily like limit → PaywallScreen appears → select plan → (mock) payment → limits reset

---

## Color Choices (Specific to Aura)

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0A0A0A` | All screen backgrounds |
| `surface` | `#161616` | Cards, bottom sheets |
| `surfaceElevated` | `#1E1E1E` | Modals, elevated cards |
| `foreground` | `#FFFFFF` | Primary text |
| `muted` | `#8A8A8A` | Secondary text, placeholders |
| `border` | `#2A2A2A` | Dividers, input borders |
| `gradientStart` | `#FF2D78` | Gradient start (neon pink) |
| `gradientEnd` | `#FF6B35` | Gradient end (bright orange) |
| `accentBlue` | `#4FC3F7` | Super Like |
| `accentGreen` | `#4CAF50` | Like confirmation |
| `gold` | `#FFD700` | Premium badge |
| `verified` | `#4FC3F7` | Verified badge |
