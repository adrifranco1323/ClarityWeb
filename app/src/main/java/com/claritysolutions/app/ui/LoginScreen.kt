package com.claritysolutions.app.ui

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.GoogleAuthProvider

@Composable
fun LoginScreen(viewModel: VisitViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    // Configuración de Google Sign-In
    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("1011906710854-brobcs4r07amm550i8tlkhafhghv68ma.apps.googleusercontent.com") // REEMPLAZAR CON TU WEB CLIENT ID
            .requestEmail()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                val credential = GoogleAuthProvider.getCredential(account.idToken, null)
                com.google.firebase.auth.FirebaseAuth.getInstance().signInWithCredential(credential)
                    .addOnCompleteListener { authResult ->
                        if (authResult.isSuccessful) {
                            val user = authResult.result?.user
                            if (user != null) {
                                viewModel.onGoogleLoginSuccess(
                                    user.uid,
                                    user.email ?: "",
                                    user.displayName ?: "Usuario Google"
                                )
                            }
                        } else {
                            errorMessage = "Error al autenticar con Firebase"
                        }
                    }
            } catch (e: ApiException) {
                errorMessage = "Error de Google: ${e.message}"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("CLARITY SOLUTIONS", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Correo Electrónico") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Contraseña") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        
        if (errorMessage != null) {
            Text(errorMessage!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = {
                viewModel.login(email, password) { success ->
                    if (!success) {
                        errorMessage = "Credenciales incorrectas"
                    }
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Iniciar Sesión")
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        OutlinedButton(
            onClick = { launcher.launch(googleSignInClient.signInIntent) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continuar con Google")
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        Text("Admin: admin@clarity.com / admin123", fontSize = 12.sp)
        Text("Operario: operario@clarity.com / ope123", fontSize = 12.sp)
    }
}
