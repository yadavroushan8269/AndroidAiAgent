plugins {
    id("com.android.application")
}

android {
    namespace = "com.roushan.aiaagent"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.roushan.aiaagent"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

kotlin {
    jvmToolchain(17)
}
