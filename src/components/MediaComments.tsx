
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { User, Heart, Send, MessageSquare, Edit, Trash2, Reply, X, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { socialService, type Comment } from "@/services/social";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/Image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MediaCommentsProps {
  mediaId: number;
  mediaType: "movie" | "tv";
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

function CommentCard({ 
  comment, 
  depth = 0, 
  likedCommentIds,
  likeMutation,
  deleteMutation,
  onReplyClick,
  replyingToId,
  containsSpoiler,
  onToggleSpoiler,
  revealedSpoiler
}: {
  comment: CommentWithReplies;
  depth?: number;
  likedCommentIds: string[];
  likeMutation: any;
  deleteMutation: any;
  onReplyClick: (id: string) => void;
  replyingToId: string | null;
  containsSpoiler: boolean;
  onToggleSpoiler: (id: string) => void;
  revealedSpoiler: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLiked = likedCommentIds.includes(comment.id);
  const isOwnComment = user?.id === comment.user_id;
  const displayName = comment.profile?.display_name || "CineTrekker User";

  return (
    <div className={cn(
      "flex gap-4 p-3 rounded-2xl bg-card/30 border border-border/20",
      depth > 0 && "ml-10 mt-2"
    )}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
        {comment.profile?.avatar_url ? (
          <Image
            src={comment.profile.avatar_url}
            alt={`${displayName} avatar`}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <User className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {comment.profile ? (
            <Link
              to={`/user/${comment.profile.user_id}`}
              className="font-medium hover:text-primary transition-colors"
            >
              {displayName}
            </Link>
          ) : (
            <span className="font-medium">{displayName}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {containsSpoiler && !revealedSpoiler && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">
              {t("comments.spoiler", "Spoiler")}
            </span>
          )}
          {isOwnComment && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(comment.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <p 
          className={cn(
            "text-muted-foreground text-sm mb-2",
            containsSpoiler && !revealedSpoiler && "blur-sm hover:blur-none transition-all cursor-pointer"
          )}
          onClick={() => containsSpoiler && !revealedSpoiler && onToggleSpoiler(comment.id)}
        >
          {containsSpoiler && !revealedSpoiler 
            ? t("comments.spoilerWarning", "Reveal spoiler")
            : comment.content
          }
        </p>
        <div className="flex items-center gap-4">
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                likeMutation.mutate({
                  commentId: comment.id,
                  isLiked,
                })
              }
              className={cn(
                "h-7 px-2 text-xs flex items-center gap-1 transition-colors",
                isLiked
                  ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart
                className={cn("h-3.5 w-3.5", isLiked && "fill-current")}
              />
              {comment.likes_count}
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReplyClick(comment.id)}
              className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MediaComments({ mediaId, mediaType }: MediaCommentsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [containsSpoiler, setContainsSpoiler] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const { data: comments, isLoading, error } = useQuery({
    queryKey: ["comments", mediaType, mediaId],
    queryFn: async () => {
      const commentsData = await socialService.getComments(mediaId, mediaType);
      console.log("Fetched comments:", commentsData);
      return commentsData;
    },
    enabled: !!mediaId && !!mediaType,
  });

  if (error) {
    console.error("Error fetching comments:", error);
  }

  const { data: likedCommentIds = [] } = useQuery({
    queryKey: ["likedComments", user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return socialService.getLikedComments(user.id);
    },
    enabled: !!user?.id,
  });

  // Organize comments into a nested structure
  const organizeComments = (flatComments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: create all comment nodes
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build the hierarchy
    flatComments.forEach(comment => {
      const commentNode = commentMap.get(comment.id);
      if (!commentNode) return;
      
      if (comment.parent_id) {
        const parentNode = commentMap.get(comment.parent_id);
        if (parentNode && parentNode.replies) {
          parentNode.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  };

  const nestedComments = comments ? organizeComments(comments) : [];

  // Sort comments based on selected option
  const sortedComments = useMemo(() => {
    const sorted = [...nestedComments];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "top":
        sorted.sort((a, b) => b.likes_count - a.likes_count);
        break;
    }
    return sorted;
  }, [nestedComments, sortBy]);

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id) throw new Error("Not logged in");
      setIsSubmitting(true);
      return await socialService.addComment(user.id, mediaId, mediaType, text, undefined, containsSpoiler);
    },
    onSuccess: () => {
      setNewComment("");
      setContainsSpoiler(false);
      queryClient.invalidateQueries({
        queryKey: ["comments", mediaType, mediaId],
      });
    },
    onSettled: () => setIsSubmitting(false),
  });

  const addReplyMutation = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId: string }) => {
      if (!user?.id) throw new Error("Not logged in");
      setIsSubmittingReply(true);
      return await socialService.addComment(user.id, mediaId, mediaType, text, parentId, false);
    },
    onSuccess: () => {
      setReplyContent("");
      setReplyingToId(null);
      queryClient.invalidateQueries({
        queryKey: ["comments", mediaType, mediaId],
      });
    },
    onSettled: () => setIsSubmittingReply(false),
  });

  const likeMutation = useMutation({
    mutationFn: async ({
      commentId,
      isLiked,
    }: {
      commentId: string;
      isLiked: boolean;
    }) => {
      if (!user?.id) throw new Error("Not logged in");
      if (isLiked) {
        await socialService.unlikeComment(user.id, commentId);
      } else {
        await socialService.likeComment(user.id, commentId);
      }
    },
    onMutate: async ({ commentId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["likedComments", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["comments", mediaType, mediaId] });

      const previousLikedIds = likedCommentIds || [];
      queryClient.setQueryData(["likedComments", user?.id], () =>
        isLiked
          ? [...previousLikedIds, commentId]
          : previousLikedIds.filter((id) => id !== commentId)
      );
    },
    onError: (error: Error) => {
      toast({
        title: t("comments.likeError", "Failed to like comment"),
        description: error.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["likedComments", user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error("Not logged in");
      await socialService.deleteComment(user.id, commentId);
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ["comments", mediaType, mediaId] });
      queryClient.setQueryData(["comments", mediaType, mediaId], (old: Comment[] | undefined) => {
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments.filter((comment) => comment.id !== commentId);
        };
        const recursivelyRemove = (comments: Comment[]): Comment[] => {
          return removeComment(comments).reduce((acc, comment) => {
            if ("replies" in comment && Array.isArray(comment.replies)) {
              return [...acc, ...recursivelyRemove(comment.replies as Comment[])];
            }
            return acc;
          }, [] as Comment[]);
        };
        return recursivelyRemove(old || []);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", mediaType, mediaId] });
      toast({
        title: t("comments.deleted", "Comment deleted"),
        variant: "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("comments.deleteError", "Failed to delete comment"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    addReplyMutation.mutate({ text: replyContent, parentId: replyingToId! });
  };

  const replyingToComment = replyingToId
    ? nestedComments.find((comment) => {
        if (comment.id === replyingToId) return comment;
        return comment.replies?.find((reply) => reply.id === replyingToId);
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {t("comments.title", "Comments")}
        </h2>
        {comments && comments.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <span>
                  {sortBy === "top"
                    ? t("comments.topRated", "Top rated")
                    : sortBy === "newest"
                    ? t("comments.newest", "Newest")
                    : t("comments.oldest", "Oldest")}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("top")}>
                {t("comments.topRated", "Top rated")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                {t("comments.newest", "Newest")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                {t("comments.oldest", "Oldest")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {user && (
        <div className="border-l-2 border-border/40 pl-6">
          <div className="text-sm text-muted-foreground mb-4">
            {replyingToComment
              ? (
                <>
                  <span className="font-medium">{t("comments.replyingTo", "Replying to:")}</span>
                  <span className="ml-2 text-foreground">{replyingToComment.profile?.display_name || "User"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent("");
                    }}
                    className="ml-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <span className="font-medium">{t("comments.leaveComment", "Leave a comment")}</span>
              )}
          </div>
          {replyingToId ? (
            <form onSubmit={handleSubmitReply} className="space-y-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t("comments.replyPlaceholder", "Write a reply...")}
                className="min-h-[80px]"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyContent("");
                  }}
                  disabled={isSubmittingReply}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReply || !replyContent.trim()}
                >
                  {isSubmittingReply ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("comments.posting", "Posting...")}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t("comments.post", "Post")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("comments.placeholder", "Share your thoughts...")}
                  className="min-h-[80px]"
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <Checkbox
                    checked={containsSpoiler}
                    onCheckedChange={(checked) => setContainsSpoiler(checked)}
                  />
                  {t("comments.containsSpoiler", "Contains spoilers")}
                </label>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("comments.posting", "Posting...")}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("comments.post", "Post Comment")}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {!isLoading && sortedComments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t("comments.noComments", "No comments yet. Be the first to share your thoughts!")}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              likedCommentIds={likedCommentIds}
              likeMutation={likeMutation}
              deleteMutation={deleteMutation}
              onReplyClick={(id) => {
                setReplyingToId(id);
                setReplyContent("");
              }}
              replyingToId={replyingToId}
              containsSpoiler={comment.contains_spoiler || false}
              onToggleSpoiler={toggleSpoiler}
              revealedSpoiler={revealedSpoilers.has(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}