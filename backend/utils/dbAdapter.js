const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { getMemoryStore } = require("../controllers/importController");

exports.exportDatabaseToPayload = async (workspaceId, appointmentDate, targetIds = null) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  let appointmentsToExport = [];

  if (isDbConnected) {
    const filter = {
      workspaceId,
      reminderSelected: true
    };
    if (appointmentDate) filter.appointmentDate = appointmentDate;
    if (targetIds && targetIds.length > 0) filter._id = { $in: targetIds };

    const records = await Appointment.find(filter)
      .populate("patientId", "firstName lastName fullName phone")
      .sort({ appointmentTime: 1 });

    appointmentsToExport = records.map((a) => ({
      appointmentId: a._id.toString(),
      patientId: a.patientId ? a.patientId._id.toString() : "",
      patient_name: a.patientId ? a.patientId.fullName : "",
      phone: a.patientId ? a.patientId.phone : "",
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
      provider: a.provider || ""
    }));
  } else {
    const memStore = getMemoryStore();
    let records = memStore.appointments.filter(a => 
      a.workspaceId.toString() === workspaceId.toString() && a.reminderSelected
    );
    if (appointmentDate) records = records.filter(a => a.appointmentDate === appointmentDate);
    if (targetIds && targetIds.length > 0) records = records.filter(a => targetIds.includes(a._id));

    appointmentsToExport = records.map((a) => ({
      appointmentId: a._id.toString(),
      patientId: a.patientId ? a.patientId.toString() : "",
      patient_name: a.patientName || "",
      phone: a.phone || "",
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
      provider: a.provider || ""
    }));
  }

  // Create temporary CSV file for main.py execution
  const rootDir = path.resolve(__dirname, "../../");
  const tempDir = path.join(rootDir, "data");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const csvPath = path.join(tempDir, `temp_run_${Date.now()}.csv`);
  let csvContent = "patient_name,phone,appointment_date,appointment_time\n";

  for (const item of appointmentsToExport) {
    const nameFormatted = `"${item.patient_name.replace(/"/g, '""')}"`;
    csvContent += `${nameFormatted},${item.phone},${item.appointment_date},${item.appointment_time}\n`;
  }

  fs.writeFileSync(csvPath, csvContent, "utf-8");

  return {
    csvPath,
    count: appointmentsToExport.length,
    items: appointmentsToExport
  };
};
