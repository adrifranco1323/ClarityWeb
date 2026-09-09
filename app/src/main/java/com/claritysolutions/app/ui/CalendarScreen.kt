package com.claritysolutions.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claritysolutions.app.model.Pool
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.*

@Composable
fun CalendarScreen(viewModel: VisitViewModel, onPoolClick: (Pool) -> Unit) {
    val pools by viewModel.allPools.collectAsState()
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Calendar", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        CalendarHeader(
            currentDate = selectedDate,
            onMonthChange = { selectedDate = it }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        CalendarGrid(
            selectedDate = selectedDate,
            onDateSelected = { selectedDate = it },
            pools = pools
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Pools for ${selectedDate.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault())}",
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        val dayOfWeekInt = when (selectedDate.dayOfWeek.value) {
            1 -> 1 // Mon
            2 -> 2 // Tue
            3 -> 3 // Wed
            4 -> 4 // Thu
            5 -> 5 // Fri
            6 -> 6 // Sat
            7 -> 7 // Sun
            else -> 1
        }
        
        val poolsForDay = pools.filter { it.scheduledDays.contains(dayOfWeekInt) }
        
        if (poolsForDay.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("No pools scheduled for this day", color = Color.Gray)
            }
        } else {
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(poolsForDay) { pool ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { onPoolClick(pool) },
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(pool.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(pool.owner, color = Color.Gray, fontSize = 14.sp)
                            Text(pool.location, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarHeader(
    currentDate: LocalDate,
    onMonthChange: (LocalDate) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = { onMonthChange(currentDate.minusMonths(1)) }) {
            Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
        }
        
        Text(
            text = "${currentDate.month.getDisplayName(TextStyle.FULL, Locale.getDefault())} ${currentDate.year}",
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp
        )
        
        IconButton(onClick = { onMonthChange(currentDate.plusMonths(1)) }) {
            Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
        }
    }
}

@Composable
fun CalendarGrid(
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    pools: List<Pool>
) {
    val daysInMonth = selectedDate.lengthOfMonth()
    val firstDayOffset = selectedDate.withDayOfMonth(1).dayOfWeek.value - 1 // 0=Mon, ..., 6=Sun
    
    val daysOfWeekLabels = listOf("M", "T", "W", "T", "F", "S", "S")
    
    Column {
        Row(modifier = Modifier.fillMaxWidth()) {
            daysOfWeekLabels.forEach { label ->
                Text(
                    text = label,
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    color = Color.Gray,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        var currentDay = 1
        for (i in 0..5) { // Max 6 rows
            Row(modifier = Modifier.fillMaxWidth()) {
                for (j in 0..6) {
                    val dayIndex = i * 7 + j
                    if (dayIndex < firstDayOffset || currentDay > daysInMonth) {
                        Spacer(modifier = Modifier.weight(1f))
                    } else {
                        val date = selectedDate.withDayOfMonth(currentDay)
                        val isSelected = date == selectedDate
                        val isToday = date == LocalDate.now()
                        
                        val dayOfWeekInt = date.dayOfWeek.value
                        val hasPools = pools.any { it.scheduledDays.contains(dayOfWeekInt) }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .padding(2.dp)
                                .background(
                                    color = when {
                                        isSelected -> Color.Black
                                        isToday -> Color(0xFFE0E0E0)
                                        else -> Color.Transparent
                                    },
                                    shape = CircleShape
                                )
                                .clickable { onDateSelected(date) },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = currentDay.toString(),
                                    color = if (isSelected) Color.White else Color.Black,
                                    fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 14.sp
                                )
                                if (hasPools) {
                                    Box(
                                        modifier = Modifier
                                            .size(4.dp)
                                            .background(
                                                color = if (isSelected) Color.White else Color(0xFF4CAF50),
                                                shape = CircleShape
                                            )
                                    )
                                }
                            }
                        }
                        currentDay++
                    }
                }
            }
            if (currentDay > daysInMonth) break
        }
    }
}
