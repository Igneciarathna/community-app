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
