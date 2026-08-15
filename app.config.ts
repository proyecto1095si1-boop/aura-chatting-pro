// Load environment variables with proper priority (system > .env)
// import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "com.aurachatting.pro";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Aura",
  appSlug: "aura",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663491558801/6j3FLLsXnrtbhwXswh8JaS/aura-icon-P4enAbMxvLDu3nNZ4ZKe4C.png",
  scheme: "com.aurachatting.pro",
  iosBundleId: bundleId,
  androidPackage: bundleId,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.6.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    versionCode: 34,
    googleServicesFile: "./google-services.json",
    permissions: ["POST_NOTIFICATIONS", "CAMERA", "RECORD_AUDIO", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  androidStatusBar: {
    hidden: true
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "react-native-iap",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          kotlinVersion: "2.0.0"
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        "androidAppId": "ca-app-pub-5481947169256130~6492050485",
        "iosAppId": "ca-app-pub-5481947169256130~6492050485"
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow Aura to access your photos to set up your profile.",
        "cameraPermission": "Allow Aura to access your camera for profile verification and sending photos in chat."
      }
    ],
    "expo-localization",
    [
      "@react-native-google-signin/google-signin",
      {
        "iosClientId": env.iosClientId,
        "iosUrlScheme": env.iosClientId ? `com.googleusercontent.apps.${env.iosClientId}` : undefined,
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "cdea5f27-5805-4908-830a-4bc8967424fe"
    },
    "react-native-google-mobile-ads": {
      "android_app_id": "ca-app-pub-5481947169256130~6492050485",
      "ios_app_id": "ca-app-pub-5481947169256130~6492050485"
    }
  }
};

export default config;
