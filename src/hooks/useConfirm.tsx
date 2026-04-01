import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function useConfirm() {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    action: () => void;
  }>({
    isOpen: false,
    title: "",
    desc: "",
    action: () => {},
  });

  const confirmAction = (title: string, desc: string, action: () => void) => {
    setConfirmDialog({ isOpen: true, title, desc, action });
  };

  const ConfirmDialogComponent = () => (
    <AlertDialog
      open={confirmDialog.isOpen}
      onOpenChange={(open) =>
        !open && setConfirmDialog((d) => ({ ...d, isOpen: false }))
      }
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDialog.desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            confirmDialog.action();
            setConfirmDialog(d => ({ ...d, isOpen: false }));
          }}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmAction, ConfirmDialogComponent };
}
