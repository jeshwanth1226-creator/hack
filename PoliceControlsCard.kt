package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.GppGood
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.EmergencyStatus
import com.example.ui.theme.CommandBorder
import com.example.ui.theme.EmergencyAmber
import com.example.ui.theme.EmergencyAmberBg
import com.example.ui.theme.EmergencyAmberDark
import com.example.ui.theme.EmergencyRed
import com.example.ui.theme.EmergencyRedBg
import com.example.ui.theme.EmergencyRedDark
import com.example.ui.theme.GreenWaveBg
import com.example.ui.theme.GreenWaveEmerald
import com.example.ui.theme.LavenderBorder
import com.example.ui.theme.LavenderCardBg
import com.example.ui.theme.LavenderPillBg
import com.example.ui.theme.LavenderPrimary
import com.example.ui.theme.LavenderSurfaceHighlight
import com.example.ui.theme.LavenderSurfaceVariant
import com.example.ui.theme.PoliceCyan
import com.example.ui.theme.PoliceCyanBg
import com.example.ui.theme.TextDeepPurple
import com.example.ui.theme.TextGrayLight
import com.example.ui.theme.TextGrayMuted

@Composable
fun PoliceControlsCard(
    emergencyStatus: EmergencyStatus,
    policeAvailable: Boolean,
    onApproveGreenWave: () -> Unit,
    onRejectEmergency: () -> Unit,
    onTriggerBlockage: () -> Unit,
    onNewEmergency: () -> Unit,
    onNormalAmbulance: () -> Unit,
    onCancelEmergency: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("police_controls_card"),
        colors = CardDefaults.cardColors(containerColor = LavenderCardBg),
        shape = RoundedCornerShape(16.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(LavenderBorder))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(LavenderPillBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.GppGood,
                            contentDescription = "Police Controls",
                            tint = LavenderPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "POLICE DISPATCH CONTROLS",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = TextDeepPurple,
                        letterSpacing = 0.3.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (policeAvailable) GreenWaveBg else EmergencyAmberBg)
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = if (policeAvailable) "OPERATOR ONLINE" else "AUTO-PILOT FAILOVER",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (policeAvailable) GreenWaveEmerald else EmergencyAmberDark
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onApproveGreenWave,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .testTag("approve_green_wave_button"),
                    enabled = policeAvailable,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GreenWaveEmerald,
                        contentColor = Color.White,
                        disabledContainerColor = GreenWaveBg,
                        disabledContentColor = TextGrayMuted
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Approve",
                            tint = if (policeAvailable) Color.White else TextGrayMuted,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "APPROVE GREEN WAVE",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }
                }

                Button(
                    onClick = onRejectEmergency,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .testTag("reject_button"),
                    enabled = policeAvailable,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = EmergencyRed,
                        contentColor = Color.White,
                        disabledContainerColor = EmergencyRedBg,
                        disabledContentColor = TextGrayMuted
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Clear,
                            contentDescription = "Reject",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "REJECT",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            Divider(color = LavenderBorder.copy(alpha = 0.7f))
            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "OPERATIONAL & INCIDENT TRIGGERS",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = TextGrayMuted
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onTriggerBlockage,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .testTag("trigger_road_blockage_button"),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = EmergencyAmberBg,
                        contentColor = EmergencyAmberDark
                    ),
                    border = BorderStroke(1.dp, EmergencyAmber.copy(alpha = 0.5f))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Road Blockage",
                            tint = EmergencyAmberDark,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Block Road",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                OutlinedButton(
                    onClick = onNewEmergency,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .testTag("trigger_new_emergency_button"),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = PoliceCyanBg,
                        contentColor = PoliceCyan
                    ),
                    border = BorderStroke(1.dp, PoliceCyan.copy(alpha = 0.5f))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocalHospital,
                            contentDescription = "New Call",
                            tint = PoliceCyan,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "New Call",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                OutlinedButton(
                    onClick = onCancelEmergency,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .testTag("cancel_emergency_button"),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = LavenderSurfaceVariant,
                        contentColor = TextGrayLight
                    ),
                    border = BorderStroke(1.dp, LavenderBorder)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Block,
                            contentDescription = "Cancel",
                            tint = TextGrayLight,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Cancel",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
