package com.claritysolutions.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claritysolutions.app.model.Visit
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun VisitsListScreen(viewModel: VisitViewModel, onVisitClick: (Visit) -> Unit) {
    val visits by viewModel.allVisits.collectAsState()
    val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Historial de Visitas",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp),
            color = MaterialTheme.colorScheme.primary
        )

        if (visits.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                itemsIndexed(visits) { index, visit ->
                    AnimatedVisitItem(
                        visit = visit,
                        dateString = sdf.format(Date(visit.fecha)),
                        index = index,
                        onClick = onVisitClick
                    )
                }
            }
        }
    }
}

@Composable
fun AnimatedVisitItem(visit: Visit, dateString: String, index: Int, onClick: (Visit) -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(
            initialOffsetY = { 40 * (index + 1) },
            animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy)
        ) + fadeIn(animationSpec = tween(durationMillis = 300))
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.large)
                .clickable { onClick(visit) },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = visit.piscina,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = dateString,
                            color = MaterialTheme.colorScheme.secondary,
                            fontSize = 14.sp
                        )
                    }
                    Badge(
                        containerColor = if (visit.cloroInicial in 1.0..3.0) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                        contentColor = if (visit.cloroInicial in 1.0..3.0) Color(0xFF2E7D32) else Color(0xFFC62828)
                    ) {
                        Text("Cloro: ${visit.cloroInicial}", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = visit.operador,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "pH: ${visit.phInicial}",
                        color = MaterialTheme.colorScheme.secondary,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}
