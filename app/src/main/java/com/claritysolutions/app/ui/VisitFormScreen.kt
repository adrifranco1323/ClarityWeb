package com.claritysolutions.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.claritysolutions.app.model.Visit
import android.widget.Toast
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitFormScreen(
    viewModel: VisitViewModel,
    visitToEdit: Visit? = null,
    onVisitSubmitted: (Visit) -> Unit,
    onBack: (() -> Unit)? = null
) {
    val pools by viewModel.allPools.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var selectedPool by remember { mutableStateOf(visitToEdit?.piscina ?: "") }
    var cloro by remember { mutableStateOf(visitToEdit?.cloroInicial?.toString() ?: "") }
    var ph by remember { mutableStateOf(visitToEdit?.phInicial?.toString() ?: "") }
    var alcalinidad by remember { mutableStateOf(visitToEdit?.alcalinidadInicial?.toString() ?: "") }
    var dureza by remember { mutableStateOf(visitToEdit?.durezaCalcica?.toString() ?: "") }
    var acido by remember { mutableStateOf(visitToEdit?.acidoCianuro?.toString() ?: "") }
    var notas by remember { mutableStateOf(visitToEdit?.notas ?: "") }

    var hasAlguicida by remember { mutableStateOf(visitToEdit?.hasAlguicida ?: false) }
    var hasAspirado by remember { mutableStateOf(visitToEdit?.hasAspirado ?: false) }
    var hasCepillado by remember { mutableStateOf(visitToEdit?.hasCepillado ?: false) }
    var hasLimpiezaCanasta by remember { mutableStateOf(visitToEdit?.hasLimpiezaCanasta ?: false) }
    var hasLimpiezaSkimer by remember { mutableStateOf(visitToEdit?.hasLimpiezaSkimer ?: false) }
    var hasLimpiezaCanastaBomba by remember { mutableStateOf(visitToEdit?.hasLimpiezaCanastaBomba ?: false) }
    var hasCheckeoCuartoMaquinas by remember { mutableStateOf(visitToEdit?.hasCheckeoCuartoMaquinas ?: false) }
    var hasMantenimientoBomba by remember { mutableStateOf(visitToEdit?.hasMantenimientoBomba ?: false) }
    var hasRellenoAgua by remember { mutableStateOf(visitToEdit?.hasRellenoAgua ?: false) }
    var hasCloroShock by remember { mutableStateOf(visitToEdit?.hasCloroShock ?: false) }
    var chlorineTablets by remember { mutableStateOf(visitToEdit?.chlorineTablets?.toString() ?: "0") }

    var arrivalPhoto1 by remember { mutableStateOf(visitToEdit?.arrivalPhoto1) }
    var arrivalPhoto1Time by remember { mutableStateOf(visitToEdit?.arrivalPhoto1Time) }
    var arrivalPhoto2 by remember { mutableStateOf(visitToEdit?.arrivalPhoto2) }
    var arrivalPhoto2Time by remember { mutableStateOf(visitToEdit?.arrivalPhoto2Time) }
    var afterPhoto1 by remember { mutableStateOf(visitToEdit?.afterPhoto1) }
    var afterPhoto1Time by remember { mutableStateOf(visitToEdit?.afterPhoto1Time) }
    var afterPhoto2 by remember { mutableStateOf(visitToEdit?.afterPhoto2) }
    var afterPhoto2Time by remember { mutableStateOf(visitToEdit?.afterPhoto2Time) }
    var exitPhoto by remember { mutableStateOf(visitToEdit?.exitPhoto) }
    var exitPhotoTime by remember { mutableStateOf(visitToEdit?.exitPhotoTime) }

    var uploadingPhoto by remember { mutableStateOf(false) }

    fun createImageFile(): File {
        val storageDir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES)
        return File.createTempFile("TEMP_PHOTO_", ".jpg", storageDir)
    }

    var tempPhotoFile by remember { mutableStateOf<File?>(null) }
    var currentPhotoTarget by remember { mutableStateOf<String?>(null) }

    val takePictureLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success && tempPhotoFile != null) {
            uploadingPhoto = true
            scope.launch {
                try {
                    val url = viewModel.uploadImage(tempPhotoFile!!)
                    val time = System.currentTimeMillis()
                    when (currentPhotoTarget) {
                        "arrival1" -> { arrivalPhoto1 = url; arrivalPhoto1Time = time }
                        "arrival2" -> { arrivalPhoto2 = url; arrivalPhoto2Time = time }
                        "after1" -> { afterPhoto1 = url; afterPhoto1Time = time }
                        "after2" -> { afterPhoto2 = url; afterPhoto2Time = time }
                        "exit" -> { exitPhoto = url; exitPhotoTime = time }
                    }
                    tempPhotoFile?.delete() // Limpiar archivo temporal
                    Toast.makeText(context, "Foto subida con éxito", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(context, "Error al subir foto: ${e.message}", Toast.LENGTH_LONG).show()
                } finally {
                    uploadingPhoto = false
                }
            }
        } else {
            Toast.makeText(context, "La captura de la foto falló", Toast.LENGTH_SHORT).show()
        }
    }

    fun takePhoto(target: String) {
        val file = createImageFile()
        tempPhotoFile = file
        currentPhotoTarget = target
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        takePictureLauncher.launch(uri)
    }

    val scrollState = rememberScrollState()
    val sdf = SimpleDateFormat("MM/dd/yyyy HH:mm", Locale.getDefault())
    val currentDateTime = visitToEdit?.let { sdf.format(Date(it.fecha)) } ?: sdf.format(Date())

    Scaffold(
        topBar = {
            if (onBack != null) {
                TopAppBar(
                    title = { Text(if (visitToEdit != null) "Editar Visita" else "Nueva Visita") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
                .verticalScroll(scrollState)
        ) {
            if (onBack == null) {
                Text("Visitas", fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))
            }
            
            FormField(label = "Fecha", value = currentDateTime, onValueChange = {}, isReadOnly = true)
            
            Text(text = "Piscina", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = selectedPool,
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    placeholder = { Text("Seleccione una piscina") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    pools.forEach { pool ->
                        val poolDisplayName = "${pool.name} / ${pool.owner}"
                        DropdownMenuItem(
                            text = { Text(poolDisplayName) },
                            onClick = {
                                selectedPool = poolDisplayName
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            DecimalFormField(label = "Cloro Inicial", value = cloro, onValueChange = { cloro = it })
            DecimalFormField(label = "PH Inicial", value = ph, onValueChange = { ph = it })
            DecimalFormField(label = "Alcalinidad Inicial", value = alcalinidad, onValueChange = { alcalinidad = it })
            DecimalFormField(label = "Dureza Calcica", value = dureza, onValueChange = { dureza = it })
            DecimalFormField(label = "Acido Cianuro", value = acido, onValueChange = { acido = it })
            FormField(label = "Notas", value = notas, onValueChange = { notas = it })

            Spacer(modifier = Modifier.height(16.dp))
            Text(text = "Actividades Realizadas", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            
            ActivityCheckbox("Alguicida", hasAlguicida) { hasAlguicida = it }
            ActivityCheckbox("Aspirado", hasAspirado) { hasAspirado = it }
            ActivityCheckbox("Cepillado", hasCepillado) { hasCepillado = it }
            ActivityCheckbox("Limpieza Canasta", hasLimpiezaCanasta) { hasLimpiezaCanasta = it }
            ActivityCheckbox("Limpieza Skimer", hasLimpiezaSkimer) { hasLimpiezaSkimer = it }
            ActivityCheckbox("Limpieza Canasta de Bomba", hasLimpiezaCanastaBomba) { hasLimpiezaCanastaBomba = it }
            ActivityCheckbox("Checkeo de Cuarto de Máquinas", hasCheckeoCuartoMaquinas) { hasCheckeoCuartoMaquinas = it }
            ActivityCheckbox("Mantenimiento Bomba General", hasMantenimientoBomba) { hasMantenimientoBomba = it }
            ActivityCheckbox("Relleno de Agua por Nivel Bajo", hasRellenoAgua) { hasRellenoAgua = it }
            ActivityCheckbox("Cloro Shock", hasCloroShock) { hasCloroShock = it }
            
            Row(
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            ) {
                Text(text = "Tabletas de Cloro Aplicadas", modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = chlorineTablets,
                    onValueChange = { if (it.isEmpty() || it.all { char -> char.isDigit() }) chlorineTablets = it },
                    modifier = Modifier.width(80.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = MaterialTheme.shapes.small,
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text(text = "Registro Fotográfico", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            if (uploadingPhoto) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
                Text("Subiendo foto...", fontSize = 12.sp, color = Color.Gray)
            }

            PhotoSection("Fotos de Llegada (Estado)", 
                arrivalPhoto1, arrivalPhoto1Time, { takePhoto("arrival1") },
                arrivalPhoto2, arrivalPhoto2Time, { takePhoto("arrival2") }
            )

            PhotoSection("Fotos de Salida (Limpieza)", 
                afterPhoto1, afterPhoto1Time, { takePhoto("after1") },
                afterPhoto2, afterPhoto2Time, { takePhoto("after2") }
            )

            Text(text = "Foto de Salida (Propiedad)", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
            PhotoItem(exitPhoto, exitPhotoTime) { takePhoto("exit") }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    val visit = visitToEdit?.copy(
                        piscina = selectedPool,
                        cloroInicial = cloro.toDoubleOrNull() ?: 0.0,
                        phInicial = ph.toDoubleOrNull() ?: 0.0,
                        alcalinidadInicial = alcalinidad.toDoubleOrNull() ?: 0.0,
                        durezaCalcica = dureza.toDoubleOrNull() ?: 0.0,
                        acidoCianuro = acido.toDoubleOrNull() ?: 0.0,
                        notas = notas,
                        hasAlguicida = hasAlguicida,
                        hasAspirado = hasAspirado,
                        hasCepillado = hasCepillado,
                        hasLimpiezaCanasta = hasLimpiezaCanasta,
                        hasLimpiezaSkimer = hasLimpiezaSkimer,
                        hasLimpiezaCanastaBomba = hasLimpiezaCanastaBomba,
                        hasCheckeoCuartoMaquinas = hasCheckeoCuartoMaquinas,
                        hasMantenimientoBomba = hasMantenimientoBomba,
                        hasRellenoAgua = hasRellenoAgua,
                        hasCloroShock = hasCloroShock,
                        chlorineTablets = chlorineTablets.toIntOrNull() ?: 0,
                        arrivalPhoto1 = arrivalPhoto1,
                        arrivalPhoto1Time = arrivalPhoto1Time,
                        arrivalPhoto2 = arrivalPhoto2,
                        arrivalPhoto2Time = arrivalPhoto2Time,
                        afterPhoto1 = afterPhoto1,
                        afterPhoto1Time = afterPhoto1Time,
                        afterPhoto2 = afterPhoto2,
                        afterPhoto2Time = afterPhoto2Time,
                        exitPhoto = exitPhoto,
                        exitPhotoTime = exitPhotoTime
                    ) ?: Visit(
                        piscina = selectedPool,
                        cloroInicial = cloro.toDoubleOrNull() ?: 0.0,
                        phInicial = ph.toDoubleOrNull() ?: 0.0,
                        alcalinidadInicial = alcalinidad.toDoubleOrNull() ?: 0.0,
                        durezaCalcica = dureza.toDoubleOrNull() ?: 0.0,
                        acidoCianuro = acido.toDoubleOrNull() ?: 0.0,
                        notas = notas,
                        operador = currentUser?.fullName ?: "Unknown",
                        operadorId = currentUser?.id,
                        hasAlguicida = hasAlguicida,
                        hasAspirado = hasAspirado,
                        hasCepillado = hasCepillado,
                        hasLimpiezaCanasta = hasLimpiezaCanasta,
                        hasLimpiezaSkimer = hasLimpiezaSkimer,
                        hasLimpiezaCanastaBomba = hasLimpiezaCanastaBomba,
                        hasCheckeoCuartoMaquinas = hasCheckeoCuartoMaquinas,
                        hasMantenimientoBomba = hasMantenimientoBomba,
                        hasRellenoAgua = hasRellenoAgua,
                        hasCloroShock = hasCloroShock,
                        chlorineTablets = chlorineTablets.toIntOrNull() ?: 0,
                        arrivalPhoto1 = arrivalPhoto1,
                        arrivalPhoto1Time = arrivalPhoto1Time,
                        arrivalPhoto2 = arrivalPhoto2,
                        arrivalPhoto2Time = arrivalPhoto2Time,
                        afterPhoto1 = afterPhoto1,
                        afterPhoto1Time = afterPhoto1Time,
                        afterPhoto2 = afterPhoto2,
                        afterPhoto2Time = afterPhoto2Time,
                        exitPhoto = exitPhoto,
                        exitPhotoTime = exitPhotoTime
                    )
                    
                    if (visitToEdit != null) {
                        viewModel.updateVisit(visit)
                    } else {
                        viewModel.insertVisit(visit)
                    }
                    
                    onVisitSubmitted(visit)
                    
                    if (visitToEdit == null) {
                        selectedPool = ""; cloro = ""; ph = ""; alcalinidad = ""; dureza = ""; acido = ""; notas = ""; chlorineTablets = "0"
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.fillMaxWidth(),
                enabled = !uploadingPhoto
            ) {
                Text(if (visitToEdit != null) "Guardar Cambios" else "Submit", color = Color.White, fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun PhotoSection(
    title: String,
    url1: String?, time1: Long?, onTake1: () -> Unit,
    url2: String?, time2: Long?, onTake2: () -> Unit
) {
    Column(modifier = Modifier.padding(top = 16.dp)) {
        Text(text = title, fontWeight = FontWeight.Bold)
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f)) { PhotoItem(url1, time1, onTake1) }
            Spacer(modifier = Modifier.width(8.dp))
            Box(modifier = Modifier.weight(1f)) { PhotoItem(url2, time2, onTake2) }
        }
    }
}

@Composable
fun PhotoItem(url: String?, time: Long?, onTake: () -> Unit) {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .height(150.dp)
            .background(Color(0xFFF5F5F5), MaterialTheme.shapes.medium)
            .clickable { onTake() },
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (url != null) {
            Box(contentAlignment = androidx.compose.ui.Alignment.BottomEnd) {
                AsyncImage(
                    model = url,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                Surface(
                    color = Color.Black.copy(alpha = 0.6f),
                    modifier = Modifier.padding(4.dp),
                    shape = CircleShape
                ) {
                    Text(
                        text = if (time != null) sdf.format(Date(time)) else "",
                        color = Color.White,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        } else {
            Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = Color.Gray)
            Text("Tomar Foto", fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun ActivityCheckbox(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Text(text = label)
    }
}

@Composable
fun DecimalFormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    FormField(
        label = label,
        value = value,
        onValueChange = { newValue ->
            if (newValue.isEmpty() || newValue.matches(Regex("""^\d*\.?\d{0,2}$"""))) {
                onValueChange(newValue)
            }
        },
        keyboardType = KeyboardType.Decimal
    )
}

@Composable
fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isReadOnly: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(text = label, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            readOnly = isReadOnly,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = MaterialTheme.shapes.medium,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color.LightGray,
                unfocusedBorderColor = Color.LightGray
            )
        )
    }
}
