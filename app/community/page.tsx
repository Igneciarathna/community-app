"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { fetchPosts, submitPost, deletePost, updatePost, updateProfileImage, updateProfileName, toggleLike, getNotifications, markNotificationsAsRead, fetchComments, submitComment } from "../actions";
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

type Post = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  comments: number;
  images: { id: string; url: string }[];
  image?: string | null;
  authorId: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    email: string;
  };
  likedBy: { userId: string }[];
};

export default function CommunityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState({
    name: "",
    email: "",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
    id: "",
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isUpdatingProfileImage, setIsUpdatingProfileImage] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    if (status === "authenticated") {
      // Fetch notifications
      getNotifications().then(data => setNotifications(data));
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        name: session.user.name || "User",
        email: session.user.email || "",
        avatar: session.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.name}`,
        id: (session.user as any).id || "",
      });
    }

    // Connect to database to fetch the feed
    setIsPageLoading(true);
    fetchPosts()
      .then(data => {
        setPosts(data as unknown as Post[]);
      })
      .catch(console.error)
      .finally(() => setIsPageLoading(false));
  }, [session]);

  // Click outside to close the options menu and profile card
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest(".options-menu-container")) {
        setActiveMenuId(null);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsContainerRef.current && !notificationsContainerRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId, isProfileOpen]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setIsProfileOpen(false); // Close profile card while cropping
        
        // Reset file input so same file can be selected again
        if (profileImageInputRef.current) {
          profileImageInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    
    setIsCropping(true);
    try {
      const croppedBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      
      setCurrentUser(prev => ({ ...prev, avatar: croppedBase64 }));
      
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.authorId === currentUser.id) {
          return { ...post, author: { ...post.author, image: croppedBase64 } };
        }
        return post;
      }));

      await updateProfileImage(croppedBase64);
      setCropImageSrc(null);
    } catch (err) {
      console.error("Failed to save cropped image", err);
    } finally {
      setIsCropping(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || editName === currentUser.name) {
      setIsEditingName(false);
      return;
    }

    setIsUpdatingName(true);
    try {
      const result = await updateProfileName(editName);
      if (result.success) {
        setCurrentUser(prev => ({ ...prev, name: editName }));
        // Also update posts where this user is the author locally
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.authorId === currentUser.id) {
            return { ...post, author: { ...post.author, name: editName } };
          }
          return post;
        }));
        setIsEditingName(false);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update name.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) {
      alert("You must be logged in to post.");
      return;
    }
    if (!newPostContent.trim() && selectedImages.length === 0) return;

    setIsCreatingPost(true);
    try {
      const savedPost = await submitPost(newPostContent, selectedImages);
      setPosts([savedPost as unknown as Post, ...posts]);
      setNewPostContent("");
      setSelectedImages([]);
    } catch (err) {
      console.error(err);
      alert("Oh no! Failed to write to the neon database.");
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setDeletingPostId(postId);
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
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleOpenComments = async (postId: string) => {
    if (openCommentPostId === postId) {
      setOpenCommentPostId(null);
      return;
    }

    setOpenCommentPostId(postId);
    if (!postComments[postId]) {
      const comments = await fetchComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const text = newCommentTexts[postId] || "";
    if (!text.trim()) return;
    setIsSubmittingComment(true);
    try {
      const comment = await submitComment(postId, text);
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }));
      setNewCommentTexts(prev => ({ ...prev, [postId]: "" }));
      
      // Update the post's local comment count
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      ));
    } catch (err) {
      console.error(err);
      alert("Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/community?post=${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'CommunityHub Post',
          text: 'Check out this post on CommunityHub',
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast("Link copied to clipboard!");
        setTimeout(() => setShareToast(null), 3000);
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim() && editImages.length === 0) return;
    setIsUpdating(true);

    try {
      const result = await updatePost(postId, editContent, editImages);
      if (result.success && result.post) {
        setPosts(posts.map(p => p.id === postId ? (result.post as unknown as Post) : p));
        setEditingPostId(null);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update post.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    // Optimistic UI update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likedBy.some(like => like.userId === currentUser.id);
        return {
          ...post,
          likes: hasLiked ? post.likes - 1 : post.likes + 1,
          likedBy: hasLiked 
            ? post.likedBy.filter(like => like.userId !== currentUser.id)
            : [...post.likedBy, { userId: currentUser.id }]
        };
      }
      return post;
    }));

    // Server update
    const result = await toggleLike(postId);
    if (!result.success) {
      // Revert if failed
      const freshPosts = await fetchPosts();
      setPosts(freshPosts as unknown as Post[]);
    }
  };

  const handleOpenNotifications = async () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      const hasUnread = notifications.some(n => !n.isRead);
      if (hasUnread) {
        await markNotificationsAsRead();
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-zinc-500 text-sm font-medium animate-pulse">Loading community...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-zinc-100 border border-zinc-200 rounded-full py-1.5 pl-9 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-zinc-500 transition-all font-medium"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>

            <div className="relative" ref={notificationsContainerRef}>
              <button 
                onClick={handleOpenNotifications} 
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors shadow-sm text-zinc-600 hover:text-indigo-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="font-bold text-zinc-900">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-sm">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((notif) => (
                          <div key={notif.id} className={`p-4 border-b border-zinc-50 flex gap-3 hover:bg-zinc-50 transition-colors ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}>
                            <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                              <img src={notif.actor?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor?.name || 'User'}`} alt="Actor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="text-sm text-zinc-800">
                                <span className="font-semibold text-zinc-900">{notif.actor?.name || 'Someone'}</span> {notif.type === 'LIKE' ? 'liked your post' : notif.type === 'COMMENT' ? 'commented on your post' : 'interacted with your post'}.
                              </p>
                              <span className="text-xs text-zinc-500 mt-1 block">
                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileContainerRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center justify-center w-9 h-9 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors overflow-hidden ring-2 ring-white hover:ring-zinc-100 shadow-sm">
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in zoom-in duration-200">
                  <div className="flex flex-col items-center border-b border-zinc-100 pb-4 mb-4">
                    <div className="relative group mb-3">
                      <div className="w-20 h-20 rounded-full border border-zinc-200 overflow-hidden shadow-sm">
                        <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <button 
                        onClick={() => !isUpdatingProfileImage && profileImageInputRef.current?.click()}
                        disabled={isUpdatingProfileImage}
                        className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full shadow-md hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        title="Edit profile image"
                      >
                        {isUpdatingProfileImage ? (
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        )}
                      </button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={profileImageInputRef}
                        onChange={handleProfileImageChange}
                      />
                    </div>
                    {isEditingName ? (
                      <div className="flex flex-col gap-2 w-full mt-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateName();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                        />
                        <div className="flex gap-3 justify-center mb-1">
                          <button 
                            onClick={handleUpdateName}
                            disabled={isUpdatingName}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {isUpdatingName ? "Saving..." : "Save"}
                          </button>
                          <button 
                            onClick={() => setIsEditingName(false)}
                            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 group w-full">
                        <h3 className="font-bold text-zinc-900 text-lg truncate max-w-[180px]">{currentUser.name}</h3>
                        <button 
                          onClick={() => {
                            setEditName(currentUser.name);
                            setIsEditingName(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                          title="Edit name"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                      </div>
                    )}
                    <p className="text-zinc-500 text-sm truncate w-full text-center">{currentUser.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => setShowSignOutConfirm(true)}
                    className="w-full py-2.5 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
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
                  <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

            {selectedImages.length > 0 && (
              <div className="mt-3 ml-14 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-zinc-900/60 backdrop-blur-md text-white rounded-full p-1 hover:bg-zinc-900 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100">
              <div className="flex gap-2 ml-14">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedImages.length >= 6}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
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
                disabled={(!newPostContent.trim() && selectedImages.length === 0) || !currentUser.id || isCreatingPost}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-medium py-2 px-6 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:shadow-none shadow-indigo-600/20 text-sm flex items-center justify-center gap-2"
              >
                {isCreatingPost ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Posting...</>
                ) : (
                  "Post"
                )}
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

          {filteredPosts.map((post) => (
            <article key={post.id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <img src={post.author.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`} alt={post.author.name} className="w-11 h-11 rounded-full border border-zinc-200 flex-shrink-0 shadow-sm" referrerPolicy="no-referrer" />
                  <div>
                    <h3 className="font-semibold text-zinc-900">{post.author.name}</h3>
                    <p className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                      {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' }).format(new Date(post.updatedAt))}
                      {post.updatedAt !== post.createdAt && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 italic font-normal">edited</span>
                      )}
                    </p>
                  </div>
                </div>
                  <div className="relative options-menu-container">
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
                        <>
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditContent(post.content);
                              setEditImages(post.images.map(img => img.url));
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors font-medium text-left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                            Edit Post
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:bg-rose-50 disabled:opacity-70 transition-colors font-medium text-left border-t border-zinc-100"
                          >
                            {deletingPostId === post.id ? (
                              <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Deleting...</>
                            ) : (
                              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> Delete Post</>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500 italic">No options available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-zinc-700 text-sm md:text-base leading-relaxed break-words">
                {editingPostId === post.id ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      rows={3}
                      autoFocus
                    />
                    
                    {editImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {editImages.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200">
                            <img src={img} alt="Edit preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-zinc-900/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-1">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`edit-image-${post.id}`}
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => setEditImages(prev => [...prev, reader.result as string]);
                                reader.readAsDataURL(file);
                              });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => (document.getElementById(`edit-image-${post.id}`) as HTMLInputElement)?.click()}
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                          title="Add Images"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                          Add Images
                        </button>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdatePost(post.id)}
                          disabled={isUpdating || (!editContent.trim() && editImages.length === 0)}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all shadow-sm shadow-indigo-600/10 disabled:opacity-50"
                        >
                          {isUpdating ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {post.content}
                    {post.images && post.images.length > 0 ? (
                      <div className={`mt-3 mb-1 grid gap-2 ${
                        post.images.length === 1 ? 'grid-cols-1' : 
                        post.images.length === 2 ? 'grid-cols-2' : 
                        'grid-cols-2 sm:grid-cols-3'
                      }`}>
                        {post.images.map((img) => (
                          <div key={img.id} className={`relative rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 shadow-sm ${
                            post.images.length === 1 ? '' : 'aspect-square'
                          }`}>
                            <img 
                              src={img.url} 
                              alt="Post Attachment" 
                              className={`w-full cursor-pointer hover:scale-[1.02] transition-transform duration-500 ${
                                post.images.length === 1 ? 'h-auto max-h-[700px] object-contain' : 'h-full object-cover'
                              }`} 
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    ) : post.image ? (
                      <div className="mt-3 mb-1 relative rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 shadow-sm">
                        <img 
                          src={post.image} 
                          alt="Post Attachment" 
                          className="w-full h-auto max-h-[700px] object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-500" 
                          onClick={() => window.open(post.image!, '_blank')}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                <div className="flex gap-1.5 md:gap-4">
                  <button 
                    onClick={() => handleToggleLike(post.id)}
                    className={`group flex items-center gap-2 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-rose-50 ${
                      post.likedBy?.some(like => like.userId === currentUser.id) 
                        ? 'text-rose-600' 
                        : 'text-zinc-500 hover:text-rose-500'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={post.likedBy?.some(like => like.userId === currentUser.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={post.likedBy?.some(like => like.userId === currentUser.id) ? "" : "group-hover:fill-rose-500/20"}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                    <span>{post.likes}</span>
                    <span className="hidden sm:inline">Likes</span>
                  </button>
                  <button 
                    onClick={() => handleOpenComments(post.id)}
                    className={`group flex items-center gap-2 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-indigo-50 ${openCommentPostId === post.id ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-500 hover:text-indigo-600'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:fill-indigo-600/20"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    <span>{post.comments}</span>
                    <span className="hidden sm:inline">Comments</span>
                  </button>
                  <button 
                    onClick={() => handleShare(post.id)}
                    className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-500 text-sm font-medium transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-emerald-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>

              {openCommentPostId === post.id && (
                <div className="mt-4 pt-4 border-t border-zinc-100 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col gap-4">
                    {/* Comment Input */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 shrink-0">
                        <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea
                          value={newCommentTexts[post.id] || ""}
                          onChange={(e) => setNewCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                          rows={1}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmitComment(post.id)}
                            disabled={!(newCommentTexts[post.id]?.trim()) || isSubmittingComment}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                          >
                            {isSubmittingComment ? "Posting..." : "Post Comment"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Comment List */}
                    <div className="flex flex-col gap-4 mt-2">
                      {!postComments[post.id] ? (
                        <div className="flex justify-center py-4">
                          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                      ) : postComments[post.id].length === 0 ? (
                        <p className="text-center text-zinc-500 text-sm py-4 italic">No comments yet. Be the first to comment!</p>
                      ) : (
                        postComments[post.id].map((comment: any) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 shrink-0">
                              <img 
                                src={comment.author.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.name}`} 
                                alt={comment.author.name} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 bg-zinc-50 rounded-2xl p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-zinc-900">{comment.author.name}</span>
                                <span className="text-[10px] text-zinc-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-zinc-700 leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}

          {isPageLoading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white border border-zinc-200 rounded-2xl">
              <div className="mx-auto w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-1">No posts yet</h3>
              <p className="text-zinc-500 text-sm">Be the first to share something with the community!</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 bg-white border border-zinc-200 rounded-2xl">
              <div className="mx-auto w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-1">No matches found</h3>
              <p className="text-zinc-500 text-sm">Try searching for something else or check your spelling.</p>
            </div>
          ) : null}

        </section>
      </main>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-rose-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">Sign Out</h3>
            <p className="text-zinc-500 text-center mb-6 text-sm">Are you sure you want to sign out? You will need to log in again to access the community.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsSigningOut(true);
                  await signOut({ callbackUrl: '/' });
                }}
                disabled={isSigningOut}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                {isSigningOut ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Signing out...</>
                ) : (
                  "Yes, sign out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900">Crop Profile Image</h3>
              <button onClick={() => setCropImageSrc(null)} className="text-zinc-400 hover:text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            
            <div className="relative w-full bg-zinc-900" style={{ height: "400px" }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels as any)}
              />
            </div>
            
            <div className="p-4 flex items-center gap-4 bg-zinc-50 border-t border-zinc-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="p-4 flex gap-3 justify-end border-t border-zinc-100">
              <button 
                onClick={() => setCropImageSrc(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                disabled={isCropping}
              >
                Cancel
              </button>
              <button 
                onClick={handleCropComplete}
                disabled={isCropping}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
              >
                {isCropping ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</>
                ) : "Save Avatar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="font-medium text-sm">{shareToast}</span>
        </div>
      )}
    </div>
  );
}
