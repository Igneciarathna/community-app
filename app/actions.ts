"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";

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
    console.log(`\n\n==========================================`);
    console.log(`🔐 OTP Generated for ${email}: ${otp}`);
    console.log(`==========================================\n\n`);

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
      likedBy: true,
    },
  });

  return posts.map((post: any) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: (post.updatedAt || post.createdAt).toISOString(),
  }));
}

export async function submitPost(content: string, image: string | undefined | null) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("You must be logged in to post.");
  }

  const authorId = (session.user as any).id;

  if (!authorId) {
    throw new Error("User ID not found in session.");
  }

  const post = await prisma.post.create({
    data: {
      content,
      image: image || null,
      authorId,
    },
    include: {
      author: true,
      likedBy: true,
    }
  });

  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: ((post as any).updatedAt || post.createdAt).toISOString(),
  };
}

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: "You must be logged in to delete a post." };
  }

  const userId = (session.user as any).id;

  try {
    // Check if the post exists and belongs to the user
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return { success: false, error: "Post not found." };
    }

    if (post.authorId !== userId) {
      return { success: false, error: "You are not authorized to delete this post." };
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Delete Post Error:", err);
    return { success: false, error: "Failed to delete post." };
  }
}

export async function updatePost(postId: string, content: string, image?: string | null) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: "You must be logged in to edit a post." };
  }

  const userId = (session.user as any).id;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return { success: false, error: "Post not found." };
    }

    if (post.authorId !== userId) {
      return { success: false, error: "You are not authorized to edit this post." };
    }

    const dataToUpdate: any = { content };
    if (image !== undefined) {
      dataToUpdate.image = image;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: dataToUpdate,
      include: {
        author: true,
        likedBy: true,
      },
    });

    return {
      success: true,
      post: {
        ...updatedPost,
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: ((updatedPost as any).updatedAt || updatedPost.createdAt).toISOString(),
      }
    };
  } catch (err: any) {
    console.error("Update Post Error:", err);
    return { success: false, error: "Failed to update post." };
  }
}

export async function updateProfileImage(image: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: "You must be logged in." };
  }

  const userId = (session.user as any).id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { image },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Update Profile Image Error:", err);
    return { success: false, error: "Failed to update profile image." };
  }
}

export async function updateProfileName(name: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: "You must be logged in." };
  }

  const userId = (session.user as any).id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Update Profile Name Error:", err);
    return { success: false, error: "Failed to update profile name." };
  }
}

export async function toggleLike(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const userId = (session.user as any).id;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return { success: false, error: "Post not found" };

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.post.update({ where: { id: postId }, data: { likes: { decrement: 1 } } }),
      ]);
      return { success: true, liked: false };
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({ data: { userId, postId } }),
        prisma.post.update({ where: { id: postId }, data: { likes: { increment: 1 } } }),
      ]);

      // Create notification if liking someone else's post
      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            actorId: userId,
            postId: postId,
            type: "LIKE",
          },
        });
      }

      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return { success: false, error: "Failed to toggle like" };
  }
}

export async function fetchComments(postId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { name: true, image: true } },
      },
    });
    return comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return [];
  }
}

export async function submitComment(postId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;

  try {
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content,
      },
      include: {
        author: { select: { name: true, image: true } },
      }
    });

    // Update post comment count
    await prisma.post.update({
      where: { id: postId },
      data: { comments: { increment: 1 } },
    });

    // Create notification if commenting on someone else's post
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: userId,
          postId: postId,
          type: "COMMENT",
        },
      });
    }

    return {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Failed to submit comment:", error);
    throw new Error("Failed to submit comment");
  }
}

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  const userId = (session.user as any).id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, image: true } },
      },
      take: 20,
    });
    return notifications.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

export async function markNotificationsAsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false };
  const userId = (session.user as any).id;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
