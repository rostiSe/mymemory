/**
 * Tier B Android share: dedicated translucent ShareQuickActivity + SEND / SEND_MULTIPLE
 * (not on MainActivity). Registers native module `ShareQuick.finish()` for JS.
 *
 * @type {import("expo/config-plugins").ConfigPlugin}
 */
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/** Default SEND filters when MainActivity has none (e.g. clean prebuild). */
const DEFAULT_SHARE_INTENT_FILTERS = [
  {
    action: [{ $: { "android:name": "android.intent.action.SEND" } }],
    data: [
      { $: { "android:mimeType": "text/*" } },
      { $: { "android:mimeType": "image/*" } },
      { $: { "android:mimeType": "video/*" } },
    ],
    category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
  },
  {
    action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
    data: [
      { $: { "android:mimeType": "image/*" } },
      { $: { "android:mimeType": "video/*" } },
      { $: { "android:mimeType": "audio/*" } },
      { $: { "android:mimeType": "*/*" } },
    ],
    category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
  },
];

function getSendIntentFiltersToMove(mainActivity) {
  const filters = mainActivity["intent-filter"] ?? [];
  return filters.filter((f) => {
    const actions =
      f.action?.map((a) => a.$["android:name"]).filter(Boolean) ?? [];
    return actions.some(
      (name) =>
        name === "android.intent.action.SEND" ||
        name === "android.intent.action.SEND_MULTIPLE",
    );
  });
}

function stripSendIntentFiltersFromMainActivity(mainActivity) {
  const filters = mainActivity["intent-filter"];
  if (!filters?.length) return;
  mainActivity["intent-filter"] = filters.filter((f) => {
    const actions =
      f.action?.map((a) => a.$["android:name"]).filter(Boolean) ?? [];
    return !actions.some(
      (name) =>
        name === "android.intent.action.SEND" ||
        name === "android.intent.action.SEND_MULTIPLE",
    );
  });
}

function ensureShareQuickActivityInManifest(
  application,
  shareFilters,
  packageName,
) {
  const activities = application.activity ?? [];
  const relativeName = ".ShareQuickActivity";
  const exists = activities.some(
    (a) =>
      a.$["android:name"] === relativeName ||
      a.$["android:name"] === `${packageName}.ShareQuickActivity`,
  );
  if (exists) return;

  const newActivity = {
    $: {
      "android:name": relativeName,
      "android:exported": "true",
      "android:theme": "@style/Theme.ShareQuick.Translucent",
      "android:excludeFromRecents": "true",
      "android:noHistory": "true",
      "android:launchMode": "singleTop",
      "android:configChanges":
        "keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize",
      "android:windowSoftInputMode": "adjustResize",
    },
    "intent-filter": shareFilters,
  };
  application.activity = [...activities, newActivity];
}

function patchStylesXml(stylesPath) {
  let xml = fs.readFileSync(stylesPath, "utf8");
  if (xml.includes("Theme.ShareQuick.Translucent")) return;
  const insert = `
  <style name="Theme.ShareQuick.Translucent" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowIsTranslucent">true</item>
    <item name="android:windowBackground">@android:color/transparent</item>
    <item name="android:windowContentOverlay">@null</item>
    <item name="android:windowNoTitle">true</item>
    <item name="android:backgroundDimEnabled">false</item>
    <item name="android:windowDrawsSystemBarBackgrounds">true</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
  </style>`;
  xml = xml.replace("</resources>", `${insert}\n</resources>`);
  fs.writeFileSync(stylesPath, xml);
}

