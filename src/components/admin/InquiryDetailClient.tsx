"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Send, StickyNote, RefreshCw, Loader2, Clock } from "lucide-react";
import { cn, formatDate, getInquiryStatusConfig } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/types";

interface Author { id: string; name: string; photo: string | null }
interface Note   { id: string; content: string; createdAt: Date; author: Author }
interface Reply  { id: string; subject: string; body: string; sentAt: Date; sentBy: Author }

interface InquiryDetailClientProps {
  inquiry: {
    id: string;
    status: string;
    notes: Note[];
    replies: Reply[];
  };
  currentUserId: string;
  userRole: Role;
}

const STATUSES = [
  "NEW", "IN_PROGRESS", "AWAITING_CLIENT", "CLOSED_WON", "CLOSED_LOST", "SPAM",
] as const;

function Avatar({ user }: { user: Author }) {
  return user.photo ? (
    <Image src={user.photo} alt={user.name} width={28} height={28} className="rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-gold-500/20 flex items-center justify-center text-xs font-semibold text-gold-600 shrink-0">
      {user.name[0].toUpperCase()}
    </div>
  );
}

export function InquiryDetailClient({ inquiry, currentUserId, userRole }: InquiryDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(inquiry.status);
  const [notes, setNotes] = useState<Note[]>(inquiry.notes);
  const [replies, setReplies] = useState<Reply[]>(inquiry.replies);
  const [newNote, setNewNote] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [activeTab, setActiveTab] = useState<"notes" | "reply">("notes");
  const [saving, setSaving] = useState(false);

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setStatus(newStatus);
      toast({ title: "Status updated", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });
      if (!res.ok) throw new Error();
      // Optimistic UI
      setNotes((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: newNote,
          createdAt: new Date(),
          author: { id: currentUserId, name: "You", photo: null },
        },
      ]);
      setNewNote("");
      toast({ title: "Note added", variant: "success" });
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!replySubject.trim() || !replyBody.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, body: replyBody }),
      });
      if (!res.ok) throw new Error();
      setReplies((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          subject: replySubject,
          body: replyBody,
          sentAt: new Date(),
          sentBy: { id: currentUserId, name: "You", photo: null },
        },
      ]);
      setReplySubject("");
      setReplyBody("");
      toast({ title: "Reply sent successfully", variant: "success" });
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = getInquiryStatusConfig(status);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      {/* Main column */}
      <div className="space-y-5">
        {/* Existing replies thread */}
        {replies.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-sm text-foreground">Email Thread ({replies.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {replies.map((reply) => (
                <div key={reply.id} className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar user={reply.sentBy} />
                    <div>
                      <span className="text-sm font-medium text-foreground">{reply.sentBy.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(reply.sentAt, "relative")}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 font-medium">
                    Re: {reply.subject}
                  </div>
                  <div
                    className="text-sm text-foreground/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: reply.body }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / Reply tabs */}
        <div className="bg-card rounded-xl border border-border shadow-luxury overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["notes", "reply"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-foreground border-b-2 border-gold-500 bg-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "notes" ? (
                  <span className="flex items-center justify-center gap-2">
                    <StickyNote size={14} /> Notes {notes.length > 0 && `(${notes.length})`}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send size={14} /> Reply by Email
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div>
              {notes.length > 0 && (
                <div className="divide-y divide-border border-b border-border">
                  {notes.map((note) => (
                    <div key={note.id} className="flex gap-3 px-5 py-4">
                      <Avatar user={note.author} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{note.author.name}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={11} />
                            {formatDate(note.createdAt, "relative")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-5">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a private internal note (not visible to client)..."
                  rows={3}
                  className="input-luxury text-sm resize-none w-full mb-3"
                />
                <button
                  onClick={addNote}
                  disabled={saving || !newNote.trim()}
                  className="btn-navy flex items-center gap-2 text-sm"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <StickyNote size={14} />}
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Reply Tab */}
          {activeTab === "reply" && (
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Re: Your property inquiry"
                  className="input-luxury text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Message</label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={5}
                  placeholder="Write your reply to the client..."
                  className="input-luxury text-sm resize-none"
                />
              </div>
              <button
                onClick={sendReply}
                disabled={saving || !replySubject.trim() || !replyBody.trim()}
                className="btn-gold flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Reply
              </button>
              <p className="text-xs text-muted-foreground">
                Email will be sent from your configured address and stored in this thread.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Status */}
        <div className="bg-card rounded-xl border border-border shadow-luxury p-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Update Status</h3>
          <div className="space-y-1.5">
            {STATUSES.map((s) => {
              const cfg = getInquiryStatusConfig(s);
              return (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    status === s
                      ? cfg.className + " shadow-inner"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {status === s && <span className="mr-1.5">●</span>}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card rounded-xl border border-border shadow-luxury p-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.refresh()}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
