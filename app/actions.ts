"use server";

import { prisma } from "@/lib/prisma";

export async function authenticateUser(email: string) {
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const name = email.split('@')[0] || "User";
    user = await prisma.user.create({
      data: {
        email,
        name: name,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      },
    });
  }

  return user;
}

export async function generateOtp(email: string) {
  try {
    // Generate a 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Cleanup any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Store the new OTP in the db with a 10 min expiration
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      },
    });

    // For development without an email provider setup yet, we log it
    // console.log(`\n\n==========================================`);
    // console.log(`🔐 OTP Generated for ${email}: ${otp}`);
    // console.log(`==========================================\n\n`);

    return { success: true, otp };
  } catch (err: any) {
    console.error("OTP Generation Error:", err);
    return { success: false, error: err.message || "Failed to access database in server action." };
  }
}

export async function fetchPosts() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
    },
  });

  return posts.map((post: any) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
  }));
}

export async function submitPost(content: string, image: string | undefined | null, authorId: string) {
  const post = await prisma.post.create({
    data: {
      content,
      image: image || null,
      authorId,
    },
    include: {
      author: true,
    }
  });

  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
  };
}
