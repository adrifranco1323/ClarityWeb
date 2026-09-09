package com.claritysolutions.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PendingApprovalScreen(viewModel: VisitViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.HourglassEmpty,
            contentDescription = null,
            modifier = Modifier.size(100.dp),
            tint = Color.Gray
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Acceso Pendiente",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Tu cuenta ha sido registrada con éxito. Por favor, espera a que un administrador apruebe tu acceso para poder utilizar la aplicación.",
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = { viewModel.logout() }) {
            Text("Cerrar Sesión")
        }
    }
}
