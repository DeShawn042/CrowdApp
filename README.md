# Prescout

> **Know before you go.**

Prescout is a community-powered mobile app that shows real-time crowd levels, wait times, and vibes at any location before you visit. Built for iOS and Android by Rooks Technologies LLC.

---

## Features

- **Real-time crowd reports** — community-submitted reports with 60-minute expiry so data stays fresh
- **Busy Times chart** — historical typical data alongside Google Live data in a responsive bar chart
- **Quick Reports** — category-specific fields (restaurants, bars, gyms, medical, entertainment, airports) for fast, targeted reports
- **Heading There** — pin a destination to your home screen with a live countdown, and report the crowd the moment you arrive
- **Watchlist** — add locations and get push notifications when they hit your preferred crowd level
- **Notification actions** — submit a quick crowd report directly from the notification without opening the app
- **Deep link notifications** — tapping a notification takes you directly to the location detail page
- **Search & discovery** — search bar with category tiles (Restaurants, Bars & Nightlife, Gyms, Shopping, and more), prioritizing open locations
- **Maps app picker** — choose your preferred maps app (Apple Maps, Google Maps, Waze) with AsyncStorage preference saving
- **Trending** — top reviewed locations surfaced on the home screen
- **Favorites** — save locations for quick access
- **Prescout Reviews** — in-app reviews with star ratings and photos
- **Google Reviews integration** — falls back to Google Reviews when no in-app reviews exist
- **Last updated indicator** — shows how many minutes ago the last crowd report was submitted
- **Verified Visit badge** — rewards users who report from a location
- **Your Contributions stats** — crowd reports, quick reports, reviews, watchlist uses, and Heading There count
- **Apple Sign-In** — sign in with Apple (required for App Store)
- **Google Sign-In** — sign in with Google
- **Biometric authentication** — Face ID, Touch ID, or fingerprint login after initial sign-in
- **Session persistence** — users stay logged in between app sessions
- **Dark / Light / System theme** — toggled from the profile screen
- **Pull-to-refresh** — on Home, Search, and Location Detail screens
- **Auto-refresh** — app refreshes location and data every 5 minutes while active
- **Anti-abuse protections** — one review per location per 2 months, 24-hour account age requirement, daily review cap, report deduplication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 56 |
| Language | TypeScript |
| Backend | Supabase (auth, database, storage) |
| Places data | Google Places API (New) |
| Notifications | Expo Notifications + geofencing |
| Navigation | Expo Router |
| Auth | Supabase Auth + Apple Sign-In + Google Sign-In + expo-local-authentication |
| Build & Deploy | EAS Build + EAS Submit |

---

## Database Tables

- `location_reports` — crowd reports with 60-min expiry
- `active_destinations` — Heading There destinations with 4-hour expiry and live countdown
- `watchlist` — watched locations with 24-hour expiry
- `reviews` — Prescout reviews with photos
- `review_photos` — photos attached to reviews
- `user_favorites` — saved favorite locations
- `business_claims` — business owner claim requests
- `business_owner_info` — verified business owner profiles
- `review_responses` — business owner responses to reviews
- `user_report_flags` — flagged reports for moderation

All tables have Row Level Security (RLS) enabled.

---

## Project Structure

```
CrowdApp/
├── app/                  # Expo Router screens
├── components/           # Reusable UI components
├── lib/                  # Supabase client, helpers
├── assets/               # Images, fonts, icons
├── constants/            # Theme colors, config
└── hooks/                # Custom React hooks
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- EAS CLI (`npm install -g eas-cli`)
- Supabase project
- Google Cloud project with Places API (New) enabled

### Installation

```bash
git clone https://github.com/DeShawn042/CrowdApp.git
cd CrowdApp
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### Run the app

```bash
npx expo start
```

### Build with EAS

```bash
# Preview build (for testing)
eas build --platform all --profile preview

# Production build (for store submission)
eas build --platform all --profile production
```

### Submit to stores

```bash
eas submit --platform all
```

---

## Platforms

- iOS (iPhone) — App Store
- Android — Google Play
- Web (development/testing only)

---

## Business

**Company:** Rooks Technologies LLC (Maryland, USA)  
**EIN:** Obtained  
**Developer Accounts:** Apple Developer Program + Google Play Console  
**Backend:** Supabase (all tables RLS-enabled)  
**Domain:** prescout.app  
**Website:** [prescout.app](https://prescout.app)  
**Privacy Policy:** [prescout.app/privacy.html](https://prescout.app/privacy.html)  
**Terms of Service:** [prescout.app/terms.html](https://prescout.app/terms.html)

---

## Status

Pre-launch — App Store and Google Play submission in progress.

---

## Contact

- Email: [hello@prescout.app](mailto:hello@prescout.app)
- Privacy: [privacy@prescout.app](mailto:privacy@prescout.app)
- Website: [prescout.app](https://prescout.app)

