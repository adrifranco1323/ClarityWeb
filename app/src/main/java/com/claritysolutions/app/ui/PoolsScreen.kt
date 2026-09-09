package com.claritysolutions.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claritysolutions.app.model.Pool

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoolsScreen(viewModel: VisitViewModel, onPoolClick: (Pool) -> Unit) {
    val pools by viewModel.allPools.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val isAdmin = currentUser?.role == com.claritysolutions.app.model.UserRole.ADMIN
    var showDialog by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val filteredPools = remember(pools, searchQuery) {
        pools.filter { it.name.contains(searchQuery, ignoreCase = true) || it.owner.contains(searchQuery, ignoreCase = true) }
    }

    Scaffold(
        floatingActionButton = {
            if (isAdmin) {
                FloatingActionButton(
                    onClick = { showDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = MaterialTheme.shapes.medium
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Pool")
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "Piscinas",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Buscar por nombre o dueño...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                shape = MaterialTheme.shapes.medium,
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Color(0xFFF8F8F8),
                    focusedContainerColor = Color.White,
                    unfocusedBorderColor = Color.Transparent,
                    focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (filteredPools.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No se encontraron piscinas", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    itemsIndexed(filteredPools) { index, pool ->
                        AnimatedPoolItem(pool, index, onPoolClick)
                    }
                }
            }
        }
    }

    if (showDialog) {
        AddPoolDialog(
            onDismiss = { showDialog = false },
            onConfirm = { name, owner, location, phone, email, company, size, visits, days, payment ->
                viewModel.insertPool(
                    Pool(
                        name = name,
                        owner = owner,
                        location = location,
                        phone = phone,
                        email = email,
                        managementCompany = company,
                        size = size.toDoubleOrNull() ?: 0.0,
                        visitsPerWeek = visits.toDoubleOrNull() ?: 0.0,
                        scheduledDays = days,
                        monthlyPayment = payment.toDoubleOrNull() ?: 0.0
                    )
                )
                showDialog = false
            }
        )
    }
}

@Composable
fun AnimatedPoolItem(pool: Pool, index: Int, onClick: (Pool) -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        enter = slideInHorizontally(
            animationSpec = tween(300, delayMillis = index * 50),
            initialOffsetX = { -100 }
        ) + fadeIn(animationSpec = tween(300, delayMillis = index * 50))
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .clickable { onClick(pool) },
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Row(
                modifier = Modifier
                    .padding(16.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f),
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.WaterDrop,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = pool.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(text = pool.owner, color = Color.Gray, fontSize = 14.sp)
                }
                Text(
                    text = "${pool.visitsPerWeek.toInt()}x",
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPoolDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, String, String, String, String, String, List<Int>, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var owner by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var company by remember { mutableStateOf("") }
    var size by remember { mutableStateOf("") }
    var visits by remember { mutableStateOf("") }
    var scheduledDays by remember { mutableStateOf(setOf<Int>()) }
    var payment by remember { mutableStateOf("") }

    val daysOfWeek = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Registrar Nueva Piscina", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                DialogField(value = name, onValueChange = { name = it }, label = "Nombre de la Piscina")
                DialogField(value = owner, onValueChange = { owner = it }, label = "Dueño / Cliente")
                DialogField(value = location, onValueChange = { location = it }, label = "Ubicación")
                DialogField(value = phone, onValueChange = { phone = it }, label = "Teléfono", keyboardType = KeyboardType.Phone)
                DialogField(value = email, onValueChange = { email = it }, label = "Correo Electrónico", keyboardType = KeyboardType.Email)
                DialogField(value = company, onValueChange = { company = it }, label = "Administradora")
                
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        PoolDecimalField(value = size, onValueChange = { size = it }, label = "Tamaño (m²)")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        PoolDecimalField(value = visits, onValueChange = { visits = it }, label = "Visitas / Sem")
                    }
                }
                
                val maxVisits = visits.toDoubleOrNull()?.toInt() ?: 0
                Text(
                    text = "Días Programados (${scheduledDays.size}/$maxVisits)",
                    modifier = Modifier.padding(top = 12.dp, bottom = 8.dp),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    daysOfWeek.forEachIndexed { index, day ->
                        val dayInt = index + 1
                        val isSelected = scheduledDays.contains(dayInt)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp)
                                .clickable(enabled = isSelected || scheduledDays.size < maxVisits) {
                                    scheduledDays = if (isSelected) scheduledDays - dayInt else scheduledDays + dayInt
                                },
                            color = if (isSelected) MaterialTheme.colorScheme.primary else Color(0xFFF0F0F0),
                            shape = MaterialTheme.shapes.small
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    day.take(1),
                                    color = if (isSelected) Color.White else Color.Gray,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                DialogField(value = payment, onValueChange = { payment = it }, label = "Pago Mensual ($)", keyboardType = KeyboardType.Decimal)
            }
        },
        confirmButton = {
            val maxVisits = visits.toDoubleOrNull()?.toInt() ?: 0
            Button(
                enabled = name.isNotBlank() && scheduledDays.size == maxVisits && maxVisits > 0,
                onClick = { onConfirm(name, owner, location, phone, email, company, size, visits, scheduledDays.toList().sorted(), payment) },
                shape = MaterialTheme.shapes.small
            ) {
                Text("Registrar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}

@Composable
fun DialogField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.small,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        singleLine = true
    )
}

@Composable
fun PoolDecimalField(value: String, onValueChange: (String) -> Unit, label: String) {
    OutlinedTextField(
        value = value,
        onValueChange = { newValue ->
            if (newValue.isEmpty() || newValue.matches(Regex("""^\d*\.?\d{0,2}$"""))) {
                onValueChange(newValue)
            }
        },
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.small,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        singleLine = true
    )
}
