package com.cadentra.app

import androidx.activity.result.contract.ActivityResultContract
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )
    private lateinit var permissionContract: ActivityResultContract<Set<String>, Set<String>>

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) return call.reject("Health Connect is unavailable")
        permissionContract = PermissionController.createRequestPermissionResultContract()
        startActivityForResult(call, permissionContract.createIntent(context, permissions), "permissionResult")
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall, result: androidx.activity.result.ActivityResult) {
        val granted = permissionContract.parseResult(result.resultCode, result.data)
        call.resolve(JSObject().put("granted", granted.containsAll(permissions)))
    }

    @PluginMethod
    fun readDailyAggregate(call: PluginCall) {
        val localDate = call.getString("localDate") ?: return call.reject("localDate is required")
        val timeZone = call.getString("timeZone") ?: ZoneId.systemDefault().id
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                if (!client.permissionController.getGrantedPermissions().containsAll(permissions)) throw IllegalStateException("Health Connect permissions are not granted")
                val zone = ZoneId.of(timeZone)
                val start = LocalDate.parse(localDate).atStartOfDay(zone).toInstant()
                val end = LocalDate.parse(localDate).plusDays(1).atStartOfDay(zone).toInstant()
                val filter = TimeRangeFilter.between(start, end)
                val steps = client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), filter))[StepsRecord.COUNT_TOTAL] ?: 0L
                val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, filter)).records.sumOf { Duration.between(maxOf(it.startTime, start), minOf(it.endTime, end)).toMinutes() }
                val exercise = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, filter)).records.sumOf { Duration.between(maxOf(it.startTime, start), minOf(it.endTime, end)).toMinutes() }
                call.resolve(JSObject().put("localDate", localDate).put("steps", steps).put("sleepMinutes", sleep).put("exerciseMinutes", exercise))
            } catch (error: Exception) { call.reject(error.message ?: "Health Connect read failed", error) }
        }
    }
}
