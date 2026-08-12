import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";
import { getMercadoPagoConfig } from "@/lib/mercadopago";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id");
  const appointmentId = searchParams.get("appointment_id");

  const sql = getDb();
  let dbAppointment: any = null;

  if (sql && appointmentId) {
    try {
      await ensureTablesExist(sql);
      const rows = await sql`SELECT * FROM appointments WHERE id = ${Number(appointmentId)} LIMIT 1`;
      if (rows && rows.length > 0) {
        dbAppointment = rows[0];
      }
    } catch (err) {
      console.error("Error reading appointment for MP status:", err);
    }
  }

  const effectivePaymentId = paymentId || dbAppointment?.mp_payment_id;

  if (!effectivePaymentId) {
    return NextResponse.json({ 
      status: dbAppointment?.payment_status || "pending",
      mpStatus: dbAppointment?.mp_status || "pending",
      isPaid: dbAppointment?.payment_status?.includes("paid")
    });
  }

  const simulate = searchParams.get("simulate") === "true";
  if (simulate && sql && appointmentId) {
    try {
      await sql`
        UPDATE appointments 
        SET payment_status = 'paid_pix',
            mp_status = 'approved',
            status = 'confirmed'
        WHERE id = ${Number(appointmentId)}
      `;
      return NextResponse.json({
        status: "paid_pix",
        mpStatus: "approved",
        isPaid: true,
        isSimulated: true
      });
    } catch (err) {
      console.error("Error simulating payment approval:", err);
    }
  }

  const config = await getMercadoPagoConfig();

  // Handle simulated payments
  if (effectivePaymentId.startsWith("PIX_SIM_") || effectivePaymentId.startsWith("CARD_SIM_") || !config.accessToken) {
    const isPaid = dbAppointment?.payment_status?.includes("paid") || false;
    return NextResponse.json({
      status: dbAppointment?.payment_status || "pending",
      mpStatus: isPaid ? "approved" : "pending",
      isPaid,
      isSimulated: true
    });
  }

  try {
    // Fetch real status from Mercado Pago REST API v1
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${effectivePaymentId}`, {
      headers: {
        "Authorization": `Bearer ${config.accessToken}`
      }
    });

    if (!mpRes.ok) {
      return NextResponse.json({
        status: dbAppointment?.payment_status || "pending",
        mpStatus: dbAppointment?.mp_status || "pending",
        isPaid: dbAppointment?.payment_status?.includes("paid")
      });
    }

    const mpData = await mpRes.json();
    const mpStatus = mpData.status; // approved, pending, in_process, rejected, refunded, cancelled
    const paymentMethodId = mpData.payment_method_id; // pix, visa, master, etc.

    let isPaid = mpStatus === "approved";
    let updatedPaymentStatus = dbAppointment?.payment_status || "pending";

    if (isPaid) {
      if (paymentMethodId === "pix" || dbAppointment?.mp_payment_method === "pix") {
        updatedPaymentStatus = "paid_pix";
      } else {
        updatedPaymentStatus = "paid_credit";
      }
    } else if (mpStatus === "refunded") {
      updatedPaymentStatus = "refunded";
    } else if (mpStatus === "cancelled" || mpStatus === "rejected") {
      updatedPaymentStatus = "cancelled";
    }

    // Auto-update DB if status changed
    if (sql && dbAppointment && (dbAppointment.payment_status !== updatedPaymentStatus || dbAppointment.mp_status !== mpStatus)) {
      try {
        await sql`
          UPDATE appointments 
          SET mp_status = ${mpStatus},
              payment_status = ${updatedPaymentStatus},
              status = ${isPaid && config.autoConfirm ? 'confirmed' : dbAppointment.status}
          WHERE id = ${Number(dbAppointment.id)}
        `;
      } catch (dbErr) {
        console.error("Error updating appointment payment status from MP API:", dbErr);
      }
    }

    return NextResponse.json({
      paymentId: effectivePaymentId,
      status: updatedPaymentStatus,
      mpStatus,
      isPaid,
      statusDetail: mpData.status_detail,
      dateApproved: mpData.date_approved
    });

  } catch (error: any) {
    console.error("Error checking MP status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
