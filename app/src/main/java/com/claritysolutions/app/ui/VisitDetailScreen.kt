package com.claritysolutions.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.CircleShape
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.claritysolutions.app.model.Visit
import com.claritysolutions.app.model.UserRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.graphics.drawable.BitmapDrawable
import android.content.Context
import android.content.Intent
import android.net.Uri
import kotlinx.coroutines.launch

// Función para descargar imagen y convertir a Bitmap
suspend fun downloadImage(context: Context, url: String?): Bitmap? {
    if (url == null) return null
    return withContext(Dispatchers.IO) {
        try {
            val loader = context.imageLoader
            val request = ImageRequest.Builder(context)
                .data(url)
                .allowHardware(false) // Necesario para PDF
                .build()
            val result = loader.execute(request)
            if (result is SuccessResult) {
                (result.drawable as? BitmapDrawable)?.bitmap
            } else null
        } catch (e: Exception) {
            null
        }
    }
}

// Función para generar PDF Profesional
suspend fun generatePdfReport(
    context: Context,
    visit: Visit,
    dateStr: String,
    cloroInst: String,
    phInst: String,
    alcalinidadInst: String,
    durezaInst: String,
    acidoInst: String
): File? {
    return withContext(Dispatchers.IO) {
        val pdfDocument = PdfDocument()
        val pageWidth = 595
        val pageHeight = 842
        var pageNumber = 1
        var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
        var page = pdfDocument.startPage(pageInfo)
        var canvas = page.canvas
        
        val textPaint = Paint().apply {
            textSize = 11f
            isAntiAlias = true
            color = android.graphics.Color.BLACK
        }
        val labelPaint = Paint().apply {
            textSize = 11f
            isAntiAlias = true
            color = android.graphics.Color.DKGRAY
        }
        val titlePaint = Paint().apply {
            textSize = 20f
            isFakeBoldText = true
            isAntiAlias = true
            color = android.graphics.Color.WHITE
        }
        val sectionTitlePaint = Paint().apply {
            textSize = 14f
            isFakeBoldText = true
            isAntiAlias = true
            color = android.graphics.Color.parseColor("#1A1A1A")
        }
        val headerPaint = Paint().apply {
            color = android.graphics.Color.parseColor("#1A1A1A")
        }
        val linePaint = Paint().apply {
            color = android.graphics.Color.parseColor("#EEEEEE")
            strokeWidth = 1f
        }

        // Header Background
        canvas.drawRect(0f, 0f, pageWidth.toFloat(), 100f, headerPaint)
        canvas.drawText("REPORTE DE VISITA", 40f, 50f, titlePaint)
        canvas.drawText("CLARITY SOLUTIONS", 40f, 80f, titlePaint.apply { textSize = 12f; isFakeBoldText = false })
        
        var y = 140f
        
        // Info General
        canvas.drawText("INFORMACIÓN GENERAL", 40f, y, sectionTitlePaint)
        y += 25f
        
        fun drawRow(label: String, value: String, currentY: Float): Float {
            canvas.drawText(label, 40f, currentY, labelPaint)
            canvas.drawText(value, 200f, currentY, textPaint)
            canvas.drawLine(40f, currentY + 8f, pageWidth - 40f, currentY + 8f, linePaint)
            return currentY + 25f
        }

        y = drawRow("Piscina:", visit.piscina, y)
        y = drawRow("Fecha:", dateStr, y)
        y = drawRow("Operador:", visit.operador, y)
        y += 20f

        // Mediciones
        canvas.drawText("MEDICIONES QUÍMICAS", 40f, y, sectionTitlePaint)
        y += 25f
        y = drawRow("Cloro Inicial:", "${visit.cloroInicial} ppm", y)
        y = drawRow("pH Inicial:", "${visit.phInicial}", y)
        y = drawRow("Alcalinidad:", "${visit.alcalinidadInicial} ppm", y)
        y = drawRow("Dureza Cálcica:", "${visit.durezaCalcica}", y)
        y = drawRow("Ácido Cianúrico:", "${visit.acidoCianuro}", y)
        y += 20f

        // Actividades
        canvas.drawText("ACTIVIDADES REALIZADAS", 40f, y, sectionTitlePaint)
        y += 25f
        val activities = mutableListOf<String>()
        if (visit.hasAlguicida) activities.add("Alguicida")
        if (visit.hasAspirado) activities.add("Aspirado")
        if (visit.hasCepillado) activities.add("Cepillado")
        if (visit.hasLimpiezaCanasta) activities.add("Limpieza Canasta")
        if (visit.hasLimpiezaSkimer) activities.add("Limpieza Skimer")
        if (visit.hasLimpiezaCanastaBomba) activities.add("Limpieza Canasta Bomba")
        if (visit.hasCheckeoCuartoMaquinas) activities.add("Checkeo Cuarto Máquinas")
        if (visit.hasMantenimientoBomba) activities.add("Mantenimiento Bomba")
        if (visit.hasRellenoAgua) activities.add("Relleno de Agua")
        if (visit.hasCloroShock) activities.add("Cloro Shock")
        if (visit.chlorineTablets > 0) activities.add("${visit.chlorineTablets} Tabletas de Cloro")
        
        activities.chunked(2).forEach { pair ->
            canvas.drawText("• ${pair[0]}", 50f, y, textPaint)
            if (pair.size > 1) {
                canvas.drawText("• ${pair[1]}", 300f, y, textPaint)
            }
            y += 20f
        }
        
        // Notas
        if (visit.notas.isNotBlank()) {
            y += 20f
            canvas.drawText("NOTAS ADICIONALES", 40f, y, sectionTitlePaint)
            y += 25f
            val words = visit.notas.split(" ")
            var line = ""
            words.forEach { word ->
                if (textPaint.measureText("$line $word") < (pageWidth - 80)) {
                    line += "$word "
                } else {
                    canvas.drawText(line, 40f, y, textPaint)
                    y += 15f
                    line = "$word "
                }
            }
            canvas.drawText(line, 40f, y, textPaint)
            y += 30f
        }

        // Nueva página para fotos
        pdfDocument.finishPage(page)
        pageNumber++
        pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
        page = pdfDocument.startPage(pageInfo)
        canvas = page.canvas
        
        // Header en nueva página
        canvas.drawRect(0f, 0f, pageWidth.toFloat(), 40f, headerPaint)
        y = 70f
        
        canvas.drawText("EVIDENCIA FOTOGRÁFICA", 40f, y, sectionTitlePaint)
        y += 40f

        val photos = listOf(
            Triple(visit.arrivalPhoto1, "Llegada 1", visit.arrivalPhoto1Time),
            Triple(visit.arrivalPhoto2, "Llegada 2", visit.arrivalPhoto2Time),
            Triple(visit.afterPhoto1, "Salida 1", visit.afterPhoto1Time),
            Triple(visit.afterPhoto2, "Salida 2", visit.afterPhoto2Time),
            Triple(visit.exitPhoto, "Propiedad", visit.exitPhotoTime)
        ).filter { it.first != null }

        val timeSdf = SimpleDateFormat("HH:mm", Locale.getDefault())
        photos.forEach { (url, label, time) ->
            val bitmap = downloadImage(context, url)
            if (bitmap != null) {
                if (y + 180 > pageHeight - 50) {
                    pdfDocument.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = pdfDocument.startPage(pageInfo)
                    canvas = page.canvas
                    y = 50f
                }
                
                val targetW = 240f
                val targetH = (targetW * bitmap.height) / bitmap.width
                val scaled = Bitmap.createScaledBitmap(bitmap, targetW.toInt(), targetH.toInt(), true)
                
                canvas.drawBitmap(scaled, 40f, y, null)
                val timeStr = if (time != null) " - ${timeSdf.format(Date(time))}" else ""
                canvas.drawText("$label$timeStr", 300f, y + (targetH / 2), textPaint.apply { textSize = 12f; isFakeBoldText = true })
                
                y += targetH + 30f
            }
        }

        pdfDocument.finishPage(page)
        
        val file = File(context.cacheDir, "Reporte_Clarity_${visit.id.take(8)}.pdf")
        try {
            val outputStream = FileOutputStream(file)
            pdfDocument.writeTo(outputStream)
            pdfDocument.close()
            outputStream.close()
            file
        } catch (e: Exception) {
            pdfDocument.close()
            null
        }
    }
}

