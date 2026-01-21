// src/features/recruiting/components/onboarding/ContactsSection.tsx
// Brutalist contacts section with SMS support

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MessageSquare, Loader2, Send } from "lucide-react";
// eslint-disable-next-line no-restricted-imports -- Service needed for SMS functionality
import { smsService } from "@/services/sms";
import { toast } from "sonner";
import type { UserProfile } from "@/types/hierarchy.types";

// Your phone number for SMS contact
const RECRUITER_SMS_NUMBER = "859-433-5907";

interface KeyContact {
  id: string;
  role: string;
  label: string;
  profile: UserProfile | null;
}

interface ContactsSectionProps {
  upline?: UserProfile | null;
  keyContacts?: KeyContact[];
  recruitName?: string;
}

export function ContactsSection({
  upline,
  keyContacts,
  recruitName,
}: ContactsSectionProps) {
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [showSmsForm, setShowSmsForm] = useState(false);

  const handleSendSms = async () => {
    if (!smsMessage.trim()) return;

    setSendingSms(true);
    try {
      const result = await smsService.sendSms({
        to: RECRUITER_SMS_NUMBER,
        message: `[From ${recruitName || "Recruit"}] ${smsMessage}`,
        trigger: "recruit_contact_form",
      });

      if (result.success) {
        toast.success("Message sent to your recruiter!");
        setSmsMessage("");
        setShowSmsForm(false);
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
      console.error("SMS error:", error);
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.4 }}
      />

      <div className="relative z-10 p-5">
        {/* Header */}
        <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-4">
          [04] Your Team
        </span>

        {/* Quick SMS action */}
        <button
          onClick={() => setShowSmsForm(!showSmsForm)}
          className="w-full mb-4 py-3 px-4 border-2 flex items-center justify-center gap-2 transition-all duration-150 font-mono text-xs uppercase tracking-wider"
          style={{
            borderColor: "var(--recruiting-primary)",
            background: showSmsForm
              ? "var(--recruiting-primary)"
              : "transparent",
            color: showSmsForm ? "#0a0a0a" : "var(--recruiting-primary)",
          }}
        >
          <MessageSquare className="h-4 w-4" />
          Text Your Recruiter
        </button>

        {/* SMS Form */}
        {showSmsForm && (
          <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded">
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-transparent border border-white/20 rounded p-3 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-[var(--recruiting-primary)]"
              rows={3}
              disabled={sendingSms}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-white/30 text-xs font-mono">
                To: {RECRUITER_SMS_NUMBER}
              </span>
              <button
                onClick={handleSendSms}
                disabled={sendingSms || !smsMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "var(--recruiting-primary)",
                  color: "#0a0a0a",
                }}
              >
                {sendingSms ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Send
              </button>
            </div>
          </div>
        )}

        {/* Contacts list */}
        <div className="space-y-3">
          {/* Upline/Recruiter */}
          {upline && (
            <ContactCard
              name={`${upline.first_name || ""} ${upline.last_name || ""}`.trim()}
              role="Recruiter"
              email={upline.email}
              phone={upline.phone}
              photoUrl={upline.profile_photo_url}
              isPrimary
            />
          )}

          {/* Other contacts */}
          {keyContacts?.map((contact) => {
            if (!contact.profile) return null;
            return (
              <ContactCard
                key={contact.id}
                name={`${contact.profile.first_name || ""} ${contact.profile.last_name || ""}`.trim()}
                role={contact.label}
                email={contact.profile.email}
                phone={contact.profile.phone}
                photoUrl={contact.profile.profile_photo_url}
              />
            );
          })}

          {!upline && (!keyContacts || keyContacts.length === 0) && (
            <div className="py-6 text-center">
              <p className="text-white/30 text-sm font-mono">
                No contacts available
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface ContactCardProps {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  isPrimary?: boolean;
}

function ContactCard({
  name,
  role,
  email,
  phone,
  photoUrl,
  isPrimary,
}: ContactCardProps) {
  return (
    <div
      className={`p-4 border-l-2 transition-all duration-200 hover:pl-5 ${
        isPrimary ? "bg-white/5" : "bg-transparent"
      }`}
      style={{
        borderColor: isPrimary
          ? "var(--recruiting-primary)"
          : "rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-1 ring-white/20">
          <AvatarImage src={photoUrl || undefined} />
          <AvatarFallback
            className="text-xs font-mono bg-white/10"
            style={{ color: "var(--recruiting-primary)" }}
          >
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm truncate">{name}</p>
            <span
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                background: isPrimary
                  ? "var(--recruiting-primary)"
                  : "rgba(255,255,255,0.1)",
                color: isPrimary ? "#0a0a0a" : "white",
              }}
            >
              {role}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1">
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                <Mail className="h-3 w-3" />
                <span className="font-mono">Email</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span className="font-mono">Call</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
