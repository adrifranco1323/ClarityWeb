package com.claritysolutions.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class PoolShape { RECTANGULAR, CIRCULAR, OVAL }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VolumeCalculatorScreen() {
    var shape by remember { mutableStateOf(PoolShape.RECTANGULAR) }
    var length by remember { mutableStateOf("") }
    var width by remember { mutableStateOf("") }
    var diameter by remember { mutableStateOf("") }
    var shallowDepth by remember { mutableStateOf("") }
    var midDepth by remember { mutableStateOf("") }
    var deepDepth by remember { mutableStateOf("") }

    val scrollState = rememberScrollState()

    val averageDepth = remember(shallowDepth, midDepth, deepDepth) {
        val s = shallowDepth.toDoubleOrNull() ?: 0.0
        val m = midDepth.toDoubleOrNull() ?: 0.0
        val d = deepDepth.toDoubleOrNull() ?: 0.0
        
        val depths = listOf(s, m, d).filter { it > 0.0 }
        if (depths.isEmpty()) 0.0 else depths.average()
    }

    val volume = remember(shape, length, width, diameter, averageDepth) {
        val avgD = averageDepth
        when (shape) {
            PoolShape.RECTANGULAR -> {
                val l = length.toDoubleOrNull() ?: 0.0
                val w = width.toDoubleOrNull() ?: 0.0
                l * w * avgD
            }
            PoolShape.CIRCULAR -> {
                val d = diameter.toDoubleOrNull() ?: 0.0
                val radius = d / 2.0
                Math.PI * radius * radius * avgD
            }
            PoolShape.OVAL -> {
                val l = length.toDoubleOrNull() ?: 0.0
                val w = width.toDoubleOrNull() ?: 0.0
                Math.PI * (l / 2.0) * (w / 2.0) * avgD
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(scrollState)
    ) {
        Text("Volume Calculator", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        Text("Pool Shape", fontWeight = FontWeight.Bold)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            PoolShape.entries.forEach { s ->
                FilterChip(
                    selected = shape == s,
                    onClick = { shape = s },
                    label = { Text(s.name.lowercase().replaceFirstChar { it.uppercase() }) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (shape == PoolShape.CIRCULAR) {
            PoolDecimalField(value = diameter, onValueChange = { diameter = it }, label = "Diameter (m)")
        } else {
            PoolDecimalField(value = length, onValueChange = { length = it }, label = "Length (m)")
            PoolDecimalField(value = width, onValueChange = { width = it }, label = "Width (m)")
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text("Depths (m)", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
        PoolDecimalField(value = shallowDepth, onValueChange = { shallowDepth = it }, label = "Shallow End")
        PoolDecimalField(value = midDepth, onValueChange = { midDepth = it }, label = "Middle")
        PoolDecimalField(value = deepDepth, onValueChange = { deepDepth = it }, label = "Deep End")

        Spacer(modifier = Modifier.height(32.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.Black)
        ) {
            Column(modifier = Modifier.padding(24.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                Text("TOTAL VOLUME", color = Color.Gray, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text("%.2f m³".format(volume), color = Color.White, fontSize = 48.sp, fontWeight = FontWeight.Bold)
                Text("%.0f Liters".format(volume * 1000), color = Color.LightGray, fontSize = 18.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Avg. Depth: %.2f m".format(averageDepth), color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}
