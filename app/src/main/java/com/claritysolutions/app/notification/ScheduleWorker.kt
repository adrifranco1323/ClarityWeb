package com.claritysolutions.app.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.claritysolutions.app.data.repository.FirebaseRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.DayOfWeek
import java.time.LocalDate
import java.util.concurrent.TimeUnit

class ScheduleWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val today = LocalDate.now().dayOfWeek.value
        val repository = FirebaseRepository()
        val pools = repository.getAllPools()
        
        val poolsToday = pools.filter { it.scheduledDays.contains(today) }
        
        if (poolsToday.isNotEmpty()) {
            sendNotification(
                "Visitas de hoy",
                "Tienes ${poolsToday.size} piscinas agendadas para hoy."
            )
        }
        
        Result.success()
    }

    private fun sendNotification(title: String, message: String) {
        val channelId = "clarity_schedule"
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val channel = NotificationChannel(channelId, "Schedule Notifications", NotificationManager.IMPORTANCE_DEFAULT)
        notificationManager.createNotificationChannel(channel)
        
        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
            
        notificationManager.notify(1, notification)
    }

    companion object {
        fun setupPeriodicWork(context: Context) {
            val workRequest = PeriodicWorkRequestBuilder<ScheduleWorker>(1, TimeUnit.DAYS)
                .setInitialDelay(calculateDelay(), TimeUnit.MILLISECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "daily_schedule_notification",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
        }

        private fun calculateDelay(): Long {
            val now = java.util.Calendar.getInstance()
            val target = java.util.Calendar.getInstance().apply {
                set(java.util.Calendar.HOUR_OF_DAY, 6)
                set(java.util.Calendar.MINUTE, 45)
                set(java.util.Calendar.SECOND, 0)
            }
            
            if (now.after(target)) {
                target.add(java.util.Calendar.DAY_OF_YEAR, 1)
            }
            
            return target.timeInMillis - now.timeInMillis
        }
    }
}
