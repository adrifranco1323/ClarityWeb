package com.claritysolutions.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claritysolutions.app.model.Pool
import com.claritysolutions.app.model.UserRole

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoolDetailScreen(pool: Pool, onBack: () -> Unit, viewModel: VisitViewModel) {
    var showEditDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var currentPool by remember { mutableStateOf(pool) }
    val scrollState = rememberScrollState()
    val currentUser by viewModel.currentUser.collectAsState()
    val isAdmin = currentUser?.role == UserRole.ADMIN

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle de Piscina") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (isAdmin) {
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color.Red)
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            Text(text = currentPool.name, fontSize = 32.sp, fontWeight = FontWeight.Bold)
            Text(text = currentPool.owner, color = Color.Gray, fontSize = 18.sp)

            Spacer(modifier = Modifier.height(24.dp))
            
            if (isAdmin) {
                Button(
                    onClick = { showEditDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEEEEEE)),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, tint = Color.Black)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Editar Piscina", color = Color.Black)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            Text(text = "Información de la Piscina", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            
            DetailRow("Dueño", currentPool.owner)
            DetailRow("Ubicación", currentPool.location)
            DetailRow("Teléfono", currentPool.phone)
            DetailRow("Correo", currentPool.email)
            DetailRow("Compañía de Manejo", currentPool.managementCompany)
            DetailRow("Tamaño (m²)", "%.2f".format(currentPool.size))
            DetailRow("Visitas por Semana", "%.2f".format(currentPool.visitsPerWeek))
            
            val daysOfWeek = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
            val scheduledDaysText = if (currentPool.scheduledDays.isEmpty()) "Ninguno" 
                else currentPool.scheduledDays.joinToString(", ") { daysOfWeek[it - 1] }
            DetailRow("Días Programados", scheduledDaysText)

            if (isAdmin) {
                DetailRow("Pago Mensual", "%,.2f".format(currentPool.monthlyPayment))
            }
        }
    }

    if (showEditDialog) {
        EditPoolDialog(
            pool = currentPool,
            onDismiss = { showEditDialog = false },
            onConfirm = { updatedPool ->
                viewModel.updatePool(updatedPool)
                currentPool = updatedPool
                showEditDialog = false
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Eliminar Piscina") },
            text = { Text("¿Estás seguro de que deseas eliminar esta piscina? Esta acción no se puede deshacer.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deletePool(currentPool.id)
                        showDeleteDialog = false
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun EditPoolDialog(
    pool: Pool,
    onDismiss: () -> Unit,
    onConfirm: (Pool) -> Unit
) {
    var name by remember { mutableStateOf(pool.name) }
    var owner by remember { mutableStateOf(pool.owner) }
    var location by remember { mutableStateOf(pool.location) }
    var phone by remember { mutableStateOf(pool.phone) }
    var email by remember { mutableStateOf(pool.email) }
    var company by remember { mutableStateOf(pool.managementCompany) }
    var size by remember { mutableStateOf(pool.size.toString()) }
    var visits by remember { mutableStateOf(pool.visitsPerWeek.toString()) }
    var scheduledDays by remember { mutableStateOf(pool.scheduledDays.toSet()) }
    var payment by remember { mutableStateOf(pool.monthlyPayment.toString()) }

    val daysOfWeek = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editar Piscina") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                TextField(value = name, onValueChange = { name = it }, label = { Text("Nombre") })
                TextField(value = owner, onValueChange = { owner = it }, label = { Text("Dueño") })
                TextField(value = location, onValueChange = { location = it }, label = { Text("Ubicación") })
                TextField(value = phone, onValueChange = { phone = it }, label = { Text("Teléfono") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                TextField(value = email, onValueChange = { email = it }, label = { Text("Correo") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                TextField(value = company, onValueChange = { company = it }, label = { Text("Compañía") })
                PoolDecimalField(value = size, onValueChange = { size = it }, label = "Tamaño (m²)")
                PoolDecimalField(value = visits, onValueChange = { visits = it }, label = "Visits por Semana")
                
                val maxVisits = visits.toDoubleOrNull()?.toInt() ?: 0
                Text(
                    text = "Días Programados (${scheduledDays.size}/$maxVisits)",
                    modifier = Modifier.padding(top = 8.dp),
                    fontWeight = FontWeight.Bold,
                    color = if (scheduledDays.size > maxVisits) Color.Red else Color.Unspecified
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    daysOfWeek.forEachIndexed { index, day ->
                        val dayInt = index + 1
                        val isSelected = scheduledDays.contains(dayInt)
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                if (isSelected) {
                                    scheduledDays = scheduledDays - dayInt
                                } else if (scheduledDays.size < maxVisits) {
                                    scheduledDays = scheduledDays + dayInt
                                }
                            },
                            label = { Text(day, fontSize = 10.sp) },
                            enabled = isSelected || scheduledDays.size < maxVisits
                        )
                    }
                }

                PoolDecimalField(value = payment, onValueChange = { payment = it }, label = "Pago Mensual")
            }
        },
        confirmButton = {
            val maxVisits = visits.toDoubleOrNull()?.toInt() ?: 0
            Button(
                enabled = name.isNotBlank() && scheduledDays.size == maxVisits && maxVisits > 0,
                onClick = {
                onConfirm(pool.copy(
                    name = name,
                    owner = owner,
                    location = location,
                    phone = phone,
                    email = email,
                    managementCompany = company,
                    size = size.toDoubleOrNull() ?: 0.0,
                    visitsPerWeek = visits.toDoubleOrNull() ?: 0.0,
                    scheduledDays = scheduledDays.toList().sorted(),
                    monthlyPayment = payment.toDoubleOrNull() ?: 0.0
                ))
            }) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
