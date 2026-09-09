package com.claritysolutions.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claritysolutions.app.model.User
import com.claritysolutions.app.model.UserRole

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsersScreen(viewModel: VisitViewModel) {
    val users by viewModel.allUsers.collectAsState()
    var userToEdit by remember { mutableStateOf<User?>(null) }
    var userToDelete by remember { mutableStateOf<User?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(text = "Gestión de Usuarios", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn {
            items(users) { user ->
                UserItem(
                    user = user,
                    onEdit = { userToEdit = user },
                    onDelete = { userToDelete = user },
                    onApprove = {
                        viewModel.updateUser(user.copy(role = UserRole.OPERARIO))
                    }
                )
                HorizontalDivider()
            }
        }
    }

    if (userToEdit != null) {
        EditUserDialog(
            user = userToEdit!!,
            onDismiss = { userToEdit = null },
            onConfirm = { updatedUser ->
                viewModel.updateUser(updatedUser)
                userToEdit = null
            }
        )
    }

    if (userToDelete != null) {
        AlertDialog(
            onDismissRequest = { userToDelete = null },
            title = { Text("Eliminar Usuario") },
            text = { Text("¿Estás seguro de que deseas eliminar a ${userToDelete?.fullName}? Esta acción no se puede deshacer.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteUser(userToDelete!!.id)
                        userToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { userToDelete = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun UserItem(user: User, onEdit: () -> Unit, onDelete: () -> Unit, onApprove: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = user.fullName, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(text = user.email, color = Color.Gray, fontSize = 14.sp)
            Text(
                text = user.role.name,
                color = when(user.role) {
                    UserRole.ADMIN -> Color.Red
                    UserRole.OPERARIO -> Color(0xFF4CAF50)
                    UserRole.PENDIENTE -> Color.Gray
                },
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Row {
            if (user.role == UserRole.PENDIENTE) {
                IconButton(onClick = onApprove) {
                    Icon(Icons.Default.Check, contentDescription = "Aprobar", tint = Color(0xFF4CAF50))
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "Editar")
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color.Red)
            }
        }
    }
}

@Composable
fun EditUserDialog(
    user: User,
    onDismiss: () -> Unit,
    onConfirm: (User) -> Unit
) {
    var fullName by remember { mutableStateOf(user.fullName) }
    var role by remember { mutableStateOf(user.role) }
    var expanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editar Usuario") },
        text = {
            Column {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Nombre Completo") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(text = "Rol", fontWeight = FontWeight.Bold)
                Box {
                    OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(role.name)
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        UserRole.entries.forEach { roleOption ->
                            DropdownMenuItem(
                                text = { Text(roleOption.name) },
                                onClick = {
                                    role = roleOption
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                onConfirm(user.copy(fullName = fullName, role = role))
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
