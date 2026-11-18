"use client";

import { useEffect, useRef } from "react";
import styles from "./consultation-workspace.module.css";

interface ConsultationResetDialogProps {
  readonly open: boolean;
  readonly activeWork: boolean;
  readonly onDismiss: () => void;
  readonly onConfirm: () => void;
}

export function ConsultationResetDialog({ open, activeWork, onDismiss, onConfirm }: ConsultationResetDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepWorking = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) {
      confirmed.current = false;
      dialog.current.showModal();
      keepWorking.current?.focus();
    } else if (!open) {
      dialog.current?.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.resetDialog}
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-description"
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClose={() => { if (open && !confirmed.current) onDismiss(); }}
    >
      <h2 id="reset-dialog-title">Start over?</h2>
      <p id="reset-dialog-description">
        This clears your room photo, answers, and design from this browser.
        {activeWork ? " Work already sent to the provider may continue." : ""}
      </p>
      <div className={styles.resetDialogActions}>
        <button ref={keepWorking} type="button" className={styles.secondaryButton} onClick={onDismiss}>Keep working</button>
        <button type="button" className={styles.primaryButton} onClick={() => {
          if (confirmed.current) return;
          confirmed.current = true;
          onConfirm();
        }}>Clear and start over</button>
      </div>
    </dialog>
  );
}
