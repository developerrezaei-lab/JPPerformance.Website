param([switch]$Install)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    # SDK و JDK محلی شناسایی می‌شوند؛ هیچ مسیری وارد Git نمی‌شود.
    if (-not $env:JAVA_HOME) {
        $jpStudioJdk = 'C:\Program Files\Android\Android Studio\jbr'
        if (Test-Path (Join-Path $jpStudioJdk 'bin\java.exe')) { $env:JAVA_HOME = $jpStudioJdk }
    }
    if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
        $jpSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
        if (Test-Path $jpSdk) { $env:ANDROID_HOME = $jpSdk }
    }
    $jpTask = if ($Install) { ':app:installDebug' } else { ':app:assembleDebug' }
    & .\gradlew.bat --no-daemon $jpTask
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed. See the Gradle error above.' }
    if (-not $Install) { Write-Host "APK: $PSScriptRoot\app\build\outputs\apk\debug\app-debug.apk" }
} finally { Pop-Location }
