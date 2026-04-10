import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * EAS sets `EAS_BUILD_PROFILE` during `eas build` (e.g. `production` for your APK).
 * Local `expo run:android` + `expo start` omit it → `.dev` package so the debug app can sit beside the EAS APK.
 */
const PRODUCTION_EAS_PROFILE = "production";

const ANDROID_PACKAGE_PROD = "com.rostise.mymemory";
const ANDROID_PACKAGE_DEV = "com.rostise.mymemory.dev";

const IOS_BUNDLE_PROD = "com.rostise.mymemory";
const IOS_BUNDLE_DEV = "com.rostise.mymemory.dev";

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.EAS_BUILD_PROFILE === PRODUCTION_EAS_PROFILE;

  return {
    ...config,
    name: isProduction ? "mymemory" : "mymemory (Dev)",
    slug: "mymemory",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isProduction ? "mymemory" : "mymemory-dev",
    userInterfaceStyle: "automatic",
    ios: {
      ...config.ios,
      icon: "./assets/expo.icon",
      bundleIdentifier: isProduction ? IOS_BUNDLE_PROD : IOS_BUNDLE_DEV,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        backgroundColor: "#F5F7FA",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      package: isProduction ? ANDROID_PACKAGE_PROD : ANDROID_PACKAGE_DEV,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#F5F7FA",
          android: {
            image: "./assets/images/splash-logo-light.png",
            imageWidth: 120,
          },
          dark: {
            backgroundColor: "#172945",
            image: "./assets/images/splash-logo-dark.png",
          },
        },
      ],
      "expo-secure-store",
      "./plugins/withAndroidShareQuick",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...config.extra,
      router: {},
      eas: {
        projectId: "02f6cd82-447d-4e65-b069-2e073aaa567f",
      },
    },
  };
};
