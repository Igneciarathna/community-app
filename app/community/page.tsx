"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchPosts, submitPost, deletePost } from "../actions";

type Post = {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  image?: string | null;
  authorId: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    email: string;
  };
};

export default function CommunityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState({
    name: "",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
    id: "",
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        name: session.user.name || "User",
        avatar: session.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.name}`,
        id: (session.user as any).id || "",
      });
    }

    // Connect to database to fetch the feed
    fetchPosts()
      .then(data => {
        setPosts(data as unknown as Post[]);
      })
      .catch(console.error);
  }, [session]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) {
      alert("You must be logged in to post.");
      return;
    }
    if (!newPostContent.trim() && !selectedImage) return;

    try {
      const savedPost = await submitPost(newPostContent, selectedImage, currentUser.id);
      setPosts([savedPost as unknown as Post, ...posts]);
      setNewPostContent("");
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert("Oh no! Failed to write to the neon database.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const result = await deletePost(postId);
      if (result.success) {
        setPosts(posts.filter(p => p.id !== postId));
        setActiveMenuId(null);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-12">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <span className="font-bold text-zinc-900 tracking-tight">CommunityHub</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex relative">
              <input
                type="text"
                placeholder="Search posts..."
                className="w-64 bg-zinc-100 border border-zinc-200 rounded-full py-1.5 pl-9 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-zinc-500 transition-all font-medium"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>

            <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors overflow-hidden ring-2 ring-white hover:ring-zinc-100 shadow-sm">
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 mt-8 flex flex-col gap-8">

        {/* Create Post Section */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] pointer-events-none"></div>

          <form onSubmit={handleCreatePost} className="relative z-10">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 shadow-sm">
                  <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-grow">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share what's on your mind..."
                  rows={3}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none shadow-inner text-sm md:text-base leading-relaxed"
                />
              </div>
            </div>

            {selectedImage && (
              <div className="relative mt-3 inline-block ml-14">
                <img src={selectedImage} alt="Preview" className="h-32 object-contain rounded-lg border border-zinc-200 shadow-sm bg-zinc-50" />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 hover:bg-zinc-700 shadow-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100">
              <div className="flex gap-2 ml-14">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Add Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                </button>
                <button type="button" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Video">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                </button>
              </div>
              <button
                type="submit"
                disabled={(!newPostContent.trim() && !selectedImage) || !currentUser.id}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-medium py-2 px-6 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:shadow-none shadow-indigo-600/20 text-sm"
              >
                Post
              </button>
            </div>
          </form>
        </section>

        {/* Feed Timeline */}
        <section className="flex flex-col gap-5 pb-10">
          <div className="flex items-center gap-3 w-full">
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Recent Activity</h2>
            <div className="flex-1 h-px bg-zinc-200 rounded"></div>
          </div>

          {posts.map((post) => (
            <article key={post.id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <img src={post.author.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`} alt={post.author.name} className="w-11 h-11 rounded-full border border-zinc-200 flex-shrink-0 shadow-sm" />
                  <div>
                    <h3 className="font-semibold text-zinc-900">{post.author.name}</h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' }).format(new Date(post.createdAt))}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                    title="Options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                  </button>

                  {activeMenuId === post.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 py-1 animate-in fade-in zoom-in duration-200">
                      {currentUser.id === post.authorId ? (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium text-left"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                          Delete Post
                        </button>
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500 italic">No options available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-zinc-700 text-sm md:text-base leading-relaxed break-words">
                {post.content}
                {post.image && (
                  <div className="mt-3 mb-1">
                    <img src={post.image} alt="Post Attachment" className="w-full h-auto max-h-[700px] object-contain rounded-xl border border-zinc-200 bg-zinc-50" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                <div className="flex gap-1.5 md:gap-4">
                  <button className="group flex items-center gap-2 text-zinc-500 hover:text-rose-500 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-rose-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:fill-rose-500/20"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                    <span>{post.likes}</span>
                    <span className="hidden sm:inline">Likes</span>
                  </button>
                  <button className="group flex items-center gap-2 text-zinc-500 hover:text-indigo-600 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:fill-indigo-600/20"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    <span>{post.comments}</span>
                    <span className="hidden sm:inline">Comments</span>
                  </button>
                  <button className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-500 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>
            </article>
          ))}

          {posts.length === 0 && (
            <div className="text-center py-10 bg-white border border-zinc-200 rounded-2xl">
              <div className="mx-auto w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-1">No posts yet</h3>
              <p className="text-zinc-500 text-sm">Be the first to share something with the community!</p>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
