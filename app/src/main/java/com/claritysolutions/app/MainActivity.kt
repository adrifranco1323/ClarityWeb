package com.claritysolutions.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination
import androidx.navigation.NavGraph
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.claritysolutions.app.model.Pool
import com.claritysolutions.app.model.Visit
import com.claritysolutions.app.model.UserRole
import com.claritysolutions.app.ui.*
import com.claritysolutions.app.ui.theme.ClarityTheme

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object VisitForm : Screen("visit_form", "Visits Form", Icons.Default.ChatBubbleOutline)
    object Pools : Screen("pools", "Pools", Icons.Default.WaterDrop)
    object Visits : Screen("visits", "Visits", Icons.Default.Checklist)
    object Calendar : Screen("calendar", "Calendar", Icons.Default.CalendarMonth)
    object Calculator : Screen("calculator", "Volume Calculator", Icons.Default.Calculate)
    object Users : Screen("users", "Users", Icons.Default.People)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Solicitar permiso de notificaciones para Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != 
                PackageManager.PERMISSION_GRANTED) {
                registerForActivityResult(ActivityResultContracts.RequestPermission()) {}.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        enableEdgeToEdge()
        setContent {
            var isDarkMode by remember { mutableStateOf(false) }
            ClarityTheme(darkTheme = isDarkMode) {
                MainApp(isDarkMode = isDarkMode, onToggleDarkMode = { isDarkMode = !isDarkMode })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainApp(isDarkMode: Boolean, onToggleDarkMode: () -> Unit) {
    val navController = rememberNavController()
    val viewModel: VisitViewModel = viewModel()
    val currentUser by viewModel.currentUser.collectAsState()
    val allVisits by viewModel.allVisits.collectAsState()
    
    when {
        currentUser == null -> {
            Scaffold(
                topBar = {
                    CenterAlignedTopAppBar(
                        title = { Text("CLARITY SOLUTIONS", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                        actions = {
                            IconButton(onClick = onToggleDarkMode) {
                                Icon(
                                    imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                    contentDescription = "Toggle Dark Mode",
                                    tint = if (isDarkMode) Color.White else Color.Black
                                )
                            }
                        },
                        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                            containerColor = if (isDarkMode) Color(0xFF1A1A1A) else Color.White,
                            titleContentColor = if (isDarkMode) Color.White else Color.Black
                        )
                    )
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    LoginScreen(viewModel)
                }
            }
        }
        currentUser?.role == UserRole.PENDIENTE -> {
            Scaffold(
                topBar = {
                    CenterAlignedTopAppBar(
                        title = { Text("CLARITY SOLUTIONS", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                        actions = {
                            IconButton(onClick = onToggleDarkMode) {
                                Icon(
                                    imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                    contentDescription = "Toggle Dark Mode",
                                    tint = if (isDarkMode) Color.White else Color.Black
                                )
                            }
                        },
                        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                            containerColor = if (isDarkMode) Color(0xFF1A1A1A) else Color.White,
                            titleContentColor = if (isDarkMode) Color.White else Color.Black
                        )
                    )
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    PendingApprovalScreen(viewModel)
                }
            }
        }
        else -> {
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
            val scope = rememberCoroutineScope()
            val screens = remember(currentUser) {
                val baseScreens = mutableListOf(Screen.VisitForm, Screen.Pools, Screen.Visits, Screen.Calendar, Screen.Calculator)
                if (currentUser?.role == UserRole.ADMIN) {
                    baseScreens.add(Screen.Users)
                }
                baseScreens
            }
            var selectedVisit by remember { mutableStateOf<Visit?>(null) }
            var selectedPool by remember { mutableStateOf<Pool?>(null) }
            var visitToEdit by remember { mutableStateOf<Visit?>(null) }

            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet(
                        drawerContainerColor = MaterialTheme.colorScheme.surface,
                        drawerTonalElevation = 0.dp
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.primary)
                                .padding(vertical = 40.dp, horizontal = 24.dp)
                        ) {
                            Column {
                                Icon(
                                    Icons.Default.WaterDrop,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    "CLARITY",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 24.sp,
                                    letterSpacing = 2.sp
                                )
                                Text(
                                    "SOLUTIONS",
                                    color = Color.White.copy(alpha = 0.7f),
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 12.sp,
                                    letterSpacing = 4.sp
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        screens.forEach { screen ->
                            val isSelected = navController.currentBackStackEntryAsState().value?.destination?.route == screen.route
                            NavigationDrawerItem(
                                icon = { 
                                    Icon(
                                        screen.icon, 
                                        contentDescription = null,
                                        tint = if (isSelected) MaterialTheme.colorScheme.primary else Color.Gray
                                    ) 
                                },
                                label = { 
                                    Text(
                                        screen.label,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    ) 
                                },
                                selected = isSelected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                    unselectedContainerColor = Color.Transparent,
                                    unselectedTextColor = Color.Gray
                                ),
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
                                shape = MaterialTheme.shapes.medium
                            )
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 24.dp))
                        NavigationDrawerItem(
                            icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color.Gray) },
                            label = { Text("Cerrar Sesión", color = Color.Gray) },
                            selected = false,
                            onClick = {
                                scope.launch { drawerState.close() }
                                viewModel.logout()
                            },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                            shape = MaterialTheme.shapes.medium
                        )
                    }
                }
            ) {
                Scaffold(
                    topBar = {
                        if (selectedVisit == null && selectedPool == null && visitToEdit == null) {
                            CenterAlignedTopAppBar(
                                title = { Text("CLARITY SOLUTIONS", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                                navigationIcon = {
                                    IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu")
                                    }
                                },
                                actions = {
                                    IconButton(onClick = onToggleDarkMode) {
                                        Icon(
                                            imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                            contentDescription = "Toggle Dark Mode",
                                            tint = if (isDarkMode) Color.White else Color.Black
                                        )
                                    }
                                    IconButton(onClick = { viewModel.logout() }) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.Logout,
                                            contentDescription = "Logout",
                                            tint = if (isDarkMode) Color.White else Color.Black
                                        )
                                    }
                                },
                                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                                    containerColor = if (isDarkMode) Color(0xFF1A1A1A) else Color.White,
                                    titleContentColor = if (isDarkMode) Color.White else Color.Black
                                )
                            )
                        }
                    }
                ) { innerPadding ->
                    when {
                        visitToEdit != null -> {
                            VisitFormScreen(
                                viewModel = viewModel,
                                visitToEdit = visitToEdit,
                                onVisitSubmitted = { visit ->
                                    visitToEdit = null
                                    selectedVisit = visit
                                },
                                onBack = { visitToEdit = null }
                            )
                        }
                    selectedVisit != null -> {
                        val latestVisit = allVisits.find { it.id == selectedVisit?.id } ?: selectedVisit!!
                        VisitDetailScreen(
                            visit = latestVisit,
                            onBack = { selectedVisit = null },
                            onEdit = { 
                                visitToEdit = latestVisit
                                selectedVisit = null
                            },
                            viewModel = viewModel
                        )
                    }
                        selectedPool != null -> {
                            PoolDetailScreen(
                                pool = selectedPool!!, 
                                onBack = { selectedPool = null },
                                viewModel = viewModel
                            )
                        }
                        else -> {
                            NavHost(
                                navController = navController,
                                startDestination = Screen.VisitForm.route,
                                modifier = Modifier.padding(innerPadding)
                            ) {
                                composable(Screen.VisitForm.route) { 
                                    VisitFormScreen(
                                        viewModel = viewModel,
                                        onVisitSubmitted = { visit -> selectedVisit = visit }
                                    ) 
                                }
                                composable(Screen.Pools.route) { 
                                    PoolsScreen(viewModel, onPoolClick = { selectedPool = it }) 
                                }
                                composable(Screen.Visits.route) { 
                                    VisitsListScreen(viewModel, onVisitClick = { selectedVisit = it }) 
                                }
                                composable(Screen.Calendar.route) {
                                    CalendarScreen(viewModel, onPoolClick = { selectedPool = it })
                                }
                                composable(Screen.Calculator.route) {
                                    VolumeCalculatorScreen()
                                }
                                composable(Screen.Users.route) {
                                    UsersScreen(viewModel)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
