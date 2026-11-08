plugins { id("com.android.application") }
android {
    namespace = "uk.co.jpperformance.fit"
    compileSdk = 36
    defaultConfig {
        applicationId = "uk.co.jpperformance.fit"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
    buildTypes { getByName("release") { isMinifyEnabled = false } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
