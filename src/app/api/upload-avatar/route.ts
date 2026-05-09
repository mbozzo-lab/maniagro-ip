import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";

// Note: filesystem writes work locally and on VPS/Docker deployments.
// For Vercel serverless, use Vercel Blob (@vercel/blob) instead.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type.split("/")[1] ?? "jpg";
    const slug = session.user.email?.split("@")[0] ?? session.user.id;
    const uniqueName = `avatar-${slug}-${Date.now()}.${ext}`;
    const dir = join(process.cwd(), "public", "avatars");

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, uniqueName), buffer);

    const avatarUrl = `/avatars/${uniqueName}`;

    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, profilePicture: avatarUrl },
      update: { profilePicture: avatarUrl },
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