function writeKotlinSources(javaDir, packageName) {
  fs.mkdirSync(javaDir, { recursive: true });

  const shareQuickModuleKt = `package ${packageName}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareQuickModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ShareQuick"

  @ReactMethod
  fun finish() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread { activity.finish() }
  }
}
`;

  const shareQuickPackageKt = `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ShareQuickPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(ShareQuickModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

  const shareQuickActivityKt = `package ${packageName}

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import org.json.JSONArray

class ShareQuickActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.Theme_ShareQuick_Translucent)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "ShareQuickRoot"

  /**
   * [createReactActivityDelegate] runs from [ReactActivity]'s constructor, before [getIntent] is
   * non-null. Build launch options lazily in [DefaultReactActivityDelegate.getLaunchOptions].
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val activity = this
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled,
      ) {
        override fun getLaunchOptions(): Bundle =
          activity.buildShareLaunchOptionsFromIntent()
      },
    )
  }

  override fun invokeDefaultOnBackPressed() {
    finish()
  }

  private fun buildShareLaunchOptionsFromIntent(): Bundle {
    val intent = intent ?: return Bundle()
    return Bundle().apply {
      putString("shareMimeType", intent.type)
      putString("shareAction", intent.action)
      when (intent.action) {
        Intent.ACTION_SEND -> {
          intent.getStringExtra(Intent.EXTRA_TEXT)?.let { putString("shareText", it) }
          intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let { putString("shareSubject", it) }
          getSingleStreamUri(intent)?.let { putString("shareStreamUri", it.toString()) }
        }
        Intent.ACTION_SEND_MULTIPLE -> {
          val uris = getMultipleStreamUris(intent)
          if (uris.isNotEmpty()) {
            val arr = JSONArray()
            for (u in uris) {
              arr.put(u.toString())
            }
            putString("shareStreamUrisJson", arr.toString())
          }
          intent.getStringExtra(Intent.EXTRA_TEXT)?.let { putString("shareText", it) }
        }
      }
    }
  }

  private fun getSingleStreamUri(intent: Intent): Uri? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }
  }

  private fun getMultipleStreamUris(intent: Intent): List<Uri> {
    val list =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
      } else {
        @Suppress("DEPRECATION")
        intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM)
      }
    return list ?: emptyList()
  }
}
`;

  fs.writeFileSync(path.join(javaDir, "ShareQuickModule.kt"), shareQuickModuleKt);
  fs.writeFileSync(path.join(javaDir, "ShareQuickPackage.kt"), shareQuickPackageKt);
  fs.writeFileSync(path.join(javaDir, "ShareQuickActivity.kt"), shareQuickActivityKt);
}

function patchMainApplication(mainApplicationPath) {
  let src = fs.readFileSync(mainApplicationPath, "utf8");
  if (src.includes("ShareQuickPackage()")) return;
  const replacement = `PackageList(this).packages.apply {
          add(ShareQuickPackage())
        }`;
  const re =
    /PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\/\/\s*add\(MyReactNativePackage\(\)\)[\s\S]*?\}/m;
  if (!re.test(src)) {
    throw new Error(
      "[withAndroidShareQuick] MainApplication.kt PackageList block not found; prebuild template may have changed.",
    );
  }
  src = src.replace(re, replacement);
  fs.writeFileSync(mainApplicationPath, src);
}

function withAndroidShareQuick(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);

    const movedFilters = getSendIntentFiltersToMove(mainActivity);
    stripSendIntentFiltersFromMainActivity(mainActivity);

    const pkg = modConfig.android?.package;
    if (!pkg) {
      throw new Error("[withAndroidShareQuick] android.package is required");
    }

    const shareFilters =
      movedFilters.length > 0 ? movedFilters : DEFAULT_SHARE_INTENT_FILTERS;
    ensureShareQuickActivityInManifest(application, shareFilters, pkg);

    return modConfig;
  });

  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      if (modConfig.modRequest.introspect) {
        return modConfig;
      }
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const appRoot = modConfig.modRequest.projectRoot;
      const pkg = modConfig.android?.package;
      if (!pkg) {
        throw new Error("[withAndroidShareQuick] android.package is required");
      }

      const packagePath = pkg.replace(/\./g, "/");
      const javaDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
      );
      writeKotlinSources(javaDir, pkg);

      const stylesPath = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "res",
        "values",
        "styles.xml",
      );
      if (fs.existsSync(stylesPath)) {
        patchStylesXml(stylesPath);
      }

      const mainApplicationPath = AndroidConfig.Paths.getProjectFilePath(
        appRoot,
        "MainApplication",
      );
      if (fs.existsSync(mainApplicationPath)) {
        patchMainApplication(mainApplicationPath);
      }

      return modConfig;
    },
  ]);

  return config;
}

module.exports = withAndroidShareQuick;