// Función auxiliar para dar formato a las cantidades de forma limpia
fun formatAmount(amountInGramsOrMl: Double, unitType: String = "g"): String {
    return if (amountInGramsOrMl >= 1000) {
        val converted = amountInGramsOrMl / 1000.0
        val unit = if (unitType == "g") "kg" else "L"
        "%.2f %s".format(converted, unit)
    } else {
        "%.0f %s".format(amountInGramsOrMl, unitType)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitDetailScreen(
    visit: Visit,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    viewModel: VisitViewModel
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var isGeneratingPdf by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    val sdf = SimpleDateFormat("MMMM d, yyyy", Locale.getDefault())
    val dateString = sdf.format(Date(visit.fecha))
    val currentUser by viewModel.currentUser.collectAsState()
    val isAdmin = currentUser?.role == UserRole.ADMIN
    val context = LocalContext.current

    // Valores objetivo de mantenimiento
    val targetCloro = 2.0
    val targetPhMin = 7.2
    val targetPhMax = 7.6
    val targetAlcalinidadMin = 80.0
    val targetAlcalinidadMax = 120.0
    val targetDurezaMin = 200.0
    val targetDurezaMax = 400.0
    val targetAcidoMin = 30.0
    val targetAcidoMax = 50.0

    // Volumen de la piscina en m³ (se puede obtener dinámicamente de la piscina)
    val poolSize = 25.4

    // 1. Lógica de Cloro
    val cloroInst = when {
        visit.cloroInicial < targetCloro -> {
            val dif = targetCloro - visit.cloroInicial
            val gramos = dif * poolSize * 2.0 // 2g por m³ para subir 1 ppm
            "Cloro Bajo. Aplicar ${formatAmount(gramos)} de Cloro."
        }
        visit.cloroInicial > 3.0 -> "Cloro Alto (${visit.cloroInicial} ppm). No aplicar producto, monitorear."
        else -> "Cloro en niveles óptimos."
    }

    // 2. Lógica de pH
    val phInst = when {
        visit.phInicial < targetPhMin -> {
            val dif = (targetPhMin - visit.phInicial) / 0.1
            val gramos = dif * 10.0 * poolSize // 10g por m³ por cada 0.1
            "pH Bajo. Aplicar ${formatAmount(gramos)} de Incrementador de pH (pH+)."
        }
        visit.phInicial > targetPhMax -> {
            val dif = (visit.phInicial - targetPhMax) / 0.1
            val ml = dif * 10.0 * poolSize // 10ml por m³ por cada 0.1
            "pH Alto. Aplicar ${formatAmount(ml, "ml")} de Reductor de pH (pH- / Ácido)."
        }
        else -> "pH en niveles óptimos."
    }

    // 3. Lógica de Alcalinidad
    val alcalinidadInst = when {
        visit.alcalinidadInicial < targetAlcalinidadMin -> {
            val dif = (targetAlcalinidadMin - visit.alcalinidadInicial) / 10.0
            val gramos = dif * 18.0 * poolSize // 18g por m³ para subir 10 ppm
            "Alcalinidad Baja. Aplicar ${formatAmount(gramos)} de Bicarbonato de Sodio."
        }
        visit.alcalinidadInicial > targetAlcalinidadMax -> {
            val dif = (visit.alcalinidadInicial - targetAlcalinidadMax) / 10.0
            val ml = dif * 20.0 * poolSize // 20ml por m³ para bajar 10 ppm
            "Alcalinidad Alta. Aplicar ${formatAmount(ml, "ml")} de Reductor de Alcalinidad."
        }
        else -> "Alcalinidad en niveles óptimos."
    }

    // 4. Lógica de Dureza Cálcica
    val durezaInst = when {
        visit.durezaCalcica < targetDurezaMin -> {
            val dif = (targetDurezaMin - visit.durezaCalcica) / 10.0
            val gramos = dif * 15.0 * poolSize // 15g por m³ para subir 10 ppm
            "Dureza Baja. Aplicar ${formatAmount(gramos)} de Cloruro de Calcio."
        }
        visit.durezaCalcica > targetDurezaMax -> "Dureza Alta. Monitorear o realizar purga parcial de agua."
        else -> "Dureza en niveles óptimos."
    }

    // 5. Lógica de Ácido Cianúrico (Estabilizador)
    val acidoInst = when {
        visit.acidoCianuro < targetAcidoMin -> {
            val dif = (targetAcidoMin - visit.acidoCianuro) / 10.0
            val gramos = dif * 10.0 * poolSize // 10g por m³ para subir 10 ppm
            "Estabilizador Bajo. Aplicar ${formatAmount(gramos)} de Ácido Cianúrico."
        }
        visit.acidoCianuro > targetAcidoMax -> "Ácido Cianúrico Alto. Monitorear o drenar parcialmente."
        else -> "Ácido Cianúrico en niveles óptimos."
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { Text("Detalle de Visita") } },
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
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            Text("Mediciones de Agua", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            DetailRow("Cloro (ppm)", "%.2f".format(visit.cloroInicial))
            DetailRow("pH", "%.2f".format(visit.phInicial))
            DetailRow("Alcalinidad (ppm)", "%.2f".format(visit.alcalinidadInicial))
            DetailRow("Dureza Cálcica", "%.2f".format(visit.durezaCalcica))
            DetailRow("Ácido Cianúrico", "%.2f".format(visit.acidoCianuro))

            Spacer(modifier = Modifier.height(24.dp))
            Text("Visita de Mantenimiento", fontWeight = FontWeight.Bold, fontSize = 22.sp)

            Spacer(modifier = Modifier.height(16.dp))
            Text("Información Visita", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            DetailRow("Piscina", visit.piscina)
            DetailRow("Fecha", dateString)
            DetailRow("Realizada por", visit.operador)

            Spacer(modifier = Modifier.height(16.dp))
            InstructionRow("Instrucciones Cloro", cloroInst)
            InstructionRow("Instrucciones pH", phInst)
            InstructionRow("Instrucciones Alcalinidad", alcalinidadInst)
            InstructionRow("Instrucciones Dureza Cálcica", durezaInst)
            InstructionRow("Instrucciones Ácido Cianúrico", acidoInst)

            Spacer(modifier = Modifier.height(24.dp))
            Text("Actividades Realizadas", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            ActivityDetailRow("Alguicida", visit.hasAlguicida)
            ActivityDetailRow("Aspirado", visit.hasAspirado)
            ActivityDetailRow("Cepillado", visit.hasCepillado)
            ActivityDetailRow("Limpieza Canasta", visit.hasLimpiezaCanasta)
            ActivityDetailRow("Limpieza Skimer", visit.hasLimpiezaSkimer)
            ActivityDetailRow("Limpieza Canasta de Bomba", visit.hasLimpiezaCanastaBomba)
            ActivityDetailRow("Checkeo de Cuarto de Máquinas", visit.hasCheckeoCuartoMaquinas)
            ActivityDetailRow("Mantenimiento Bomba General", visit.hasMantenimientoBomba)
            ActivityDetailRow("Cloro Shock", visit.hasCloroShock)
            DetailRow("Relleno de Agua por Nivel Bajo", if (visit.hasRellenoAgua) "Sí" else "No")
            DetailRow("Tabletas de Cloro Aplicadas", visit.chlorineTablets.toString())

            Spacer(modifier = Modifier.height(24.dp))
            Text("Registro Fotográfico", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            
            PhotoDetailSection("Fotos de Llegada", visit.arrivalPhoto1, visit.arrivalPhoto1Time, visit.arrivalPhoto2, visit.arrivalPhoto2Time)
            PhotoDetailSection("Fotos de Salida", visit.afterPhoto1, visit.afterPhoto1Time, visit.afterPhoto2, visit.afterPhoto2Time)
            
            Text("Foto de Salida (Propiedad)", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
            if (visit.exitPhoto != null) {
                PhotoDetailItem(visit.exitPhoto, visit.exitPhotoTime)
            } else {
                Text("No se tomó foto de salida", color = Color.Gray, fontSize = 12.sp)
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text("Notas", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(text = visit.notas, modifier = Modifier.padding(vertical = 8.dp))

            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onEdit,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEEEEEE)),
                shape = MaterialTheme.shapes.medium
            ) {
                Icon(Icons.Default.Edit, contentDescription = null, tint = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Editar", color = Color.Black)
            }

            Button(
                onClick = {
                    isGeneratingPdf = true
                    scope.launch {
                        val pdfFile = generatePdfReport(context, visit, dateString, cloroInst, phInst, alcalinidadInst, durezaInst, acidoInst)
                        isGeneratingPdf = false
                        if (pdfFile != null) {
                            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", pdfFile)
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "application/pdf"
                                putExtra(Intent.EXTRA_STREAM, uri)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            context.startActivity(Intent.createChooser(intent, "Compartir Reporte PDF"))
                        }
                    }
                },
                enabled = !isGeneratingPdf,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                shape = MaterialTheme.shapes.medium
            ) {
                if (isGeneratingPdf) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Generando PDF...", color = Color.White)
                } else {
                    Icon(Icons.Default.Download, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Descargar Reporte PDF", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Eliminar Visita") },
            text = { Text("¿Estás seguro de que deseas eliminar esta visita? Esta acción no se puede deshacer.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteVisit(visit.id)
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
fun PhotoDetailSection(title: String, url1: String?, time1: Long?, url2: String?, time2: Long?) {
    Column(modifier = Modifier.padding(top = 16.dp)) {
        Text(text = title, fontWeight = FontWeight.Bold)
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f)) { PhotoDetailItem(url1, time1) }
            Spacer(modifier = Modifier.width(8.dp))
            Box(modifier = Modifier.weight(1f)) { PhotoDetailItem(url2, time2) }
        }
    }
}

@Composable
fun PhotoDetailItem(url: String?, time: Long?) {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .height(150.dp)
            .background(Color(0xFFF5F5F5), MaterialTheme.shapes.medium),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (url != null) {
            Box(contentAlignment = Alignment.BottomEnd) {
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
            Text("Sin foto", color = Color.Gray, fontSize = 12.sp)
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = MaterialTheme.colorScheme.secondary)
        Text(text = value, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
}

@Composable
fun InstructionRow(label: String, instruction: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.weight(1f))
        Text(
            text = instruction,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1.5f),
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.primary
        )
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
}

@Composable
fun ActivityDetailRow(label: String, completed: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = MaterialTheme.colorScheme.primary)
        if (completed) {
            Icon(Icons.Default.Check, contentDescription = "Realizado", tint = Color(0xFF4CAF50))
        } else {
            Text(text = "No realizado", color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.5f), fontSize = 12.sp)
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
}
