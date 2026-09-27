import { NextResponse } from "next/server";
import { teachers } from "@/lib/content";

export async function GET() {
  return NextResponse.json({
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      subject: teacher.subject,
      persona: teacher.persona,
      mvpEnabled: teacher.mvpEnabled,
      imageStatus: teacher.imageStatus,
    })),
  });
}
