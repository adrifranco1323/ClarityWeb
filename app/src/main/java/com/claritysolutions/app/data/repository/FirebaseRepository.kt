package com.claritysolutions.app.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.claritysolutions.app.model.Pool
import com.claritysolutions.app.model.Visit
import com.claritysolutions.app.model.User
import com.claritysolutions.app.model.UserRole
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.io.File
import android.net.Uri

class FirebaseRepository {
    private val db = FirebaseFirestore.getInstance()
    private val poolsCollection = db.collection("pools")
    private val visitsCollection = db.collection("visits")
    private val usersCollection = db.collection("users")

    suspend fun uploadImage(file: File): String {
        if (!file.exists()) throw Exception("El archivo no existe")
        
        val bucket = "claritydb-fa027.firebasestorage.app"
        val fileName = "visits/${System.currentTimeMillis()}_${file.name}"
        
        // Intentamos con el bucket específico del screenshot
        val storageRef = FirebaseStorage.getInstance("gs://$bucket").reference
        val imageRef = storageRef.child(fileName)
        
        try {
            val data = file.readBytes()
            imageRef.putBytes(data).await()
            return imageRef.downloadUrl.await().toString()
        } catch (e: Exception) {
            // Si falla, intentamos con el bucket por defecto por si acaso
            return try {
                val defaultRef = FirebaseStorage.getInstance().reference.child(fileName)
                defaultRef.putBytes(file.readBytes()).await()
                defaultRef.downloadUrl.await().toString()
            } catch (e2: Exception) {
                throw Exception("Error final de Storage: ${e.message}")
            }
        }
    }

    fun getPoolsFlow(): Flow<List<Pool>> = callbackFlow {
        val listener = poolsCollection.orderBy("name", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                if (snapshot != null) {
                    trySend(snapshot.toObjects(Pool::class.java))
                }
            }
        awaitClose { listener.remove() }
    }

    fun getVisitsFlow(): Flow<List<Visit>> = callbackFlow {
        val listener = visitsCollection.orderBy("fecha", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                if (snapshot != null) {
                    trySend(snapshot.toObjects(Visit::class.java))
                }
            }
        awaitClose { listener.remove() }
    }

    fun getUsersFlow(): Flow<List<User>> = callbackFlow {
        val listener = usersCollection.orderBy("fullName", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                if (snapshot != null) {
                    trySend(snapshot.toObjects(User::class.java))
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun getAllPools(): List<Pool> {
        return try {
            poolsCollection.orderBy("name", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(Pool::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun insertPool(pool: Pool) {
        poolsCollection.document(pool.id).set(pool).await()
    }

    suspend fun updatePool(pool: Pool) {
        poolsCollection.document(pool.id).set(pool).await()
    }

    suspend fun deletePool(poolId: String) {
        poolsCollection.document(poolId).delete().await()
    }

    suspend fun getAllVisits(): List<Visit> {
        return try {
            visitsCollection.orderBy("fecha", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(Visit::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun insertVisit(visit: Visit) {
        visitsCollection.document(visit.id).set(visit).await()
    }

    suspend fun updateVisit(visit: Visit) {
        visitsCollection.document(visit.id).set(visit).await()
    }

    suspend fun deleteVisit(visitId: String) {
        visitsCollection.document(visitId).delete().await()
    }

    suspend fun getUserById(userId: String): User? {
        return try {
            usersCollection.document(userId).get().await().toObject(User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun createUser(user: User) {
        usersCollection.document(user.id).set(user).await()
    }

    suspend fun getAllUsers(): List<User> {
        return try {
            usersCollection.orderBy("fullName", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(User::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun updateUser(user: User) {
        usersCollection.document(user.id).set(user).await()
    }

    suspend fun deleteUser(userId: String) {
        usersCollection.document(userId).delete().await()
    }

    suspend fun login(email: String, password: String): User? {
        return try {
            val result = usersCollection
                .whereEqualTo("email", email)
                .whereEqualTo("password", password)
                .get()
                .await()
            
            if (!result.isEmpty) {
                result.documents[0].toObject(User::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun seedUsers() {
        // En producción no usaríamos contraseñas en plano así,
        // pero para este proyecto sembramos perfiles en Firestore
        val admin = User(id = "1", fullName = "Admin User", email = "admin@clarity.com", password = "admin123", role = UserRole.ADMIN)
        val operario = User(id = "2", fullName = "Operario User", email = "operario@clarity.com", password = "ope123", role = UserRole.OPERARIO)
        
        usersCollection.document(admin.id).set(admin).await()
        usersCollection.document(operario.id).set(operario).await()
    }
}
