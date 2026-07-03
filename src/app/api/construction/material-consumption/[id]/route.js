import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialConsumption from "@/models/contruction/MaterialConsumption";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Auth helpers (same as above)

export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const record = await MaterialConsumption.findOne({ _id: params.id, companyId: user.companyId })
      .populate("project", "name")
      .populate("workOrderId", "workOrderNumber")
      .populate("createdBy", "name")
      .lean();
    if (!record) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    // Prevent updating company and createdBy
    delete body.company;
    delete body.createdBy;

    const updated = await MaterialConsumption.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { ...body },
      { new: true, runValidators: true }
    )
      .populate("project", "name")
      .populate("workOrderId", "workOrderNumber");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await MaterialConsumption.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}