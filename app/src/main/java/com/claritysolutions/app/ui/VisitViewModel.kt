package com.claritysolutions.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.claritysolutions.app.data.repository.FirebaseRepository
import com.claritysolutions.app.model.Pool
import com.claritysolutions.app.model.Visit
import com.claritysolutions.app.model.User
import com.claritysolutions.app.model.UserRole
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class VisitViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = FirebaseRepository()
    private val auth = FirebaseAuth.getInstance()
    private val context = application.applicationContext
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _allVisits = MutableStateFlow<List<Visit>>(emptyList())
    val allVisits: StateFlow<List<Visit>> = _allVisits.asStateFlow()

    private val _allPools = MutableStateFlow<List<Pool>>(emptyList())
    val allPools: StateFlow<List<Pool>> = _allPools.asStateFlow()

    private val _allUsers = MutableStateFlow<List<User>>(emptyList())
    val allUsers: StateFlow<List<User>> = _allUsers.asStateFlow()

    init {
        checkPersistedUser()
        
        viewModelScope.launch {
            repository.seedUsers()
        }

        viewModelScope.launch {
            repository.getVisitsFlow().collectLatest { _allVisits.value = it }
        }

        viewModelScope.launch {
            repository.getPoolsFlow().collectLatest { _allPools.value = it }
        }

        viewModelScope.launch {
            repository.getUsersFlow().collectLatest { _allUsers.value = it }
        }
    }

    private fun checkPersistedUser() {
        val firebaseUser = auth.currentUser
        if (firebaseUser != null) {
            viewModelScope.launch {
                val user = repository.getUserById(firebaseUser.uid)
                if (user != null) {
                    _currentUser.value = user
                } else {
                    logout()
                }
            }
        }
    }

    fun login(email: String, password: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            // Intento de login manual contra Firestore (para las cuentas de prueba sembradas)
            val manualUser = repository.login(email, password)
            if (manualUser != null) {
                _currentUser.value = manualUser
                onResult(true)
                return@launch
            }

            // Si no es una cuenta manual, intentamos con Firebase Auth normal
            try {
                auth.signInWithEmailAndPassword(email, password)
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            val firebaseUser = auth.currentUser
                            if (firebaseUser != null) {
                                viewModelScope.launch {
                                    val user = repository.getUserById(firebaseUser.uid)
                                    _currentUser.value = user
                                    onResult(user != null)
                                }
                            } else {
                                onResult(false)
                            }
                        } else {
                            onResult(false)
                        }
                    }
            } catch (e: Exception) {
                onResult(false)
            }
        }
    }

    fun onGoogleLoginSuccess(firebaseUserId: String, email: String, name: String) {
        viewModelScope.launch {
            var user = repository.getUserById(firebaseUserId)
            if (user == null) {
                user = User(
                    id = firebaseUserId,
                    fullName = name,
                    email = email,
                    role = UserRole.PENDIENTE
                )
                repository.createUser(user)
            }
            _currentUser.value = user
        }
    }

    fun logout() {
        // 1. Cerrar sesión en Firebase Auth
        auth.signOut()
        
        // 2. Cerrar sesión en Google Sign-In para que permita elegir cuenta de nuevo
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).build()
        val googleSignInClient = GoogleSignIn.getClient(context, gso)
        googleSignInClient.signOut().addOnCompleteListener {
            // 3. Limpiar el estado local
            _currentUser.value = null
        }
    }

    fun insertVisit(visit: Visit) = viewModelScope.launch {
        repository.insertVisit(visit)
    }

    fun updateVisit(visit: Visit) = viewModelScope.launch {
        repository.updateVisit(visit)
    }

    suspend fun uploadImage(file: java.io.File): String {
        return repository.uploadImage(file)
    }

    fun deleteVisit(visitId: String) = viewModelScope.launch {
        repository.deleteVisit(visitId)
    }

    fun insertPool(pool: Pool) = viewModelScope.launch {
        repository.insertPool(pool)
    }

    fun updatePool(pool: Pool) = viewModelScope.launch {
        repository.updatePool(pool)
    }

    fun deletePool(poolId: String) = viewModelScope.launch {
        repository.deletePool(poolId)
    }

    fun updateUser(user: User) = viewModelScope.launch {
        repository.updateUser(user)
    }

    fun deleteUser(userId: String) = viewModelScope.launch {
        repository.deleteUser(userId)
    }
}
