package com.claritysolutions.app.ui.theme

import androidx.compose.ui.graphics.Color
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = ClarityWhite,
    secondary = ClarityGray,
    tertiary = ClarityLightGray,
    background = ClarityBlack,
    surface = ClarityBlack,
    onPrimary = ClarityBlack,
    onSecondary = ClarityWhite,
    onBackground = ClarityWhite,
    onSurface = ClarityWhite
)

private val LightColorScheme = lightColorScheme(
    primary = ClarityBlack,
    secondary = ClarityGray,
    tertiary = ClarityLightGray,
    background = ClarityWhite,
    surface = ClarityWhite,
    onPrimary = ClarityWhite,
    onSecondary = ClarityWhite,
    onBackground = ClarityBlack,
    onSurface = ClarityBlack,
    error = ClarityError
)

@Composable
fun ClarityTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false, // Disabled for professional consistency
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}