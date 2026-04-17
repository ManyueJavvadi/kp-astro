"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { theme } from "@/lib/theme";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      backgroundColor: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)",
    }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        zIndex: 50,
        width: "100%",
        maxWidth: 560,
        transform: "translate(-50%, -50%)",
        backgroundColor: theme.bg.elevated,
        border: theme.border.strong,
        borderRadius: 10,
        boxShadow: theme.shadow.lg,
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh",
        overflow: "hidden",
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          width: 28,
          height: 28,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          color: theme.text.muted,
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = theme.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = theme.text.muted;
        }}
      >
        <X size={14} />
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * DialogHeader — the title row at the top of a dialog.
 * Has its own padding + bottom separator.
 */
const DialogHeader = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div
    style={{
      padding: "20px 24px 16px",
      borderBottom: theme.border.default,
      paddingRight: 56, // leave space for X button
    }}
  >
    {children}
  </div>
);
DialogHeader.displayName = "DialogHeader";

/**
 * DialogBody — scrollable middle content area.
 * Use this to wrap form fields inside a dialog.
 */
const DialogBody = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "20px 24px",
      overflowY: "auto",
      flex: 1,
    }}
  >
    {children}
  </div>
);

/**
 * DialogFooter — action row at bottom. Has top separator + padding.
 * Buttons align right by default.
 */
const DialogFooter = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div
    style={{
      padding: "14px 24px",
      borderTop: theme.border.default,
      backgroundColor: theme.bg.page,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
    }}
  >
    {children}
  </div>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    style={{
      fontSize: 16,
      fontWeight: 600,
      color: theme.text.primary,
      margin: 0,
      lineHeight: 1.3,
    }}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    style={{
      fontSize: 12,
      color: theme.text.muted,
      margin: "4px 0 0",
      lineHeight: 1.5,
    }}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
